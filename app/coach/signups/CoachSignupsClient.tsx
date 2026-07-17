'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Filter, Inbox, Phone, RefreshCw, Search } from 'lucide-react'
import CoachSubNav from '@/components/CoachSubNav'
import { paymentOrderStatusLabels, type PaymentOrderStatus } from '@/lib/payment'
import { supabase } from '@/lib/supabase'

type SignupLead = {
  id: string
  source: 'anniversary_4th' | 'group_class' | 'course_payment'
  name: string
  phone: string
  email: string
  instagram: string
  preferred_course: string
  running_experience: string
  goal: string
  companion_count: string
  notes: string
  status: PaymentOrderStatus
  created_at: string
  emergency_contact_name: string
  emergency_contact_phone: string
}

const sourceLabels: Record<SignupLead['source'], string> = {
  anniversary_4th: '4 週年活動',
  group_class: '團練報名',
  course_payment: '課程報名',
}

const statusLabels = paymentOrderStatusLabels['zh-TW']

const statusTone: Record<SignupLead['status'], string> = {
  pending_transfer: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

async function getAccessToken() {
  if (!supabase) return null

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? null
}

async function fetchSignupLeads() {
  const token = await getAccessToken()
  if (!token) {
    throw new Error('請先登入教練或管理員帳號。')
  }

  const response = await fetch('/api/signup-leads', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    leads?: SignupLead[]
  }

  if (!response.ok) {
    throw new Error(payload.error || '讀取報名資料失敗。')
  }

  return payload.leads ?? []
}

async function updateLeadStatus(id: string, status: SignupLead['status'], reviewNote = '') {
  const token = await getAccessToken()
  if (!token) {
    throw new Error('請先登入教練或管理員帳號。')
  }

  const response = await fetch('/api/signup-leads', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, status, reviewNote }),
  })

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    lead?: SignupLead
    emailMessage?: string
  }

  if (!response.ok || !payload.lead) {
    throw new Error(payload.error || '更新報名狀態失敗。')
  }

  return { lead: payload.lead, emailMessage: payload.emailMessage }
}

