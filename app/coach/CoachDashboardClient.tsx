'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarCheck2, ClipboardList, LockKeyhole, RefreshCw, UsersRound } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { useLanguage } from '@/app/language-context'
import CoachSubNav from '@/components/CoachSubNav'
import { coachRosterSummary, type CoachRosterPayload } from '@/lib/coach-roster'
import CoachDutyPanel from '@/app/coach/attendance/CoachDutyPanel'
import { paymentOrderStatusLabels, type PaymentOrderStatus } from '@/lib/payment'
import { supabase } from '@/lib/supabase'
import type { CoachPublicProfile } from '@/lib/coach-profiles'

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

async function fetchCoachWorkspace(seasonId: string) {
  const token = await getAccessToken()
  if (!token) throw new Error('請先登入教練或超級管理員帳號。')

  const headers = { Authorization: `Bearer ${token}` }
  const [rosterResponse, signupsResponse, profileResponse] = await Promise.all([
    fetch(`/api/coach/roster${seasonId ? `?seasonId=${encodeURIComponent(seasonId)}` : ''}`, { cache: 'no-store', headers }),
    fetch('/api/signup-leads?source=group_class', { cache: 'no-store', headers }),
    fetch('/api/coach/profile', { cache: 'no-store', headers }),
  ])

  const rosterPayload = (await rosterResponse.json().catch(() => ({}))) as CoachRosterPayload & { error?: string }
  const signupsPayload = (await signupsResponse.json().catch(() => ({}))) as { leads?: GroupSignup[]; error?: string }
  const profilePayload = (await profileResponse.json().catch(() => ({}))) as { profile?: CoachPublicProfile; error?: string }

  if (!rosterResponse.ok) throw new Error(rosterPayload.error || '讀取班級名單失敗。')
  if (!signupsResponse.ok) throw new Error(signupsPayload.error || '讀取團練報名失敗。')
  if (!profileResponse.ok) throw new Error(profilePayload.error || '讀取教練資料失敗。')

  return { roster: rosterPayload, signups: signupsPayload.leads ?? [], profile: profilePayload.profile ?? null }
}

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language, { month: 'numeric', day: 'numeric' }).format(new Date(value))
}

