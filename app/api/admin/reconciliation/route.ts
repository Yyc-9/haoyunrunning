import { NextRequest, NextResponse } from 'next/server'
import {
  awardCourseEnrollmentAchievement,
  sendCourseEnrollmentApprovedEmail,
} from '@/lib/admin-payment-notifications'
import {
  type BankColumnMapping,
  buildBankFilePreview,
  parseBankTransactions,
  readBankWorkbook,
} from '@/lib/bank-reconciliation'
import { authenticateFinanceRequest, financeNoStoreHeaders } from '@/lib/finance-access'
import { supabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'

type CourseOrder = {
  id: string
  name: string
  email: string
  preferred_course: string
  calculated_amount: number | null
  transfer_last_five: string
  status: string
  created_at: string
}

type ShopOrder = {
  id: string
  order_number: string
  customer_name: string
  total_amount: number | null
  transfer_last_five: string | null
  status: string
  created_at: string
}

type MatchableOrder = {
  kind: 'course' | 'shop'
  id: string
  orderNumber: string
  customerName: string
  label: string
  expectedAmount: number
  lastFive: string
  status: string
}

type ReconciliationActionBody = {
  action?: 'select_candidate' | 'confirm' | 'confirm_batch' | 'ignore'
  transactionId?: string
  candidateId?: string
  batchId?: string
  reason?: string
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...financeNoStoreHeaders(),
      ...(init?.headers ?? {}),
    },
  })
}

function chunks<T>(items: T[], size = 200) {
  const output: T[][] = []
  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size))
  return output
}

function cleanUuid(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : ''
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : ''
}

