'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Filter, Inbox, RefreshCw, Search } from 'lucide-react'
import CoachAccessPanel from '@/components/CoachAccessPanel'
import CoachSubNav from '@/components/CoachSubNav'
import { supabase } from '@/lib/supabase'

type SignupLead = {
  id: string
  source: 'anniversary_4th' | 'group_class'
  name: string
  phone: string
  email: string
  instagram: string
  preferred_course: string
  running_experience: string
  goal: string
  companion_count: string
  notes: string
  status: 'new' | 'contacted' | 'confirmed' | 'closed'
  created_at: string
}

const sourceLabels: Record<SignupLead['source'], string> = {
  anniversary_4th: '4 周年活动',
  group_class: '团练报名',
}

const statusLabels: Record<SignupLead['status'], string> = {
  new: '新资料',
  contacted: '已联系',
  confirmed: '已确认',
  closed: '已关闭',
}

const statusTone: Record<SignupLead['status'], string> = {
  new: 'bg-blue-50 text-blue-700',
  contacted: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-apple-gray-100 text-apple-gray-600',
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
    throw new Error('请先登入教练或管理员账号。')
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
    throw new Error(payload.error || '读取报名资料失败。')
  }

  return payload.leads ?? []
}

async function updateLeadStatus(id: string, status: SignupLead['status']) {
  const token = await getAccessToken()
  if (!token) {
    throw new Error('请先登入教练或管理员账号。')
  }

  const response = await fetch('/api/signup-leads', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, status }),
  })

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    lead?: SignupLead
  }

  if (!response.ok || !payload.lead) {
    throw new Error(payload.error || '更新报名状态失败。')
  }

  return payload.lead
}

export default function CoachSignupsClient() {
  const [leads, setLeads] = useState<SignupLead[]>([])
  const [source, setSource] = useState<'all' | SignupLead['source']>('all')
  const [status, setStatus] = useState<'all' | SignupLead['status']>('all')
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState('')

  const loadLeads = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false)
      setError('Supabase 尚未设置。')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      setLeads(await fetchSignupLeads())
    } catch (loadError) {
      setLeads([])
      setError(loadError instanceof Error ? loadError.message : '读取报名资料失败。')
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
      confirmed: leads.filter((lead) => lead.status === 'confirmed').length,
    }
  }, [leads])

  async function handleStatusChange(id: string, nextStatus: SignupLead['status']) {
    setUpdatingId(id)
    setError('')

    try {
      const updatedLead = await updateLeadStatus(id, nextStatus)
      setLeads((current) => current.map((lead) => (lead.id === id ? updatedLead : lead)))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : '更新报名状态失败。')
    } finally {
      setUpdatingId('')
    }
  }

  function exportCsv() {
    const headers = [
      '来源',
      '状态',
      '姓名',
      '电话',
      'Email',
      'Instagram',
      '想报名的团练',
      '同行人数',
      '跑步经验',
      '目标',
      '备注',
      '提交时间',
    ]

    const rows = filteredLeads.map((lead) => [
      sourceLabels[lead.source],
      statusLabels[lead.status],
      lead.name,
      lead.phone,
      lead.email,
      lead.instagram,
      lead.preferred_course,
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
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <CoachSubNav />

          <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                Signup leads
              </p>
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">报名资料看板</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                集中查看 4 周年活动与团练报名表单，筛选来源、更新跟进状态，并导出 CSV 名单。
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={loadLeads} className="apple-button-outline inline-flex items-center justify-center gap-2 px-5 py-3">
                <RefreshCw className="h-4 w-4" />
                刷新
              </button>
              <button
                type="button"
                onClick={exportCsv}
                disabled={filteredLeads.length === 0}
                className="apple-button-primary inline-flex items-center justify-center gap-2 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                导出 CSV
              </button>
            </div>
          </div>

          <CoachAccessPanel />

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              ['全部资料', stats.total],
              ['4 周年活动', stats.anniversary],
              ['团练报名', stats.group],
              ['已确认', stats.confirmed],
            ].map(([label, value]) => (
              <div key={label} className="apple-card p-5">
                <p className="text-sm text-apple-gray-500">{label}</p>
                <p className="mt-2 text-3xl font-black text-apple-gray-900">{value}</p>
              </div>
            ))}
          </div>

          <section className="mt-8 apple-card p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索姓名、电话、IG、目标或备注"
                  className="apple-input pl-11"
                />
              </div>

              <label className="relative block">
                <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
                <select value={source} onChange={(event) => setSource(event.target.value as typeof source)} className="apple-input pl-11">
                  <option value="all">全部来源</option>
                  <option value="anniversary_4th">4 周年活动</option>
                  <option value="group_class">团练报名</option>
                </select>
              </label>

              <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="apple-input">
                <option value="all">全部状态</option>
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

          <section className="mt-8">
            {isLoading ? (
              <div className="apple-card p-10 text-center text-apple-gray-600">读取报名资料中...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="apple-card p-10 text-center">
                <Inbox className="mx-auto h-10 w-10 text-apple-gray-400" />
                <p className="mt-4 text-lg font-bold text-apple-gray-900">还没有符合条件的资料</p>
                <p className="mt-2 text-sm text-apple-gray-600">表单提交后会出现在这里。</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredLeads.map((lead) => (
                  <article key={lead.id} className="apple-card p-5">
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
                          {lead.phone ? <span>电话：{lead.phone}</span> : null}
                          {lead.email ? <span>Email：{lead.email}</span> : null}
                          {lead.instagram ? <span>IG：{lead.instagram}</span> : null}
                        </div>
                      </div>

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
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {[
                        ['想报名', lead.preferred_course || lead.companion_count],
                        ['跑步经验', lead.running_experience],
                        ['目标', lead.goal],
                        ['备注', lead.notes],
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
