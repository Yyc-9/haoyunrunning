'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  KeyRound,
  Landmark,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type PaymentAccount = {
  id: string
  label: string
  bank_name: string
  account_number: string
  active: boolean
}

type ColumnMapping = {
  date: number | null
  time: number | null
  amount: number | null
  lastFive: number | null
  sourceName: number | null
  reference: number | null
  note: number | null
  direction: number | null
}

type FilePreview = {
  fileName: string
  fileSize: number
  fileSha256: string
  sheetName: string
  sheetNames: string[]
  headerRow: number
  rowCount: number
  columns: Array<{ index: number; header: string; samples: string[] }>
  suggestedMapping: ColumnMapping
}

type ReconciliationBatch = {
  id: string
  file_name: string
  bank_account_label: string
  imported_count: number
  duplicate_count: number
  status: 'processed' | 'partially_confirmed' | 'confirmed'
  summary: {
    statusCounts?: Record<string, number>
    skippedRows?: Array<{ rowNumber: number; reason: string }>
  }
  uploaded_at: string
}

type BankTransaction = {
  id: string
  batch_id: string
  row_number: number
  transaction_date: string | null
  transaction_time: string
  amount: number
  direction: 'credit' | 'debit'
  source_last_five: string
  source_name: string
  bank_reference: string
  note: string
  match_status: MatchStatus
  match_reason: string
  candidate_count: number
  confirmed_at: string | null
}

type MatchStatus =
  | 'matched'
  | 'ambiguous'
  | 'amount_mismatch'
  | 'unmatched'
  | 'already_confirmed'
  | 'manual_match'
  | 'duplicate'
  | 'ignored'
  | 'confirmed'

type Candidate = {
  id: string
  transaction_id: string
  order_kind: 'course' | 'shop'
  order_id: string
  order_number: string
  customer_name: string
  order_label: string
  expected_amount: number
  transfer_last_five: string
  order_status: string
  match_quality: 'exact' | 'last_five_only'
  selected: boolean
}

type ReconciliationPayload = {
  batches: ReconciliationBatch[]
  selectedBatchId: string
  transactions: BankTransaction[]
  candidates: Candidate[]
  financeTokenExpiresAt?: string
}

type AccessStatus = {
  configured: boolean
  canManagePassword: boolean
  lockedUntil: string | null
  passwordRequirements: string
}

