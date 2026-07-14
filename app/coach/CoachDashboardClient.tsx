'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarCheck2, ClipboardList, Mail, MessageSquareText, PencilLine, RefreshCw, UserRound, UsersRound } from 'lucide-react'
import CoachAccessPanel from '@/components/CoachAccessPanel'
import CoachSubNav from '@/components/CoachSubNav'
import { paymentOrderStatusLabels, type PaymentOrderStatus } from '@/lib/payment'
import { supabase } from '@/lib/supabase'
import { getStudentDisplayEmail, getStudentDisplayName, hasStudentName } from '@/lib/student-display'
import type { CoachPublicProfile } from '@/lib/coach-profiles'

type RecentFeedback = {
  id: string
  created_at: string
  rpe: number | null
  feeling: string | null
  status: 'new' | 'flagged' | 'reviewed'
}

type BoundStudentRow = {
  id: string
  active: boolean
  created_at: string
  student: {
    id: string
    name: string
    email: string
    program: string | null
    goal: string | null
    pb: string | null
  } | null
  recentFeedback?: RecentFeedback[]
}

type GroupSignup = {
  id: string
  name: string
  phone: string
  email: string
  instagram: string
  preferred_course: string
  companion_count: string
  status: PaymentOrderStatus
  created_at: string
}

async function getAccessToken() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function fetchCoachWorkspace() {
  const token = await getAccessToken()
  if (!token) throw new Error('請先登入教練或超級管理員帳號。')

  const headers = { Authorization: `Bearer ${token}` }
  const [studentsResponse, signupsResponse, profileResponse] = await Promise.all([
    fetch('/api/coach/students', { cache: 'no-store', headers }),
    fetch('/api/signup-leads?source=group_class', { cache: 'no-store', headers }),
    fetch('/api/coach/profile', { cache: 'no-store', headers }),
  ])

  const studentsPayload = (await studentsResponse.json().catch(() => ({}))) as { students?: BoundStudentRow[]; error?: string }
  const signupsPayload = (await signupsResponse.json().catch(() => ({}))) as { leads?: GroupSignup[]; error?: string }
  const profilePayload = (await profileResponse.json().catch(() => ({}))) as { profile?: CoachPublicProfile; error?: string }

  if (!studentsResponse.ok) throw new Error(studentsPayload.error || '讀取學員失敗。')
  if (!signupsResponse.ok) throw new Error(signupsPayload.error || '讀取團練報名失敗。')
  if (!profileResponse.ok) throw new Error(profilePayload.error || '讀取教練資料失敗。')

  return { students: studentsPayload.students ?? [], signups: signupsPayload.leads ?? [], profile: profilePayload.profile ?? null }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' }).format(new Date(value))
}

