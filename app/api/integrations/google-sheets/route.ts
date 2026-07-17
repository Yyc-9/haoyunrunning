import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { allCourses } from '@/lib/goodluck-data'
import {
  isRosterManagedPayload,
  normalizeRosterSheets,
  q3RosterSheetCourses,
  type NormalizedRosterRecord,
} from '@/lib/google-sheets-roster-sync'
import { supabaseAdmin } from '@/lib/supabase-server'

type SyncRequestBody = {
  seasonCode?: unknown
  spreadsheetId?: unknown
  sheets?: unknown
}

type ExistingLead = {
  id: string
  source: string
  name: string
  phone: string
  email: string
  preferred_course: string
  course_slug: string
  season_id: string | null
  course_season_course_id: string | null
  course_capacity: number
  registration_identity: string | null
  amount_text: string
  calculated_amount: number | null
  notes: string
  status: string
  transfer_last_five: string
  payment_submitted_at: string | null
  reviewed_at: string | null
  review_note: string | null
  payload: Record<string, unknown> | null
  created_at: string
  external_submission_id: string | null
  form_submitted_at: string | null
}

type SeasonCourse = {
  id: string
  course_slug: string
  course_data: Record<string, unknown> | null
  capacity: number
}

function cleanText(value: unknown, maxLength = 300) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function transferLastFive(record: NormalizedRosterRecord) {
  const digits = record.transferLastFive.replace(/\D/g, '')
  return digits.length >= 5 ? digits.slice(-5) : ''
}

function declaredAmount(record: NormalizedRosterRecord) {
  const amount = Number(record.amountText.replace(/[^\d]/g, ''))
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0
}

function secretsMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

function normalizedPersonKey(email: string, name: string) {
  return `${email.trim().toLowerCase()}|${name.trim()}`
}

function exactCourseKey(courseSlug: string, email: string, name: string) {
  return `${courseSlug}|${normalizedPersonKey(email, name)}`
}

function submittedKey(submittedAt: string | null, email: string, name: string) {
  if (!submittedAt) return ''
  const timestamp = new Date(submittedAt)
  if (Number.isNaN(timestamp.getTime())) return ''
  return `${timestamp.toISOString()}|${normalizedPersonKey(email, name)}`
}

function appendToMap<T>(map: Map<string, T[]>, key: string, value: T) {
  if (!key) return
  map.set(key, [...(map.get(key) ?? []), value])
}

function firstUnused<T extends { id: string }>(items: T[] | undefined, usedIds: Set<string>) {
  return items?.find((item) => !usedIds.has(item.id)) ?? null
}

function parseStatus(record: NormalizedRosterRecord, existing: ExistingLead | null, duplicateRegistration: boolean) {
  if (existing?.status === 'approved') return 'approved'
  if (existing && !isRosterManagedPayload(existing.payload)) return existing.status
  if (duplicateRegistration || existing?.status === 'rejected') return 'rejected'
  return transferLastFive(record) && declaredAmount(record) ? 'pending_review' : 'pending_transfer'
}

function courseName(course: SeasonCourse) {
  const overrideName = cleanText(course.course_data?.name, 300)
  return overrideName || allCourses.find((item) => item.slug === course.course_slug)?.name || course.course_slug
}

function hasMeaningfulChange(existing: ExistingLead, record: NormalizedRosterRecord, offering: SeasonCourse) {
  const payload = existing.payload ?? {}
  return (
    existing.course_slug !== record.courseSlug ||
    existing.name !== record.name ||
    existing.email.trim().toLowerCase() !== record.email ||
    existing.phone !== record.phone ||
    existing.amount_text !== record.amountText ||
    existing.transfer_last_five !== transferLastFive(record) ||
    Number(existing.calculated_amount ?? 0) !== declaredAmount(record) ||
    existing.notes !== record.notes ||
    existing.registration_identity !== record.identity ||
    existing.course_season_course_id !== offering.id ||
    cleanText(payload.emergencyContactName) !== record.emergencyName ||
    cleanText(payload.emergencyContactPhone) !== record.emergencyPhone ||
    cleanText(payload.lineId) !== record.lineId ||
    cleanText(payload.referrer) !== record.referrer ||
    cleanText(payload.recentChallenge) !== record.recentChallenge ||
    cleanText(payload.recentGoal) !== record.recentGoal ||
    cleanText(payload.injuryHistory) !== record.injuryHistory ||
    cleanText(payload.runningStatus) !== record.runningStatus ||
    cleanText(payload.invoiceDelivery) !== record.invoiceMethod ||
    cleanText(payload.invoiceDetail) !== record.invoiceTarget ||
    cleanText(payload.taxInvoiceInfo) !== record.taxId
  )
}