const statusMeta: Record<MatchStatus, { label: string; tone: string }> = {
  matched: { label: '唯一相符', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  ambiguous: { label: '多筆待選', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  amount_mismatch: { label: '金額不同', tone: 'bg-orange-50 text-orange-700 ring-orange-200' },
  unmatched: { label: '找不到訂單', tone: 'bg-red-50 text-red-700 ring-red-200' },
  already_confirmed: { label: '已確認待補登', tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  manual_match: { label: '人工已選', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  duplicate: { label: '重複交易', tone: 'bg-apple-gray-100 text-apple-gray-600 ring-black/10' },
  ignored: { label: '不需對帳', tone: 'bg-apple-gray-100 text-apple-gray-500 ring-black/10' },
  confirmed: { label: '對帳完成', tone: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
}

const mappingFields: Array<{ key: keyof ColumnMapping; label: string; required?: boolean }> = [
  { key: 'amount', label: '入帳金額', required: true },
  { key: 'lastFive', label: '匯款帳號／後五碼', required: true },
  { key: 'date', label: '交易日期' },
  { key: 'time', label: '交易時間' },
  { key: 'sourceName', label: '匯款人' },
  { key: 'reference', label: '交易序號' },
  { key: 'note', label: '摘要' },
  { key: 'direction', label: '收支方向' },
]

function formatMoney(value: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null | undefined, includeTime = true) {
  if (!value) return '未提供'
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

async function getAdminToken() {
  if (!supabase) return ''
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

export default function AdminBankReconciliation({ paymentAccounts }: { paymentAccounts: PaymentAccount[] }) {
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null)
  const [financeToken, setFinanceToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('')
  const [data, setData] = useState<ReconciliationPayload | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<FilePreview | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [headerRow, setHeaderRow] = useState(1)
  const [bankAccountId, setBankAccountId] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | MatchStatus>('all')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const financeTokenRef = useRef('')

  const storeFinanceToken = useCallback((token: string) => {
    financeTokenRef.current = token
    setFinanceToken(token)
    if (token) window.sessionStorage.setItem('finance-reconciliation-token', token)
    else window.sessionStorage.removeItem('finance-reconciliation-token')
  }, [])

  const authorizedFetch = useCallback(async (url: string, init?: RequestInit, tokenOverride?: string) => {
    const adminToken = await getAdminToken()
    if (!adminToken) throw new Error('請先登入管理員帳號。')
    const activeFinanceToken = tokenOverride ?? financeTokenRef.current
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        ...(activeFinanceToken
          ? { 'X-Finance-Authorization': activeFinanceToken }
          : {}),
        ...(init?.headers ?? {}),
      },
    })
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) {
      if (response.status === 403 && activeFinanceToken) {
        storeFinanceToken('')
      }
      const requestError = new Error(typeof payload.error === 'string' ? payload.error : '操作失敗。')
      Object.assign(requestError, { payload })
      throw requestError
    }
    return payload
  }, [storeFinanceToken])

  const loadAccessStatus = useCallback(async () => {
    setBusy('access-status')
    setError('')
    try {
      const payload = await authorizedFetch('/api/admin/reconciliation/access')
      setAccessStatus(payload as unknown as AccessStatus)
      const savedToken = window.sessionStorage.getItem('finance-reconciliation-token') ?? ''
      if (savedToken) {
        storeFinanceToken(savedToken)
        try {
          const reconciliation = await authorizedFetch('/api/admin/reconciliation', undefined, savedToken)
          setData(reconciliation as unknown as ReconciliationPayload)
        } catch {
          storeFinanceToken('')
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取財務權限失敗。')
    } finally {
      setBusy('')
    }
  }, [authorizedFetch, storeFinanceToken])

  useEffect(() => {
    loadAccessStatus()
  }, [loadAccessStatus])

  useEffect(() => {
    setBatchConfirmOpen(false)
  }, [data?.selectedBatchId])

  const loadData = useCallback(async (batchId = '', tokenOverride?: string) => {
    const query = batchId ? `?batchId=${encodeURIComponent(batchId)}` : ''
    const payload = await authorizedFetch(`/api/admin/reconciliation${query}`, undefined, tokenOverride)
    setData(payload as unknown as ReconciliationPayload)
  }, [authorizedFetch])

  async function submitPassword() {
    const setup = accessStatus?.configured === false
    if (setup && password !== confirmPassword) {
      setError('兩次輸入的財務密碼不一致。')
      return
    }

    setBusy('password')
    setError('')
    setMessage('')
    try {
      const payload = await authorizedFetch('/api/admin/reconciliation/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: setup ? 'setup' : 'unlock', password }),
      })
      const token = typeof payload.token === 'string' ? payload.token : ''
      if (!token) throw new Error('財務權限解鎖失敗。')
      storeFinanceToken(token)
      setPassword('')
      setConfirmPassword('')
      setMessage(typeof payload.message === 'string' ? payload.message : '財務對帳區已解鎖。')
      setAccessStatus((current) => current ? { ...current, configured: true, lockedUntil: null } : current)
      await loadData('', token)
    } catch (submitError) {
      const submitMessage = submitError instanceof Error ? submitError.message : '財務權限驗證失敗。'
      await loadAccessStatus()
      setError(submitMessage)
    } finally {
      setBusy('')
    }
  }

  async function changePassword() {
    if (newPassword !== newPasswordConfirmation) {
      setError('兩次輸入的新財務密碼不一致。')
      return
    }

    setBusy('change-password')
    setError('')
    setMessage('')
    try {
      const payload = await authorizedFetch('/api/admin/reconciliation/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          currentPassword,
          newPassword,
        }),
      })
      const token = typeof payload.token === 'string' ? payload.token : ''
      if (!token) throw new Error('財務密碼更新失敗。')
      storeFinanceToken(token)
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirmation('')
      setMessage(typeof payload.message === 'string' ? payload.message : '財務密碼已更新。')
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : '財務密碼更新失敗。')
    } finally {
      setBusy('')
    }
  }

  async function previewFile(nextFile: File, options?: { sheetName?: string; headerRow?: number }) {
    setBusy('preview')
    setError('')
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('file', nextFile)
      if (options?.sheetName) formData.append('sheetName', options.sheetName)
      if (options?.headerRow) formData.append('headerRow', String(options.headerRow))
      const payload = await authorizedFetch('/api/admin/reconciliation/preview', {
        method: 'POST',
        body: formData,
      })
      const nextPreview = payload.preview as unknown as FilePreview
      setFile(nextFile)
      setPreview(nextPreview)
      setMapping(nextPreview.suggestedMapping)
      setHeaderRow(nextPreview.headerRow)
    } catch (previewError) {
      setPreview(null)
      setMapping(null)
      setError(previewError instanceof Error ? previewError.message : '銀行檔案預覽失敗。')
    } finally {
      setBusy('')
    }
  }

  async function importFile() {
    if (!file || !preview || !mapping) return
    if (mapping.amount === null || mapping.lastFive === null) {
      setError('請先指定入帳金額與匯款帳號／後五碼欄位。')
      return
    }

    setBusy('import')
    setError('')
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sheetName', preview.sheetName)
      formData.append('headerRow', String(headerRow))
      formData.append('mapping', JSON.stringify(mapping))
      formData.append('bankAccountId', bankAccountId)
      const payload = await authorizedFetch('/api/admin/reconciliation', {
        method: 'POST',
        body: formData,
      })
      setData(payload as unknown as ReconciliationPayload)
      setMessage(typeof payload.message === 'string' ? payload.message : '銀行交易已匯入。')
      setFile(null)
      setPreview(null)
      setMapping(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : '銀行檔案匯入失敗。')
    } finally {
      setBusy('')
    }
  }

  async function runAction(id: string, body: Record<string, unknown>) {
    setBusy(id)
    setError('')
    setMessage('')
    try {
      const payload = await authorizedFetch('/api/admin/reconciliation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setMessage(typeof payload.message === 'string' ? payload.message : '對帳操作已完成。')
      await loadData(data?.selectedBatchId ?? '')
      return true
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '對帳操作失敗。')
      return false
    } finally {
      setBusy('')
    }
  }

  const candidatesByTransaction = useMemo(() => {
    const map = new Map<string, Candidate[]>()
    for (const candidate of data?.candidates ?? []) {
      map.set(candidate.transaction_id, [...(map.get(candidate.transaction_id) ?? []), candidate])
    }
    return map
  }, [data?.candidates])

  const filteredTransactions = useMemo(
    () => (data?.transactions ?? []).filter((transaction) => statusFilter === 'all' || transaction.match_status === statusFilter),
    [data?.transactions, statusFilter]
  )

  const statusCounts = useMemo(() => {
    const counts = new Map<MatchStatus, number>()
    for (const transaction of data?.transactions ?? []) {
      counts.set(transaction.match_status, (counts.get(transaction.match_status) ?? 0) + 1)
    }
    return counts
  }, [data?.transactions])

  if (!accessStatus && error && busy !== 'access-status') {
    return (
      <div className="apple-card mx-auto max-w-xl p-6 text-center sm:p-8">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
        <h2 className="mt-4 text-xl font-black text-apple-gray-900">無法讀取財務權限</h2>
        <p className="mt-2 text-sm leading-6 text-red-700">{error}</p>
        <button
          type="button"
          onClick={loadAccessStatus}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white"
        >
          <RefreshCw className="h-4 w-4" />重新嘗試
        </button>
      </div>
    )
  }

  if (!accessStatus || busy === 'access-status') {
    return (
      <div className="apple-card flex min-h-[300px] items-center justify-center p-8">
        <Loader2 className="h-7 w-7 animate-spin text-apple-gray-500" />
      </div>
    )
  }

  if (!financeToken) {
    const isLocked = Boolean(accessStatus.lockedUntil && new Date(accessStatus.lockedUntil).getTime() > Date.now())
    const isSetup = !accessStatus.configured
    return (
      <section className="mx-auto max-w-xl">
        <div className="overflow-hidden rounded-[2rem] bg-black text-white shadow-2xl">
          <div className="p-6 sm:p-9">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-white/50">Finance only</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">{isSetup ? '建立財務專用密碼' : '解鎖銀行對帳'}</h2>
            <p className="mt-3 text-sm leading-6 text-white/65">
              銀行檔案、匹配結果與確認操作另有一層財務權限；解鎖有效 30 分鐘。
            </p>

            {isSetup && !accessStatus.canManagePassword ? (
              <div className="mt-6 rounded-2xl bg-amber-400/10 p-4 text-sm leading-6 text-amber-100 ring-1 ring-amber-300/20">
                財務密碼尚未建立，請由指定的財務主管帳號先完成設定。
              </div>
            ) : (
              <div className="mt-7 space-y-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-white/60">財務密碼</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !isSetup) submitPassword()
                    }}
                    autoComplete={isSetup ? 'new-password' : 'current-password'}
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-white outline-none placeholder:text-white/30 focus:border-white/40"
                    placeholder={isSetup ? '設定至少 12 個字元' : '輸入財務密碼'}
                  />
                </label>
                {isSetup ? (
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-white/60">再次輸入</span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-white outline-none placeholder:text-white/30 focus:border-white/40"
                      placeholder="再次輸入財務密碼"
                    />
                  </label>
                ) : null}
                <p className="text-xs leading-5 text-white/45">{accessStatus.passwordRequirements}</p>
                <button
                  type="button"
                  disabled={busy === 'password' || isLocked || password.length === 0}
                  onClick={submitPassword}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === 'password' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {isLocked ? `鎖定至 ${formatDate(accessStatus.lockedUntil)}` : isSetup ? '建立並解鎖' : '解鎖對帳區'}
                </button>
              </div>
            )}
          </div>
        </div>
        {error ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 rounded-[1.75rem] bg-black p-5 text-white sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">財務權限已解鎖</p>
            <h2 className="mt-1 text-2xl font-black">銀行對帳</h2>
            <p className="mt-1 text-sm leading-6 text-white/60">後五碼與整數金額皆唯一相符時才會建議自動確認。</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            storeFinanceToken('')
            setData(null)
          }}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white/80 hover:bg-white/10"
        >
          <LockKeyhole className="h-4 w-4" />
          立即鎖定
        </button>
      </header>

      {message ? (
        <div role="status" className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {message}
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {accessStatus.canManagePassword ? (
        <details className="apple-card overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-black text-apple-gray-800 sm:px-5">
            <span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4" />財務密碼設定</span>
            <ChevronDown className="h-4 w-4 text-apple-gray-400" />
          </summary>
          <div className="grid gap-3 border-t border-black/10 p-4 sm:grid-cols-3 sm:p-5">
            <label>
              <span className="mb-1.5 block text-xs font-bold text-apple-gray-500">目前密碼</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                className="apple-input"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-apple-gray-500">新密碼</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                className="apple-input"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-apple-gray-500">再次輸入新密碼</span>
              <input
                type="password"
                value={newPasswordConfirmation}
                onChange={(event) => setNewPasswordConfirmation(event.target.value)}
                autoComplete="new-password"
                className="apple-input"
              />
            </label>
            <div className="sm:col-span-3 sm:flex sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-apple-gray-500">更新後，其他已解鎖的財務工作階段會立即失效。</p>
              <button
                type="button"
                onClick={changePassword}
                disabled={busy === 'change-password' || !currentPassword || !newPassword || !newPasswordConfirmation}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40 sm:mt-0 sm:w-auto"
              >
                {busy === 'change-password' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                更新財務密碼
              </button>
            </div>
          </div>
        </details>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <div className="apple-card overflow-hidden">
          <div className="border-b border-black/10 p-5">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-apple-gray-700" />
              <div>
                <h3 className="font-black text-apple-gray-900">匯入銀行明細</h3>
                <p className="mt-0.5 text-xs text-apple-gray-500">支援 XLSX、CSV，單檔最多 10 MB。</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={(event) => {
                const nextFile = event.target.files?.[0]
                if (nextFile) previewFile(nextFile)
              }}
              className="block w-full text-sm text-apple-gray-600 file:mr-3 file:rounded-xl file:border-0 file:bg-black file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white hover:file:bg-apple-gray-800"
            />
            <p className="rounded-xl bg-apple-gray-50 p-3 text-xs leading-5 text-apple-gray-500">
              原始銀行檔案只在本次匯入時解析，不會保留在網站；系統僅保存對帳所需欄位、後五碼與檔案指紋。
            </p>

            {busy === 'preview' ? (
              <div className="flex items-center gap-2 py-4 text-sm font-semibold text-apple-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />正在辨識銀行欄位...
              </div>
            ) : null}

            {preview && mapping ? (
              <div className="space-y-4 border-t border-black/10 pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {preview.sheetNames.length > 1 ? (
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-apple-gray-500">工作表</span>
                      <select
                        value={preview.sheetName}
                        onChange={(event) => file && previewFile(file, { sheetName: event.target.value })}
                        className="apple-input py-2.5 text-sm"
                      >
                        {preview.sheetNames.map((sheet) => <option key={sheet} value={sheet}>{sheet}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-apple-gray-500">標題列</span>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={headerRow}
                        onChange={(event) => setHeaderRow(Number(event.target.value))}
                        className="apple-input min-w-0 py-2.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => file && previewFile(file, { sheetName: preview.sheetName, headerRow })}
                        className="shrink-0 rounded-xl border border-black/10 px-3 text-xs font-bold"
                      >
                        重讀
                      </button>
                    </div>
                  </label>
                  <label className={preview.sheetNames.length > 1 ? '' : 'sm:col-span-1'}>
                    <span className="mb-1.5 block text-xs font-bold text-apple-gray-500">入帳收款帳戶</span>
                    <select
                      value={bankAccountId}
                      onChange={(event) => setBankAccountId(event.target.value)}
                      className="apple-input py-2.5 text-sm"
                    >
                      <option value="">未指定</option>
                      {paymentAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.bank_name} · {account.label} · ••••{account.account_number.slice(-4)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {mappingFields.map((field) => (
                    <label key={field.key}>
                      <span className="mb-1.5 block text-xs font-bold text-apple-gray-500">
                        {field.label}{field.required ? <span className="text-red-500"> *</span> : null}
                      </span>
                      <select
                        value={mapping[field.key] ?? ''}
                        onChange={(event) => setMapping((current) => current ? {
                          ...current,
                          [field.key]: event.target.value === '' ? null : Number(event.target.value),
                        } : current)}
                        className="apple-input min-w-0 py-2.5 text-sm"
                      >
                        <option value="">不使用</option>
                        {preview.columns.map((column) => (
                          <option key={column.index} value={column.index}>
                            {column.header}{column.samples[0] ? `｜${column.samples[0]}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={importFile}
                  disabled={busy === 'import'}
                  className="apple-button-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
                >
                  {busy === 'import' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  匯入並開始比對（約 {preview.rowCount} 列）
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="apple-card overflow-hidden">
          <div className="border-b border-black/10 p-5">
            <div>
              <div>
                <h3 className="font-black text-apple-gray-900">對帳批次</h3>
                <p className="mt-1 text-xs text-apple-gray-500">保留匯入、人工選擇與確認紀錄，方便日後追查。</p>
              </div>
            </div>
          </div>
          {!data?.batches.length ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
              <Landmark className="h-8 w-8 text-apple-gray-300" />
              <p className="mt-3 font-bold text-apple-gray-700">尚未匯入銀行明細</p>
              <p className="mt-1 text-sm text-apple-gray-500">完成第一份檔案匯入後，批次摘要會顯示在這裡。</p>
            </div>
          ) : (
            <div className="p-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-apple-gray-500">目前批次</span>
                <div className="relative">
                  <select
                    value={data.selectedBatchId}
                    onChange={(event) => {
                      setBatchConfirmOpen(false)
                      void loadData(event.target.value)
                    }}
                    className="apple-input w-full appearance-none pr-10"
                  >
                    {data.batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {formatDate(batch.uploaded_at)} · {batch.file_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
                </div>
              </label>

              {data.batches.find((batch) => batch.id === data.selectedBatchId) ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
                  {[
                    ['匯入交易', data.transactions.length],
                    ['可直接確認', (statusCounts.get('matched') ?? 0) + (statusCounts.get('already_confirmed') ?? 0)],
                    ['需人工處理', (statusCounts.get('ambiguous') ?? 0) + (statusCounts.get('amount_mismatch') ?? 0) + (statusCounts.get('unmatched') ?? 0)],
                    ['已完成', statusCounts.get('confirmed') ?? 0],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-apple-gray-50 p-3">
                      <p className="text-[11px] font-bold text-apple-gray-400">{label}</p>
                      <p className="mt-1 text-2xl font-black text-apple-gray-900">{value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setBatchConfirmOpen(true)}
                disabled={busy === 'confirm-batch' || ((statusCounts.get('matched') ?? 0) + (statusCounts.get('already_confirmed') ?? 0) === 0)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === 'confirm-batch' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                第一步：確認全部唯一相符款項
              </button>
              {batchConfirmOpen ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-black text-amber-900">請再次確認批次入帳</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">系統會將本批次所有唯一相符款項標記為已入帳，並依現有規則更新訂單與課表權限。</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" className="min-h-11 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs font-bold" onClick={() => setBatchConfirmOpen(false)}>再檢查</button>
                    <button type="button" className="min-h-11 rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40" disabled={busy === 'confirm-batch'} onClick={async () => { const saved = await runAction('confirm-batch', { action: 'confirm_batch', batchId: data.selectedBatchId }); if (saved) setBatchConfirmOpen(false) }}>第二步：確認入帳</button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {data?.transactions.length ? (
        <div className="apple-card overflow-hidden">
          <div className="border-b border-black/10 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-black text-apple-gray-900">交易比對結果</h3>
          <p className="mt-1 text-xs text-apple-gray-500">人工選擇金額不同的訂單後，仍需再次按下確認才會核准。</p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${statusFilter === 'all' ? 'bg-black text-white' : 'bg-apple-gray-100 text-apple-gray-600'}`}
                >
                  全部 {data.transactions.length}
                </button>
                {(Object.keys(statusMeta) as MatchStatus[]).filter((status) => (statusCounts.get(status) ?? 0) > 0).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${statusFilter === status ? 'bg-black text-white' : 'bg-apple-gray-100 text-apple-gray-600'}`}
                  >
                    {statusMeta[status].label} {statusCounts.get(status)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
              <thead className="bg-apple-gray-50 text-xs text-apple-gray-500">
                <tr>
                  <th className="w-[15%] px-4 py-3 font-bold">銀行交易</th>
                  <th className="w-[13%] px-4 py-3 font-bold">金額</th>
                  <th className="w-[16%] px-4 py-3 font-bold">匯款資料</th>
                  <th className="w-[14%] px-4 py-3 font-bold">比對狀態</th>
                  <th className="w-[25%] px-4 py-3 font-bold">對應訂單</th>
                  <th className="w-[17%] px-4 py-3 font-bold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {filteredTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    candidates={candidatesByTransaction.get(transaction.id) ?? []}
                    busy={busy}
                    onAction={runAction}
                    desktop
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-black/10 lg:hidden">
            {filteredTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                candidates={candidatesByTransaction.get(transaction.id) ?? []}
                busy={busy}
                onAction={runAction}
              />
            ))}
          </div>
          {filteredTransactions.length === 0 ? (
            <div className="p-10 text-center text-sm font-semibold text-apple-gray-500">目前篩選沒有交易。</div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function TransactionRow({
  transaction,
  candidates,
  busy,
  onAction,
  desktop = false,
}: {
  transaction: BankTransaction
  candidates: Candidate[]
  busy: string
  onAction: (id: string, body: Record<string, unknown>) => Promise<boolean>
  desktop?: boolean
}) {
  const selected = candidates.find((candidate) => candidate.selected)
  const canConfirm = ['matched', 'already_confirmed', 'manual_match'].includes(transaction.match_status) && Boolean(selected)
  const complete = ['confirmed', 'ignored', 'duplicate'].includes(transaction.match_status)
  const status = statusMeta[transaction.match_status]
  const [confirmOpen, setConfirmOpen] = useState(false)
  const rowBusy = busy.endsWith(transaction.id)

  useEffect(() => {
    setConfirmOpen(false)
  }, [selected?.id, transaction.id, transaction.match_status])

  async function confirmTransaction() {
    const saved = await onAction('confirm-' + transaction.id, {
      action: 'confirm',
      transactionId: transaction.id,
    })
    if (saved) setConfirmOpen(false)
  }

  const candidatePicker = candidates.length > 0 ? (
    <select
      value={selected?.id ?? ''}
      disabled={complete || rowBusy}
      onChange={(event) => {
        if (event.target.value) {
          onAction(`select-${transaction.id}`, {
            action: 'select_candidate',
            transactionId: transaction.id,
            candidateId: event.target.value,
          })
        }
      }}
      className="apple-input min-w-0 py-2 text-xs disabled:opacity-60"
      aria-label={`選擇第 ${transaction.row_number} 列的對應訂單`}
    >
      <option value="">選擇對應訂單</option>
      {candidates.map((candidate) => (
        <option key={candidate.id} value={candidate.id}>
          {candidate.customer_name} · {formatMoney(candidate.expected_amount)} · {candidate.order_kind === 'course' ? candidate.order_label : candidate.order_number}
        </option>
      ))}
    </select>
  ) : <span className="text-xs text-apple-gray-400">沒有後五碼相同的訂單</span>

  const actions = !complete ? (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={!canConfirm || rowBusy}
        onClick={() => setConfirmOpen(true)}
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-black px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-35"
      >
        {busy === `confirm-${transaction.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        確認入帳
      </button>
      <button
        type="button"
        disabled={rowBusy}
        onClick={() => onAction(`ignore-${transaction.id}`, {
          action: 'ignore',
          transactionId: transaction.id,
          reason: '財務人工判定不需列入本次收款對帳。',
        })}
        className="min-h-11 rounded-xl border border-black/10 px-3 py-2 text-xs font-bold text-apple-gray-600 disabled:opacity-40"
      >
        略過
      </button>
    </div>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
      {transaction.match_status === 'confirmed' ? <CheckCircle2 className="h-4 w-4" /> : null}
      {status.label}
    </span>
  )

  const confirmation = confirmOpen && !complete ? (
    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-black text-amber-900">請再次確認入帳</p>
      <div className="mt-2 grid gap-1 text-xs leading-5 text-amber-900">
        <p>學員／買家：{selected?.customer_name || transaction.source_name || '未提供'}</p>
        <p>課程／商品訂單：{selected?.order_label || selected?.order_number || '尚未選擇對應訂單'}</p>
        <p>回報金額：{selected ? formatMoney(selected.expected_amount) : '未提供'} · 銀行實際入帳：{formatMoney(transaction.amount)}</p>
        <p>轉出後五碼：{transaction.source_last_five || '未提供'} · 入帳時間：{transaction.transaction_date ? formatDate(transaction.transaction_date) : transaction.transaction_time || '未提供'}</p>
      </div>
      <p className="mt-2 rounded-xl bg-white/70 p-2 text-xs leading-5 text-amber-800">{transaction.match_reason || '請確認金額、後五碼與訂單資料一致。'}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="min-h-11 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs font-bold" onClick={() => setConfirmOpen(false)}>再檢查</button>
        <button type="button" className="min-h-11 rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40" disabled={rowBusy} onClick={() => void confirmTransaction()}>第二步：確認入帳</button>
      </div>
    </div>
  ) : null

  if (desktop) {
    return (
      <tr>
        <td className="px-4 py-4 align-top">
          <p className="font-bold text-apple-gray-900">{transaction.transaction_date ? formatDate(transaction.transaction_date, false) : `檔案第 ${transaction.row_number} 列`}</p>
          <p className="mt-1 truncate text-xs text-apple-gray-400" title={transaction.bank_reference}>{transaction.bank_reference || `第 ${transaction.row_number} 列`}</p>
        </td>
        <td className="px-4 py-4 align-top">
          <p className="font-black text-apple-gray-900">{formatMoney(transaction.amount)}</p>
          <p className="mt-1 text-xs text-apple-gray-400">{transaction.direction === 'credit' ? '收入' : '支出'}</p>
        </td>
        <td className="px-4 py-4 align-top">
          <p className="truncate font-bold text-apple-gray-800" title={transaction.source_name}>{transaction.source_name || '未提供戶名'}</p>
          <p className="mt-1 text-xs text-apple-gray-500">後五碼 {transaction.source_last_five || '—'}</p>
        </td>
        <td className="px-4 py-4 align-top">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${status.tone}`}>{status.label}</span>
          <p className="mt-2 text-xs leading-5 text-apple-gray-500">{transaction.match_reason}</p>
        </td>
        <td className="px-4 py-4 align-top">{candidatePicker}</td>
        <td className="px-4 py-4 align-top">{actions}{confirmation}</td>
      </tr>
    )
  }

  return (
    <article className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-apple-gray-400">{transaction.transaction_date ? formatDate(transaction.transaction_date, false) : `檔案第 ${transaction.row_number} 列`}</p>
          <p className="mt-1 text-xl font-black text-apple-gray-900">{formatMoney(transaction.amount)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${status.tone}`}>{status.label}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-apple-gray-50 p-3 text-xs">
        <div>
          <p className="font-bold text-apple-gray-400">匯款人</p>
          <p className="mt-1 break-words font-bold text-apple-gray-800">{transaction.source_name || '未提供'}</p>
        </div>
        <div>
          <p className="font-bold text-apple-gray-400">後五碼</p>
          <p className="mt-1 font-mono font-black text-apple-gray-800">{transaction.source_last_five || '—'}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-apple-gray-500">{transaction.match_reason}</p>
      <div className="mt-3">{candidatePicker}</div>
      <div className="mt-3">{actions}{confirmation}</div>
    </article>
  )
}