export default function CoachDashboardClient() {
  const [students, setStudents] = useState<BoundStudentRow[]>([])
  const [groupSignups, setGroupSignups] = useState<GroupSignup[]>([])
  const [coachProfile, setCoachProfile] = useState<CoachPublicProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await fetchCoachWorkspace()
      setStudents(data.students)
      setGroupSignups(data.signups)
      setCoachProfile(data.profile)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取教練工作台失敗。')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWorkspace()
  }, [loadWorkspace])

  const recentFeedback = useMemo(() => students
    .flatMap((row) => (row.recentFeedback ?? []).map((feedback) => ({ row, feedback })))
    .sort((a, b) => new Date(b.feedback.created_at).getTime() - new Date(a.feedback.created_at).getTime())
    .slice(0, 5), [students])

  const pendingSignups = groupSignups.filter((signup) => signup.status !== 'approved').length
  const statusLabels = paymentOrderStatusLabels['zh-TW']
  const hour = new Date().getHours()
  const greeting = hour < 11 ? '早安' : hour < 18 ? '午安' : '晚安'
  const coachName = coachProfile?.displayName || '教練'

  return (
    <main className="min-h-screen bg-apple-gray-50 pt-20 sm:pt-24">
      <section className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <CoachSubNav />

          <header className="mb-6 border-b border-black/10 pb-6 sm:mb-8 sm:pb-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-black/10 sm:h-20 sm:w-20">
                  {coachProfile?.avatarUrl ? <Image src={coachProfile.avatarUrl} alt={coachName} fill quality={95} sizes="80px" className="object-cover" style={{ objectPosition: `${coachProfile.avatarFocusX}% ${coachProfile.avatarFocusY}%` }} /> : <UserRound className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-apple-gray-300" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-apple-blue sm:text-sm">教練工作台</p>
                  <h1 className="mt-1 truncate text-2xl font-black text-black sm:text-4xl">{greeting}，{coachName}</h1>
                  <p className="mt-2 text-sm leading-6 text-apple-gray-600">今天有 {students.length} 位名下學員，{pendingSignups} 項團練報名待跟進。</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/coach/profile" className="apple-button-secondary min-h-10 gap-2 px-4 py-2 text-sm"><PencilLine className="h-4 w-4" />更換頭像</Link>
                <button type="button" title="重新整理" onClick={loadWorkspace} className="apple-button-secondary min-h-10 gap-2 px-4 py-2 text-sm">
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">重新整理</span>
                </button>
              </div>
            </div>
          </header>

          {error ? <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{error}</p> : null}

          <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-8 sm:grid-cols-4 sm:gap-4">
            {[
              { label: '名下學員', value: students.length, icon: UsersRound },
              { label: '團練報名', value: groupSignups.length, icon: ClipboardList },
              { label: '待跟進', value: pendingSignups, icon: CalendarCheck2 },
              { label: '近期回饋', value: recentFeedback.length, icon: MessageSquareText },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-black/10 bg-white p-3 shadow-sm sm:p-5">
                <Icon className="h-4 w-4 text-apple-gray-500 sm:h-5 sm:w-5" />
                <p className="mt-3 text-2xl font-black text-black sm:text-3xl">{value}</p>
                <p className="mt-1 text-xs font-semibold text-apple-gray-500 sm:text-sm">{label}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 grid gap-5 lg:grid-cols-[360px_1fr]">
            <CoachAccessPanel compact onStudentBound={loadWorkspace} />

            <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-bold text-apple-blue">MY RUNNERS</p><h2 className="mt-1 text-xl font-black text-black sm:text-2xl">名下學員</h2></div>
                <Link href="/coach/students" className="inline-flex items-center gap-1 text-sm font-bold">全部<ArrowRight className="h-4 w-4" /></Link>
              </div>

              {students.length ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {students.slice(0, 6).map((row) => {
                    const student = row.student
                    if (!student) return null
                    return (
                      <Link key={row.id} href="/coach/students" className="flex min-w-0 items-center gap-3 rounded-md bg-apple-gray-100 p-3 transition hover:bg-apple-gray-200">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-black text-white">{(getStudentDisplayName(student) || student.email).charAt(0)}</span>
                        <span className="min-w-0"><span className="block truncate text-sm font-black text-black">{getStudentDisplayName(student) || student.email}</span><span className="mt-0.5 block truncate text-xs text-apple-gray-500">{student.program || student.goal || '尚未填寫目標'}</span></span>
                      </Link>
                    )
                  })}
                </div>
              ) : <p className="mt-4 rounded-md border border-dashed border-black/15 p-5 text-sm leading-6 text-apple-gray-600">尚未綁定學員。請在左側輸入學員註冊信箱完成綁定。</p>}
            </section>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-bold text-apple-blue">GROUP TRAINING</p><h2 className="mt-1 text-xl font-black text-black sm:text-2xl">團練報名</h2></div>
                <Link href="/coach/signups" className="inline-flex items-center gap-1 text-sm font-bold">查看名單<ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="mt-4 space-y-2">
                {groupSignups.slice(0, 6).map((signup) => (
                  <Link key={signup.id} href="/coach/signups" className="flex items-center justify-between gap-3 rounded-md bg-apple-gray-100 p-3">
                    <span className="min-w-0"><span className="block truncate text-sm font-black text-black">{signup.name}</span><span className="mt-0.5 block truncate text-xs text-apple-gray-500">{signup.preferred_course || `同行 ${signup.companion_count || '1'} 人`} · {formatDate(signup.created_at)}</span></span>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-apple-gray-600">{statusLabels[signup.status]}</span>
                  </Link>
                ))}
                {!groupSignups.length ? <p className="rounded-md border border-dashed border-black/15 p-5 text-sm text-apple-gray-600">目前沒有團練報名資料。</p> : null}
              </div>
            </section>

            <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-bold text-apple-blue">RECENT FEEDBACK</p><h2 className="mt-1 text-xl font-black text-black sm:text-2xl">近期學員回饋</h2></div>
                <Link href="/coach/students" className="inline-flex items-center gap-1 text-sm font-bold">學員列表<ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="mt-4 space-y-2">
                {recentFeedback.map(({ row, feedback }) => {
                  const student = row.student
                  if (!student) return null
                  return (
                    <article key={feedback.id} className="rounded-md bg-apple-gray-100 p-3">
                      <div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-black text-black">{getStudentDisplayName(student) || student.email}</p><span className="shrink-0 text-xs font-bold text-apple-gray-500">RPE {feedback.rpe ?? '-'}</span></div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-apple-gray-600">{feedback.feeling || '學員未填寫文字感受。'}</p>
                      {hasStudentName(student) ? <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-apple-gray-400"><Mail className="h-3 w-3" />{getStudentDisplayEmail(student)}</p> : null}
                    </article>
                  )
                })}
                {!recentFeedback.length ? <p className="rounded-md border border-dashed border-black/15 p-5 text-sm text-apple-gray-600">學員提交訓練回饋後會出現在這裡。</p> : null}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}