async function recordSyncError(sourceId: string, message: string) {
  if (!supabaseAdmin || !sourceId) return
  await supabaseAdmin
    .from('course_season_sync_sources')
    .update({ last_error: message.slice(0, 1000) })
    .eq('id', sourceId)
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 2_000_000) {
    return NextResponse.json({ error: '同步資料超過大小限制。' }, { status: 413 })
  }

  const body = (await request.json().catch(() => ({}))) as SyncRequestBody
  const seasonCode = cleanText(body.seasonCode, 20)
  const spreadsheetId = cleanText(body.spreadsheetId, 200)
  if (!/^\d{4}-Q[1-4]$/.test(seasonCode) || !/^[A-Za-z0-9_-]{10,200}$/.test(spreadsheetId)) {
    return NextResponse.json({ error: '季度或 Google 表格編號無效。' }, { status: 400 })
  }

  const { data: source, error: sourceError } = await supabaseAdmin
    .from('course_season_sync_sources')
    .select('id, season_id, external_id, active')
    .eq('provider', 'google_sheets')
    .eq('external_id', spreadsheetId)
    .maybeSingle()

  if (sourceError || !source || !source.active) {
    return NextResponse.json({ error: '這份 Google 表格尚未連結到季度。' }, { status: 404 })
  }

  const { data: season, error: seasonError } = await supabaseAdmin
    .from('course_seasons')
    .select('id, code')
    .eq('id', source.season_id)
    .eq('code', seasonCode)
    .maybeSingle()

  if (seasonError || !season) {
    return NextResponse.json({ error: '季度連結資料不一致。' }, { status: 409 })
  }

  const masterSecret = process.env.GOOGLE_FORMS_WEBHOOK_SECRET?.trim() ?? ''
  const expectedSecret = masterSecret
    ? createHmac('sha256', masterSecret).update(`google-sheets:${seasonCode}:${spreadsheetId}`).digest('hex')
    : ''
  const receivedSecret = request.headers.get('x-goodluck-sheet-secret')?.trim() ?? ''
  if (!expectedSecret || !receivedSecret || !secretsMatch(receivedSecret, expectedSecret)) {
    return NextResponse.json({ error: '表格同步憑證無效。' }, { status: 401 })
  }

  const rawSheets = Array.isArray(body.sheets) ? body.sheets : []
  const receivedSheetNames = new Set(rawSheets.flatMap((sheet) => {
    if (!sheet || typeof sheet !== 'object' || Array.isArray(sheet)) return []
    const name = cleanText((sheet as { name?: unknown }).name, 100)
    return name ? [name] : []
  }))
  const missingSheets = Object.keys(q3RosterSheetCourses).filter((name) => !receivedSheetNames.has(name))
  if (seasonCode === '2026-Q3' && missingSheets.length > 0) {
    await recordSyncError(source.id, `缺少班級分表：${missingSheets.join('、')}`)
    return NextResponse.json({ error: '同步資料缺少正式班級分表。' }, { status: 400 })
  }

  const records = normalizeRosterSheets(rawSheets)
  if (records.length === 0 || records.length > 2250) {
    await recordSyncError(source.id, '表格中沒有可同步的學員資料，或資料筆數異常。')
    return NextResponse.json({ error: '表格中沒有可同步的學員資料，或資料筆數異常。' }, { status: 400 })
  }

  const recordCounts = new Map<string, number>()
  records.forEach((record) => {
    const key = exactCourseKey(record.courseSlug, record.email, record.name)
    recordCounts.set(key, (recordCounts.get(key) ?? 0) + 1)
  })
  const duplicateGroups = [...recordCounts.values()].filter((count) => count > 1)
  const duplicateRecords = duplicateGroups.reduce((total, count) => total + count, 0)

  const [{ data: courseRows, error: coursesError }, { data: leadRows, error: leadsError }] = await Promise.all([
    supabaseAdmin
      .from('course_season_courses')
      .select('id, course_slug, course_data, capacity')
      .eq('season_id', season.id),
    supabaseAdmin
      .from('signup_leads')
      .select('id, source, name, phone, email, preferred_course, course_slug, season_id, course_season_course_id, course_capacity, registration_identity, amount_text, calculated_amount, notes, status, transfer_last_five, payment_submitted_at, reviewed_at, review_note, payload, created_at, external_submission_id, form_submitted_at')
      .eq('season_id', season.id)
      .eq('source', 'course_payment'),
  ])

  if (coursesError || leadsError) {
    const message = coursesError?.message || leadsError?.message || '讀取季度資料失敗。'
    await recordSyncError(source.id, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const offerings = new Map(((courseRows ?? []) as SeasonCourse[]).map((course) => [course.course_slug, course]))
  const existing = (leadRows ?? []) as ExistingLead[]
  const byExactCourse = new Map<string, ExistingLead[]>()
  const bySubmission = new Map<string, ExistingLead[]>()
  const managedByPerson = new Map<string, ExistingLead[]>()
  existing.forEach((lead) => {
    appendToMap(byExactCourse, exactCourseKey(lead.course_slug, lead.email, lead.name), lead)
    appendToMap(bySubmission, submittedKey(lead.form_submitted_at, lead.email, lead.name), lead)
    if (isRosterManagedPayload(lead.payload)) {
      appendToMap(managedByPerson, normalizedPersonKey(lead.email, lead.name), lead)
    }
  })

  const usedIds = new Set<string>()
  const now = new Date().toISOString()
  let inserted = 0
  let moved = 0
  let updated = 0
  let unchanged = 0
  const upsertRows: Record<string, unknown>[] = []

  for (const record of records) {
    const offering = offerings.get(record.courseSlug)
    if (!offering) {
      await recordSyncError(source.id, `找不到班級 ${record.courseSlug} 的季度設定。`)
      return NextResponse.json({ error: '表格中的班級沒有對應季度設定。' }, { status: 409 })
    }

    const submissionMatch = firstUnused(
      bySubmission.get(submittedKey(record.submittedAt, record.email, record.name)),
      usedIds
    )
    const exactMatch = firstUnused(
      byExactCourse.get(exactCourseKey(record.courseSlug, record.email, record.name)),
      usedIds
    )
    const personCandidates = (managedByPerson.get(normalizedPersonKey(record.email, record.name)) ?? [])
      .filter((lead) => !usedIds.has(lead.id))
    const personMatch = personCandidates.length === 1 ? personCandidates[0] : null
    const current = submissionMatch || exactMatch || personMatch
    const id = current?.id ?? randomUUID()
    const duplicateRegistration = (recordCounts.get(exactCourseKey(record.courseSlug, record.email, record.name)) ?? 0) > 1
    const status = parseStatus(record, current, duplicateRegistration)
    const submittedAt = record.submittedAt && !Number.isNaN(Date.parse(record.submittedAt))
      ? new Date(record.submittedAt).toISOString()
      : current?.form_submitted_at || now
    const payload = {
      ...(current?.payload ?? {}),
      provider: 'google_sheets_roster_sync',
      sourceSpreadsheetId: spreadsheetId,
      sourceSheet: record.sheetName,
      sourceRow: record.sourceRow,
      sourceStableKey: record.stableKey,
      sourceConfirmedName: record.confirmedName,
      sourceConfirmedAmount: record.confirmedAmount,
      duplicateRegistration,
      studentType: record.identity,
      lineId: record.lineId,
      emergencyContactName: record.emergencyName,
      emergencyContactPhone: record.emergencyPhone,
      referrer: record.referrer,
      recentChallenge: record.recentChallenge,
      recentGoal: record.recentGoal,
      injuryHistory: record.injuryHistory,
      runningStatus: record.runningStatus,
      invoiceDelivery: record.invoiceMethod,
      invoiceDetail: record.invoiceTarget,
      taxInvoiceInfo: record.taxId,
      sheetSyncedAt: now,
    }

    if (!current) inserted += 1
    else if (current.course_slug !== record.courseSlug) moved += 1
    else if (hasMeaningfulChange(current, record, offering) || current.status !== status) updated += 1
    else unchanged += 1
    usedIds.add(id)

    upsertRows.push({
      id,
      source: 'course_payment',
      name: record.name,
      phone: record.phone,
      email: record.email,
      preferred_course: courseName(offering),
      course_slug: record.courseSlug,
      season_id: season.id,
      course_season_course_id: offering.id,
      course_capacity: offering.capacity,
      registration_identity: record.identity,
      amount_text: record.amountText,
      calculated_amount: declaredAmount(record) || null,
      notes: record.notes,
      status,
      transfer_last_five: transferLastFive(record),
      payment_submitted_at: status === 'pending_review' || status === 'approved'
        ? current?.payment_submitted_at || submittedAt
        : current?.payment_submitted_at,
      reviewed_at: status === 'approved' ? current?.reviewed_at || now : current?.reviewed_at,
      review_note: current?.review_note || (
        duplicateRegistration
          ? 'Google 表格偵測到同班級、同姓名與同信箱的重複報名，請人工處理。'
          : status === 'approved'
            ? '已由財務確認入帳；Google 表格僅同步報名資料。'
            : '由 Google 表格同步；付款仍依銀行對帳結果判定。'
      ),
      payload,
      created_at: current?.created_at || submittedAt,
      external_submission_id: current?.external_submission_id || `q3-sheet:${record.stableKey}`,
      form_submitted_at: current?.form_submitted_at || submittedAt,
      updated_at: now,
    })
  }

  const { error: upsertError } = await supabaseAdmin
    .from('signup_leads')
    .upsert(upsertRows, { onConflict: 'id' })

  if (upsertError) {
    await recordSyncError(source.id, upsertError.message)
    return NextResponse.json({ error: '同步學員資料失敗。' }, { status: 500 })
  }

  const missing = existing.filter((lead) => isRosterManagedPayload(lead.payload) && !usedIds.has(lead.id)).length
  const result = {
    records: records.length,
    inserted,
    moved,
    updated,
    unchanged,
    missing,
    sheets: Object.keys(q3RosterSheetCourses).length,
    duplicateGroups: duplicateGroups.length,
    duplicateRecords,
  }
  const { error: sourceUpdateError } = await supabaseAdmin
    .from('course_season_sync_sources')
    .update({
      last_synced_at: now,
      last_result: result,
      last_error: '',
      updated_at: now,
    })
    .eq('id', source.id)

  if (sourceUpdateError) {
    return NextResponse.json({ error: '學員資料已同步，但同步狀態更新失敗。' }, { status: 500 })
  }

  return NextResponse.json({ sync: result })
}