async function loadReconciliationData(requestedBatchId = '') {
  const { data: batches, error: batchError } = await supabaseAdmin!
    .from('finance_reconciliation_batches')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(20)
  if (batchError) throw batchError

  const batchId = requestedBatchId || batches?.[0]?.id || ''
  if (!batchId) return { batches: batches ?? [], selectedBatchId: '', transactions: [], candidates: [], audit: [] }

  const [{ data: transactions, error: transactionError }, { data: audit, error: auditError }] = await Promise.all([
    supabaseAdmin!
      .from('finance_bank_transactions')
      .select('*')
      .eq('batch_id', batchId)
      .order('row_number', { ascending: true }),
    supabaseAdmin!
      .from('finance_reconciliation_audit_log')
      .select('id, batch_id, transaction_id, actor_profile_id, action, details, created_at')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (transactionError) throw transactionError
  if (auditError) throw auditError
  const transactionIds = (transactions ?? []).map((row) => row.id)
  const candidates: unknown[] = []
  for (const transactionIdChunk of chunks(transactionIds)) {
    const { data, error } = await supabaseAdmin!
      .from('finance_reconciliation_candidates')
      .select('*')
      .in('transaction_id', transactionIdChunk)
      .order('match_quality', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    candidates.push(...(data ?? []))
  }

  return {
    batches: batches ?? [],
    selectedBatchId: batchId,
    transactions: transactions ?? [],
    candidates,
    audit: audit ?? [],
  }
}

async function refreshBatchStatus(batchId: string) {
  const { data, error } = await supabaseAdmin!
    .from('finance_bank_transactions')
    .select('match_status, direction')
    .eq('batch_id', batchId)
  if (error) throw error

  const credits = (data ?? []).filter((row) => row.direction === 'credit')
  const outstandingCount = credits.filter((row) => !['confirmed', 'ignored', 'duplicate'].includes(row.match_status)).length
  const confirmedCount = credits.filter((row) => row.match_status === 'confirmed').length
  const status = outstandingCount === 0
    ? 'confirmed'
    : confirmedCount > 0
      ? 'partially_confirmed'
      : 'processed'

  const { error: updateError } = await supabaseAdmin!
    .from('finance_reconciliation_batches')
    .update({ status })
    .eq('id', batchId)
  if (updateError) throw updateError
}

async function notifyApprovedCourse(result: Record<string, unknown>, adminId: string) {
  if (result.changed !== true || result.orderKind !== 'course') return ''
  const order = result.order && typeof result.order === 'object'
    ? result.order as Record<string, unknown>
    : null
  const email = typeof order?.email === 'string' ? order.email : ''
  const name = typeof order?.name === 'string' ? order.name : ''
  const courseName = typeof order?.preferred_course === 'string' ? order.preferred_course : ''
  if (!email) return ''

  await awardCourseEnrollmentAchievement({ email, courseName, awardedBy: adminId })
  return sendCourseEnrollmentApprovedEmail({ to: email, studentName: name, courseName })
}

export async function GET(request: NextRequest) {
  const auth = await authenticateFinanceRequest(request)
  if ('response' in auth) return auth.response

  try {
    const batchId = cleanUuid(new URL(request.url).searchParams.get('batchId'))
    return json({
      ...(await loadReconciliationData(batchId)),
      financeTokenExpiresAt: auth.financeTokenExpiresAt,
    })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : '讀取對帳資料失敗。' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateFinanceRequest(request)
  if ('response' in auth) return auth.response

  let createdBatchId = ''
  let importCommitted = false
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return json({ error: '請選擇銀行下載的 XLSX 或 CSV 檔案。' }, { status: 400 })
    }

    const sheetName = typeof formData.get('sheetName') === 'string' ? String(formData.get('sheetName')).trim() : ''
    const headerRow = Number(formData.get('headerRow'))
    const bankAccountId = cleanUuid(formData.get('bankAccountId'))
    const mapping = JSON.parse(String(formData.get('mapping') ?? '{}')) as BankColumnMapping
    const buffer = Buffer.from(await file.arrayBuffer())
    const { workbook, sheetNames } = await readBankWorkbook(buffer, file.name, sheetName)
    const preview = buildBankFilePreview({ workbook, sheetNames, fileName: file.name, fileSize: file.size, buffer })

    const { data: existingBatch, error: existingBatchError } = await supabaseAdmin!
      .from('finance_reconciliation_batches')
      .select('id')
      .eq('file_sha256', preview.fileSha256)
      .maybeSingle()
    if (existingBatchError) throw existingBatchError
    if (existingBatch) {
      return json(
        { error: '這份銀行檔案已匯入過，請直接查看原有批次。', batchId: existingBatch.id },
        { status: 409 }
      )
    }

    let bankAccountLabel = '未指定收款帳戶'
    if (bankAccountId) {
      const { data: account, error: accountError } = await supabaseAdmin!
        .from('shop_payment_accounts')
        .select('id, label, bank_name')
        .eq('id', bankAccountId)
        .maybeSingle()
      if (accountError) throw accountError
      if (!account) return json({ error: '選擇的收款帳戶不存在。' }, { status: 400 })
      bankAccountLabel = [account.bank_name, account.label].filter(Boolean).join(' · ')
    }

    const { transactions, skippedRows } = parseBankTransactions({
      workbook,
      headerRow,
      mapping,
    })

    const { data: batch, error: batchError } = await supabaseAdmin!
      .from('finance_reconciliation_batches')
      .insert({
        file_name: file.name.slice(0, 255),
        file_sha256: preview.fileSha256,
        file_size_bytes: file.size,
        sheet_name: workbook.sheetName.slice(0, 120),
        bank_account_id: bankAccountId || null,
        bank_account_label: bankAccountLabel.slice(0, 180),
        header_row: headerRow,
        original_row_count: transactions.length + skippedRows.length,
        uploaded_by: auth.adminProfile.id,
      })
      .select('id')
      .single()
    if (batchError || !batch) throw batchError ?? new Error('建立對帳批次失敗。')
    createdBatchId = batch.id

    const existingFingerprints = new Set<string>()
    for (const fingerprintChunk of chunks(transactions.map((transaction) => transaction.fingerprint))) {
      const { data, error } = await supabaseAdmin!
        .from('finance_bank_transactions')
        .select('transaction_fingerprint')
        .in('transaction_fingerprint', fingerprintChunk)
      if (error) throw error
      for (const row of data ?? []) existingFingerprints.add(row.transaction_fingerprint)
    }

    const uniqueTransactions = []
    const seenFingerprints = new Set<string>()
    const duplicateRows: number[] = []
    for (const transaction of transactions) {
      if (existingFingerprints.has(transaction.fingerprint) || seenFingerprints.has(transaction.fingerprint)) {
        duplicateRows.push(transaction.rowNumber)
        continue
      }
      seenFingerprints.add(transaction.fingerprint)
      uniqueTransactions.push(transaction)
    }

    const [{ data: courseRows, error: courseError }, { data: shopRows, error: shopError }] = await Promise.all([
      supabaseAdmin!
        .from('signup_leads')
        .select('id, name, email, preferred_course, calculated_amount, transfer_last_five, status, created_at')
        .eq('source', 'course_payment')
        .in('status', ['pending_review', 'approved'])
        .neq('transfer_last_five', '')
        .limit(5000),
      supabaseAdmin!
        .from('shop_orders')
        .select('id, order_number, customer_name, total_amount, transfer_last_five, status, created_at')
        .in('status', ['pending_review', 'approved'])
        .not('transfer_last_five', 'is', null)
        .limit(5000),
    ])
    if (courseError) throw courseError
    if (shopError) throw shopError

    const orders: MatchableOrder[] = [
      ...((courseRows ?? []) as CourseOrder[]).map((order) => ({
        kind: 'course' as const,
        id: order.id,
        orderNumber: `課程-${order.id.slice(0, 8).toUpperCase()}`,
        customerName: order.name,
        label: order.preferred_course,
        expectedAmount: Math.max(0, Math.round(Number(order.calculated_amount ?? 0))),
        lastFive: order.transfer_last_five.replace(/\D/g, '').slice(-5),
        status: order.status,
      })),
      ...((shopRows ?? []) as ShopOrder[]).map((order) => ({
        kind: 'shop' as const,
        id: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        label: '商城訂單',
        expectedAmount: Math.max(0, Math.round(Number(order.total_amount ?? 0) / 100)),
        lastFive: (order.transfer_last_five ?? '').replace(/\D/g, '').slice(-5),
        status: order.status,
      })),
    ].filter((order) => /^\d{5}$/.test(order.lastFive))

    const ordersByLastFive = new Map<string, MatchableOrder[]>()
    for (const order of orders) {
      ordersByLastFive.set(order.lastFive, [...(ordersByLastFive.get(order.lastFive) ?? []), order])
    }

    const transactionRows = uniqueTransactions.map((transaction) => {
      const candidates = transaction.direction === 'credit'
        ? ordersByLastFive.get(transaction.sourceLastFive) ?? []
        : []
      const exactCandidates = candidates.filter((candidate) => candidate.expectedAmount === transaction.amount)
      let matchStatus = 'unmatched'
      let matchReason = '沒有找到後五碼相同且已回報、待人工核對的記錄。'
      if (transaction.direction === 'debit') {
        matchStatus = 'ignored'
        matchReason = '這是支出交易，不列入收款對帳。'
      } else if (candidates.length > 1) {
        matchStatus = 'ambiguous'
        matchReason = '多人使用相同後五碼，需由財務確認正確訂單。'
      } else if (exactCandidates.length === 1) {
        matchStatus = exactCandidates[0].status === 'approved' ? 'already_confirmed' : 'matched'
        matchReason = exactCandidates[0].status === 'approved'
          ? '後五碼與金額唯一相符；記錄先前已確認入帳，可補登銀行依據。'
          : '後五碼與金額唯一相符，可以確認入帳。'
      } else if (candidates.length > 0) {
        matchStatus = 'amount_mismatch'
        matchReason = '找到後五碼相同的訂單，但金額不同，需人工核對。'
      }

      return {
        transaction,
        candidates,
        exactCandidates,
        row: {
          batch_id: createdBatchId,
          row_number: transaction.rowNumber,
          transaction_date: transaction.transactionDate,
          transaction_time: transaction.transactionTime,
          amount: transaction.amount,
          direction: transaction.direction,
          source_last_five: transaction.sourceLastFive,
          source_name: transaction.sourceName,
          bank_reference: transaction.bankReference,
          note: transaction.note,
          transaction_fingerprint: transaction.fingerprint,
          match_status: matchStatus,
          match_reason: matchReason,
          candidate_count: candidates.length,
        },
      }
    })

    const insertedTransactions: Array<{ id: string; transaction_fingerprint: string }> = []
    for (const rowChunk of chunks(transactionRows.map((item) => item.row))) {
      const { data, error } = await supabaseAdmin!
        .from('finance_bank_transactions')
        .insert(rowChunk)
        .select('id, transaction_fingerprint')
      if (error) throw error
      insertedTransactions.push(...(data ?? []))
    }
    const transactionIdByFingerprint = new Map(
      insertedTransactions.map((transaction) => [transaction.transaction_fingerprint, transaction.id])
    )

    const candidateRows = transactionRows.flatMap(({ transaction, candidates, exactCandidates }) => {
      const transactionId = transactionIdByFingerprint.get(transaction.fingerprint)
      if (!transactionId) return []
      const uniqueExact = candidates.length === 1 && exactCandidates.length === 1 ? exactCandidates[0] : null
      return candidates.map((candidate) => ({
        transaction_id: transactionId,
        order_kind: candidate.kind,
        order_id: candidate.id,
        order_number: candidate.orderNumber,
        customer_name: candidate.customerName.slice(0, 160),
        order_label: candidate.label.slice(0, 240),
        expected_amount: candidate.expectedAmount,
        transfer_last_five: candidate.lastFive,
        order_status: candidate.status,
        match_quality: candidate.expectedAmount === transaction.amount ? 'exact' : 'last_five_only',
        selected: uniqueExact?.kind === candidate.kind && uniqueExact.id === candidate.id,
      }))
    })
    for (const candidateChunk of chunks(candidateRows)) {
      const { error } = await supabaseAdmin!
        .from('finance_reconciliation_candidates')
        .insert(candidateChunk)
      if (error) throw error
    }

    const statusCounts = transactionRows.reduce<Record<string, number>>((counts, item) => {
      const status = item.row.match_status
      counts[status] = (counts[status] ?? 0) + 1
      return counts
    }, {})
    const summary = {
      statusCounts,
      skippedRows: skippedRows.slice(0, 100),
      duplicateRows: duplicateRows.slice(0, 100),
      originalFileRetained: false,
    }

    const { error: batchUpdateError } = await supabaseAdmin!
      .from('finance_reconciliation_batches')
      .update({
        imported_count: insertedTransactions.length,
        duplicate_count: duplicateRows.length,
        summary,
      })
      .eq('id', createdBatchId)
    if (batchUpdateError) throw batchUpdateError

    const { error: auditError } = await supabaseAdmin!
      .from('finance_reconciliation_audit_log')
      .insert({
        batch_id: createdBatchId,
        actor_profile_id: auth.adminProfile.id,
        action: 'import',
        details: {
          fileSha256: preview.fileSha256,
          importedCount: insertedTransactions.length,
          duplicateCount: duplicateRows.length,
          skippedCount: skippedRows.length,
        },
      })
    if (auditError) throw auditError
    importCommitted = true

    const reconciliationIssues = new Map<string, MatchableOrder>()
    for (const item of transactionRows) {
      if (!['ambiguous', 'amount_mismatch'].includes(item.row.match_status)) continue
      for (const candidate of item.candidates) {
        if (candidate.status === 'pending_review') {
          reconciliationIssues.set(`${candidate.kind}:${candidate.id}`, candidate)
        }
      }
    }
    const issueCourseIds = [...reconciliationIssues.values()]
      .filter((candidate) => candidate.kind === 'course')
      .map((candidate) => candidate.id)
    const issueShopIds = [...reconciliationIssues.values()]
      .filter((candidate) => candidate.kind === 'shop')
      .map((candidate) => candidate.id)
    const issueUpdateErrors: string[] = []
    if (issueCourseIds.length > 0) {
      const { error } = await supabaseAdmin!
        .from('signup_leads')
        .update({
          status: 'rejected',
          review_note: '銀行對帳發現金額不符或後五碼重複，請由財務人工處理。',
          reviewed_at: new Date().toISOString(),
        })
        .in('id', issueCourseIds)
        .eq('status', 'pending_review')
      if (error) issueUpdateErrors.push(error.message)
    }
    if (issueShopIds.length > 0) {
      const { error } = await supabaseAdmin!
        .from('shop_orders')
        .update({
          status: 'rejected',
          review_note: '銀行對帳發現金額不符或後五碼重複，請由財務人工處理。',
          reviewed_at: new Date().toISOString(),
        })
        .in('id', issueShopIds)
        .eq('status', 'pending_review')
      if (error) issueUpdateErrors.push(error.message)
    }
    if (reconciliationIssues.size > 0) {
      await supabaseAdmin!
        .from('finance_reconciliation_audit_log')
        .insert({
          batch_id: createdBatchId,
          actor_profile_id: auth.adminProfile.id,
          action: 'flag_exceptions',
          details: {
            flaggedOrderCount: reconciliationIssues.size,
            updateErrors: issueUpdateErrors,
          },
        })
    }

    return json({
      message: `已匯入 ${insertedTransactions.length} 筆交易，系統已完成初步比對${reconciliationIssues.size ? `，並標記 ${reconciliationIssues.size} 筆匯款資料需補充` : ''}。`,
      warning: issueUpdateErrors.length ? '部分異常訂單未能更新狀態，請依對帳批次人工檢查。' : '',
      ...(await loadReconciliationData(createdBatchId)),
    })
  } catch (error) {
    if (createdBatchId && !importCommitted) {
      await supabaseAdmin!.from('finance_reconciliation_batches').delete().eq('id', createdBatchId)
    }
    return json(
      { error: error instanceof Error ? error.message : '匯入銀行檔案失敗。' },
      { status: 400 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateFinanceRequest(request)
  if ('response' in auth) return auth.response

  const body = (await request.json().catch(() => ({}))) as ReconciliationActionBody
  const transactionId = cleanUuid(body.transactionId)
  const batchId = cleanUuid(body.batchId)

  try {
    if (body.action === 'select_candidate') {
      const candidateId = cleanUuid(body.candidateId)
      if (!transactionId || !candidateId) {
        return json({ error: '缺少交易或訂單資料。' }, { status: 400 })
      }
      const { error } = await supabaseAdmin!.rpc('select_finance_reconciliation_candidate', {
        p_transaction_id: transactionId,
        p_candidate_id: candidateId,
        p_actor_profile_id: auth.adminProfile.id,
      })
      if (error) throw error
      return json({ message: '已更新這筆交易的對應訂單。' })
    }

    if (body.action === 'ignore') {
      if (!transactionId) return json({ error: '缺少交易資料。' }, { status: 400 })
      const { data, error } = await supabaseAdmin!.rpc('ignore_finance_reconciliation_transaction', {
        p_transaction_id: transactionId,
        p_actor_profile_id: auth.adminProfile.id,
        p_reason: typeof body.reason === 'string' ? body.reason.slice(0, 300) : '',
      })
      if (error) throw error
      await refreshBatchStatus(data.batch_id)
      return json({ message: '已將這筆交易標記為不需對帳。' })
    }

    if (body.action === 'confirm') {
      if (!transactionId) return json({ error: '缺少交易資料。' }, { status: 400 })
      const { data, error } = await supabaseAdmin!.rpc('confirm_finance_reconciliation_transaction', {
        p_transaction_id: transactionId,
        p_actor_profile_id: auth.adminProfile.id,
      })
      if (error) throw error
      const emailMessage = await notifyApprovedCourse(data as Record<string, unknown>, auth.adminProfile.id)
      return json({ message: emailMessage || '這筆銀行款項已完成對帳。', result: data })
    }

    if (body.action === 'confirm_batch') {
      if (!batchId) return json({ error: '缺少對帳批次。' }, { status: 400 })
      const { data: readyTransactions, error: readyError } = await supabaseAdmin!
        .from('finance_bank_transactions')
        .select('id')
        .eq('batch_id', batchId)
        .in('match_status', ['matched', 'already_confirmed'])
        .limit(5000)
      if (readyError) throw readyError

      let confirmedCount = 0
      const errors: Array<{ transactionId: string; message: string }> = []
      for (const transaction of readyTransactions ?? []) {
        const { data, error } = await supabaseAdmin!.rpc('confirm_finance_reconciliation_transaction', {
          p_transaction_id: transaction.id,
          p_actor_profile_id: auth.adminProfile.id,
        })
        if (error) {
          errors.push({ transactionId: transaction.id, message: error.message })
          continue
        }
        confirmedCount += 1
        await notifyApprovedCourse(data as Record<string, unknown>, auth.adminProfile.id)
      }
      await refreshBatchStatus(batchId)

      return json({
        message: errors.length > 0
          ? `已完成 ${confirmedCount} 筆；另有 ${errors.length} 筆需人工處理。`
          : `已完成 ${confirmedCount} 筆唯一相符交易的對帳。`,
        confirmedCount,
        errors,
      })
    }

    return json({ error: '對帳操作無效。' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : '對帳操作失敗。'
    const capacityReached = /course capacity reached/i.test(message)
    return json(
      { error: capacityReached ? '對應班級已達名額上限，這筆款項需由管理員人工處理。' : message },
      { status: capacityReached ? 409 : 400 }
    )
  }
}