export default function CoachDashboardClient() {
  const { language } = useLanguage()
  const { user, isLoading: isAuthLoading } = useAuth()
  const [roster, setRoster] = useState<CoachRosterPayload | null>(null)
  const [seasonId, setSeasonId] = useState('')
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true)
  const latestRequest = useRef(0)
  const [groupSignups, setGroupSignups] = useState<GroupSignup[]>([])
  const [coachProfile, setCoachProfile] = useState<CoachPublicProfile | null>(null)
  const [error, setError] = useState('')
  const hasCoachAccess = user?.role === 'coach' || user?.role === 'admin'

  const loadWorkspace = useCallback(async () => {
    const requestId = ++latestRequest.current
    setIsWorkspaceLoading(true)
    setError('')
    try {
      const data = await fetchCoachWorkspace(seasonId)
      if (requestId !== latestRequest.current) return
      setRoster(data.roster)
      setGroupSignups(data.signups)
      setCoachProfile(data.profile)
    } catch (loadError) {
      if (requestId !== latestRequest.current) return
      setError(loadError instanceof Error ? loadError.message : '讀取教練工作台失敗。')
    } finally {
      if (requestId === latestRequest.current) setIsWorkspaceLoading(false)
    }
  }, [seasonId])

  useEffect(() => {
    if (isAuthLoading) return
    if (!hasCoachAccess) return
    loadWorkspace()
  }, [hasCoachAccess, isAuthLoading, loadWorkspace])

  const summary = coachRosterSummary(roster?.courses ?? [])
  const ownCourses = roster?.courses.filter(course => course.isOwn) ?? []
  const statusLabels = paymentOrderStatusLabels['zh-TW']
  const hour = new Date().getHours()
  const greeting = hour < 11 ? '早安' : hour < 18 ? '午安' : '晚安'
  const coachName = coachProfile?.displayName || '教練'

  if (isAuthLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-apple-gray-50 pt-24"><RefreshCw className="h-7 w-7 animate-spin text-apple-gray-400" /></div>
  }

  if (!hasCoachAccess) {
    return (
      <div className="min-h-screen bg-apple-gray-50 pt-20 sm:pt-24">
        <section className="container mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="rounded-lg border border-black/10 bg-white p-6 text-center shadow-sm sm:p-10">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <p className="mt-5 text-xs font-black text-apple-blue">COACH ACCESS</p>
            <h1 className="mt-2 text-2xl font-black text-black sm:text-3xl">此頁面只供已認證教練使用</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-apple-gray-600">教練信箱由管理員登記後，使用該信箱正常登入即可，不需要認證碼。若剛完成登記，請先確認信箱驗證，再重新登入。</p>
            <Link href="/profile" className="apple-button-primary mt-6 inline-flex gap-2 px-6 py-3">
              前往個人帳戶
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-apple-gray-50 pt-20 sm:pt-24">
      <section className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <CoachSubNav />

          <header className="mb-3 flex flex-col justify-between gap-4 border-b border-black/10 pb-3 sm:mb-8 sm:flex-row sm:items-end sm:pb-8">
            <div className="min-w-0">
              <p className="text-xs font-bold text-apple-blue sm:text-sm">教練工作台</p>
              <h1 className="mt-1 truncate text-2xl font-black text-black sm:text-4xl">{greeting}{language === 'en' ? ', ' : '，'}{coachName}</h1>
              <p className="mt-2 hidden text-sm leading-6 text-apple-gray-600 sm:block">{language === 'en'
                ? `${summary.classCount} assigned classes · ${summary.registeredCount} registrations this quarter.`
                : `本季負責 ${summary.classCount} 個班級，共 ${summary.registeredCount} 人次報名。`}</p>
            </div>
            <label className="flex items-center gap-3 text-sm font-bold">{language === 'en' ? 'Quarter' : '季度'}
              <select aria-label={language === 'en' ? 'Quarter' : '季度'} value={seasonId || roster?.selectedSeasonId || ''} disabled={isWorkspaceLoading || !roster?.seasons.length} onChange={event => setSeasonId(event.target.value)} className="min-h-11 rounded-lg border border-black/15 bg-white px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-apple-blue">
                {!roster?.seasons.length && <option value="">{language === 'en' ? 'Loading…' : '讀取中…'}</option>}
                {roster?.seasons.map(season => <option key={season.id} value={season.id}>{season.name}{season.status === 'archived' ? (language === 'en' ? ' · Archived' : ' · 已封存') : ''}</option>)}
              </select>
            </label>
          </header>

          {error ? <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{error}</p> : null}

          <CoachDutyPanel />

          <div className="my-5 grid grid-cols-2 gap-3 sm:my-8 sm:grid-cols-4 sm:gap-4">
            {[
              { label: language === 'en' ? 'My classes' : '我的班級', value: summary.classCount, icon: CalendarCheck2 },
              { label: language === 'en' ? 'Registrations' : '已報名（人次）', value: summary.registeredCount, icon: UsersRound },
              { label: language === 'en' ? 'Payment confirmed' : '已確認入帳', value: summary.approvedCount, icon: ClipboardList },
              { label: language === 'en' ? 'Awaiting confirmation' : '尚未確認入帳', value: summary.pendingCount, icon: RefreshCw },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-black/10 bg-white p-3 shadow-sm sm:p-5">
                <Icon className="h-4 w-4 text-apple-gray-500 sm:h-5 sm:w-5" />
                <p className="mt-3 text-2xl font-black text-black sm:text-3xl">{isWorkspaceLoading ? '—' : value}</p>
                <p className="mt-1 text-xs font-semibold text-apple-gray-500 sm:text-sm">{label}</p>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-bold text-apple-blue">MY CLASSES</p><h2 className="mt-1 text-xl font-black text-black sm:text-2xl">{language === 'en' ? 'My class registrations' : '我的班級報名'}</h2></div>
                <Link href={`/coach/students${roster?.selectedSeasonId ? `?seasonId=${roster.selectedSeasonId}` : ''}`} className="inline-flex items-center gap-1 text-sm font-bold">{language === 'en' ? 'All rosters' : '查看名單'}<ArrowRight className="h-4 w-4" /></Link>
              </div>

              <p className="mt-3 text-sm leading-6 text-apple-gray-600">{language === 'en' ? 'Includes all registrations, before and after payment confirmation. Each class counts its own registrations.' : '包含已核帳與尚未核帳的所有報名；同一人報名不同班級，各班分別計數。'}</p>
              {isWorkspaceLoading ? <p role="status" className="mt-4 text-sm text-apple-gray-500">{language === 'en' ? 'Loading class rosters…' : '正在讀取班級名單…'}</p> : ownCourses.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ownCourses.map(course => <Link key={course.id} href={`/coach/students?seasonId=${roster!.selectedSeasonId}&courseId=${course.id}`} className="rounded-lg border border-black/10 bg-white p-4 motion-safe:transition-colors hover:bg-blue-50">
                    <span className="flex items-start justify-between gap-3"><span className="text-sm font-black leading-6">{course.name}</span><ArrowRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" /></span>
                    <span className="mt-3 block text-sm"><strong className="mr-1 text-3xl font-black">{course.registeredCount}</strong>{language === 'en' ? 'registered' : '位已報名'}</span>
                    <span className="mt-2 block text-xs leading-5 text-apple-gray-500">{language === 'en' ? 'Confirmed' : '已入帳'} {course.paymentCounts?.approved ?? 0} · {language === 'en' ? 'Review' : '待核對'} {course.paymentCounts?.pending_review ?? 0} · {language === 'en' ? 'Transfer' : '待匯款'} {course.paymentCounts?.pending_transfer ?? 0}</span>
                  </Link>)}
                </div>
              ) : <p className="mt-4 rounded-md border border-dashed border-black/15 p-5 text-sm leading-6 text-apple-gray-600">{language === 'en' ? 'No assigned classes this quarter. Other class rosters are available in Student roster.' : '這個季度尚未安排你的任課班級，可到學員列表查看其他班級名單。'}</p>}
            </section>
          </div>

          <div>
            <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-bold text-apple-blue">GROUP TRAINING</p><h2 className="mt-1 text-xl font-black text-black sm:text-2xl">團練報名</h2></div>
                <Link href="/coach/signups" className="inline-flex items-center gap-1 text-sm font-bold">查看名單<ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="mt-4 space-y-2">
                {groupSignups.slice(0, 6).map((signup) => (
                  <Link key={signup.id} href="/coach/signups" className="flex items-center justify-between gap-3 rounded-md bg-apple-gray-100 p-3">
                    <span className="min-w-0"><span className="block truncate text-sm font-black text-black">{signup.name}</span><span className="mt-0.5 block truncate text-xs text-apple-gray-500">{signup.preferred_course || (language === 'en' ? `Party of ${signup.companion_count || '1'}` : `同行 ${signup.companion_count || '1'} 人`)} · {formatDate(signup.created_at, language)}</span></span>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-apple-gray-600">{statusLabels[signup.status]}</span>
                  </Link>
                ))}
                {!groupSignups.length ? <p className="rounded-md border border-dashed border-black/15 p-5 text-sm text-apple-gray-600">目前沒有團練報名資料。</p> : null}
              </div>
            </section>

          </div>
        </div>
      </section>
    </div>
  )
}