export default function CoachSignupsClient() {
  const [leads, setLeads] = useState<SignupLead[]>([])
  const [source, setSource] = useState<'all' | SignupLead['source']>('group_class')
  const [status, setStatus] = useState<'all' | SignupLead['status']>('all')
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [updatingId, setUpdatingId] = useState('')

  const loadLeads = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false)
      setError('Supabase 尚未設定。')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      setLeads(await fetchSignupLeads())
    } catch (loadError) {
      setLeads([])
      setError(loadError instanceof Error ? loadError.message : '讀取報名資料失敗。')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  const filteredLeads = useMemo(() => {
    const text = query.trim().toLowerCase()

    return leads.filter((lead) => {
      if (source !== 'all' && lead.source !== source) return false
      if (status !== 'all' && lead.status !== status) return false

      if (!text) return true

      return [
        lead.name,
        lead.phone,
        lead.email,
        lead.instagram,
        lead.preferred_course,
        lead.running_experience,
        lead.goal,
        lead.companion_count,
        lead.notes,
        lead.emergency_contact_name,
        lead.emergency_contact_phone,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(text))
    })
  }, [leads, query, source, status])

  const stats = useMemo(() => {
    return {
      total: leads.length,
      anniversary: leads.filter((lead) => lead.source === 'anniversary_4th').length,
      group: leads.filter((lead) => lead.source === 'group_class').length,
      coursePayment: leads.filter((lead) => lead.source === 'course_payment').length,
      approved: leads.filter((lead) => lead.status === 'approved').length,
    }
  }, [leads])

  async function handleStatusChange(id: string, nextStatus: SignupLead['status']) {
    setUpdatingId(id)
    setError('')
    setMessage('')

    try {
      const { lead: updatedLead, emailMessage } = await updateLeadStatus(id, nextStatus)
      setLeads((current) => current.map((lead) => (lead.id === id ? updatedLead : lead)))
      if (emailMessage) setMessage(emailMessage)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : '更新報名狀態失敗。')
    } finally {
      setUpdatingId('')
    }
  }

  function exportCsv() {
    const headers = [
      '來源',
      '狀態',
      '姓名',
      '電話',
      'Email',
      'Instagram',
      '想報名的團練',
      '緊急聯絡人',
      '緊急聯絡電話',
      '同行人數',
      '跑步經驗',
      '目標',
      '備註',
      '提交時間',
    ]

    const rows = filteredLeads.map((lead) => [
      sourceLabels[lead.source],
      statusLabels[lead.status],
      lead.name,
      lead.phone,
      lead.email,
      lead.instagram,
      lead.preferred_course,
      lead.emergency_contact_name,
      lead.emergency_contact_phone,
      lead.companion_count,
      lead.running_experience,
      lead.goal,
      lead.notes,
      lead.created_at,
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `haoyun-signups-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <CoachSubNav />

          <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                報名名單
              </p>
              <h1 className="text-3xl font-black text-apple-gray-900 sm:text-5xl">團練報名看板</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-apple-gray-600 sm:text-base sm:leading-7">
                優先查看團練報名，也可查看指派班級的報名與緊急聯絡資料。付款核對統一由管理員處理。
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={loadLeads} className="apple-button-outline inline-flex items-center justify-center gap-2 px-5 py-3">
                <RefreshCw className="h-4 w-4" />
                重新整理
              </button>
              <button
                type="button"
                onClick={exportCsv}
                disabled={filteredLeads.length === 0}
                className="apple-button-primary inline-flex items-center justify-center gap-2 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                匯出 CSV
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 md:grid-cols-5 md:gap-4">
            {[
              ['全部資料', stats.total],
              ['4 週年活動', stats.anniversary],
              ['團練報名', stats.group],
              ['課程報名', stats.coursePayment],
              ['已確認', stats.approved],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-black/10 bg-white p-3 shadow-sm sm:p-5">
                <p className="text-xs text-apple-gray-500 sm:text-sm">{label}</p>
                <p className="mt-2 text-2xl font-black text-apple-gray-900 sm:text-3xl">{value}</p>
              </div>
            ))}
          </div>

          <section className="mt-6 rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:mt-8 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜尋姓名、電話、IG、目標或備註"
                  className="apple-input pl-11"
                />
              </div>

              <label className="relative block">
                <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
                <select value={source} onChange={(event) => setSource(event.target.value as typeof source)} className="apple-input pl-11">
                  <option value="all">全部來源</option>
                  <option value="anniversary_4th">4 週年活動</option>
                  <option value="group_class">團練報名</option>
                  <option value="course_payment">課程報名</option>
                </select>
              </label>

              <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="apple-input">
                <option value="all">全部狀態</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {error ? (
            <div className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
              {message}
            </div>
          ) : null}

          <section className="mt-8">
            {isLoading ? (
              <div className="apple-card p-10 text-center text-apple-gray-600">讀取報名資料中...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="apple-card p-10 text-center">
                <Inbox className="mx-auto h-10 w-10 text-apple-gray-400" />
                <p className="mt-4 text-lg font-bold text-apple-gray-900">還沒有符合條件的資料</p>
                <p className="mt-2 text-sm text-apple-gray-600">表單提交後會出現在這裡。</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredLeads.map((lead) => (
                  <article key={lead.id} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-apple-gray-900 px-3 py-1 text-xs font-bold text-white">
                            {sourceLabels[lead.source]}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[lead.status]}`}>
                            {statusLabels[lead.status]}
                          </span>
                          <span className="text-xs font-semibold text-apple-gray-500">
                            {formatDate(lead.created_at)}
                          </span>
                        </div>
                        <h2 className="text-2xl font-black text-apple-gray-900">{lead.name}</h2>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-apple-gray-600">
                          {lead.phone ? <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 font-semibold hover:text-black"><Phone className="h-3.5 w-3.5" />電話：{lead.phone}</a> : null}
                          {lead.email ? <span>Email：{lead.email}</span> : null}
                          {lead.instagram ? <span>IG：{lead.instagram}</span> : null}
                        </div>
                      </div>

                      {lead.source === 'course_payment' ? <p className="max-w-xs text-xs font-semibold leading-5 text-apple-gray-500">付款與核准狀態請由管理員後台處理。</p> : (
                        <select
                          value={lead.status}
                          disabled={updatingId === lead.id}
                          onChange={(event) => handleStatusChange(lead.id, event.target.value as SignupLead['status'])}
                          className="apple-input w-full lg:w-40"
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {lead.source === 'course_payment' ? (
                      <div className="mt-4 rounded-lg border border-apple-blue/15 bg-apple-blue/5 p-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          {[
                            ['報名課程', lead.preferred_course],
                            ['緊急聯絡人', lead.emergency_contact_name],
                            ['緊急聯絡電話', lead.emergency_contact_phone],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-lg bg-white p-3">
                              <p className="text-xs font-semibold text-apple-gray-500">{label}</p>
                              {label === '緊急聯絡電話' && value ? <a href={`tel:${value}`} className="mt-1 inline-flex items-center gap-1 break-words text-sm font-black text-red-700 underline underline-offset-2"><Phone className="h-3.5 w-3.5" />{value}</a> : <p className="mt-1 break-words text-sm font-bold text-apple-gray-900">{value || '-'}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {[
                        ...(lead.source === 'course_payment' ? [] : [['想報名', lead.preferred_course || lead.companion_count]]),
                        ['跑步經驗', lead.running_experience],
                        ['目標', lead.goal],
                        ['備註', lead.notes],
                      ]
                        .filter(([, value]) => value)
                        .map(([label, value]) => (
                          <div key={label} className="rounded-2xl bg-apple-gray-100 p-4">
                            <p className="text-xs font-semibold text-apple-gray-500">{label}</p>
                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-apple-gray-800">{value}</p>
                          </div>
                        ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}
