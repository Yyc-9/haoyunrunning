'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Ban, CalendarCheck2, Check, CircleMinus, Clock3, Loader2, Phone, RotateCcw, Save, UsersRound } from 'lucide-react'
import CoachSubNav from '@/components/CoachSubNav'
import type { CourseAttendanceStatus, CourseMakeupRequest } from '@/lib/course-attendance'
import { supabase } from '@/lib/supabase'

type AttendanceDraftStatus = CourseAttendanceStatus | 'unmarked'
type AttendanceFilter = CourseAttendanceStatus | 'makeup' | 'unmarked'

type AttendanceCourse = {
  seasonId: string
  seasonName: string
  courseSeasonCourseId: string
  courseSlug: string
  courseName: string
  weekday: string
  location: string
  meetingPoint: string
  sessionDates: string[]
}

type Enrollment = {
  id: string
  season_id: string
  course_season_course_id: string
  course_slug: string
  home_course_name: string
  name: string
  email: string
  status: string
  billing_start_session_date: string | null
  prior_attendance_claimed: boolean
  attendance_verification_status: string
  emergency_contact_name: string
  emergency_contact_phone: string
}

type AttendanceRecord = {
  id: string
  course_season_course_id: string
  session_date: string
  enrollment_id: string
  status: CourseAttendanceStatus
  note: string
  marked_at: string
  updated_at: string
}

type SessionCancellation = {
  id: string
  course_season_course_id: string
  session_date: string
  reason: string
  cancelled_by: string
  cancelled_at: string
}

type AttendancePayload = {
  courses?: AttendanceCourse[]
  enrollments?: Enrollment[]
  attendance?: AttendanceRecord[]
  makeups?: CourseMakeupRequest[]
  cancellations?: SessionCancellation[]
  error?: string
  message?: string
}

type DraftRow = { status: AttendanceDraftStatus; note: string }

const statusOptions: Array<{ value: CourseAttendanceStatus; label: string; icon: typeof Check; tone: string }> = [
  { value: 'present', label: '到課', icon: Check, tone: 'border-emerald-600 bg-emerald-600 text-white' },
  { value: 'excused', label: '請假', icon: Clock3, tone: 'border-amber-500 bg-amber-50 text-amber-800' },
  { value: 'deducted', label: '已扣除', icon: CircleMinus, tone: 'border-black bg-black text-white' },
]

function taipeiDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function formatSessionDate(date: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${date}T12:00:00+08:00`))
}

function defaultSessionDate(course: AttendanceCourse | undefined) {
  if (!course) return ''
  const today = taipeiDateKey()
  return [...course.sessionDates].reverse().find((date) => date <= today) ?? ''
}

async function getAccessToken() {
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  if (!session?.access_token) throw new Error('登入狀態已失效，請重新登入。')
  return session.access_token
}

export default function CoachAttendanceClient() {
  const [courses, setCourses] = useState<AttendanceCourse[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [makeups, setMakeups] = useState<CourseMakeupRequest[]>([])
  const [cancellations, setCancellations] = useState<SessionCancellation[]>([])
  const [courseId, setCourseId] = useState('')
  const [sessionDate, setSessionDate] = useState('')
  const [cancellationReason, setCancellationReason] = useState('')
  const [draft, setDraft] = useState<Record<string, DraftRow>>({})
  const [activeFilter, setActiveFilter] = useState<AttendanceFilter>('unmarked')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadAttendance = useCallback(async (preferredCourseId = '') => {
    setIsLoading(true)
    setError('')
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/coach/attendance', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await response.json().catch(() => ({}))) as AttendancePayload
      if (!response.ok) throw new Error(payload.error || '讀取點名資料失敗。')

      const nextCourses = payload.courses ?? []
      const nextCourseId = nextCourses.some((course) => course.courseSeasonCourseId === preferredCourseId)
        ? preferredCourseId
        : nextCourses[0]?.courseSeasonCourseId ?? ''
      const nextCourse = nextCourses.find((course) => course.courseSeasonCourseId === nextCourseId)
      setCourses(nextCourses)
      setEnrollments(payload.enrollments ?? [])
      setAttendance(payload.attendance ?? [])
      setMakeups(payload.makeups ?? [])
      setCancellations(payload.cancellations ?? [])
      setCourseId(nextCourseId)
      setSessionDate((current) => nextCourse?.sessionDates.includes(current) ? current : defaultSessionDate(nextCourse))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取點名資料失敗。')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAttendance()
  }, [loadAttendance])

  const selectedCourse = courses.find((course) => course.courseSeasonCourseId === courseId)
  const sessionMakeupEnrollmentIds = useMemo(() => new Set(makeups
    .filter((request) => request.target_course_season_course_id === courseId && request.target_session_date === sessionDate && ['scheduled', 'completed', 'forfeited'].includes(request.status))
    .map((request) => request.enrollment_id)), [courseId, makeups, sessionDate])
  const roster = useMemo(() => enrollments.filter((enrollment) => enrollment.course_season_course_id === courseId || sessionMakeupEnrollmentIds.has(enrollment.id)), [courseId, enrollments, sessionMakeupEnrollmentIds])
  const savedByEnrollment = useMemo(() => new Map(attendance
    .filter((record) => record.course_season_course_id === courseId && record.session_date === sessionDate)
    .map((record) => [record.enrollment_id, record])), [attendance, courseId, sessionDate])
  const selectedCancellation = cancellations.find((record) => record.course_season_course_id === courseId && record.session_date === sessionDate)
  const isFutureSession = sessionDate > taipeiDateKey()

  useEffect(() => {
    setCancellationReason(selectedCancellation?.reason ?? '')
  }, [courseId, sessionDate, selectedCancellation?.reason])

  useEffect(() => {
    setDraft(Object.fromEntries(roster.map((enrollment) => {
      const record = savedByEnrollment.get(enrollment.id)
      return [enrollment.id, { status: record?.status ?? 'unmarked', note: record?.note ?? '' }]
    })))
  }, [roster, savedByEnrollment])

  const counts = useMemo(() => roster.reduce((result, enrollment) => {
    const status = draft[enrollment.id]?.status ?? 'unmarked'
    result[status] += 1
    return result
  }, { present: 0, excused: 0, deducted: 0, unmarked: 0 } as Record<CourseAttendanceStatus | 'unmarked', number>), [draft, roster])
  const makeupCount = sessionMakeupEnrollmentIds.size
  const visibleRoster = useMemo(() => roster.filter((enrollment) => activeFilter === 'makeup'
    ? sessionMakeupEnrollmentIds.has(enrollment.id)
    : (draft[enrollment.id]?.status ?? 'unmarked') === activeFilter), [activeFilter, draft, roster, sessionMakeupEnrollmentIds])
  const unsavedCount = useMemo(() => roster.filter((enrollment) => {
    const saved = savedByEnrollment.get(enrollment.id)
    const row = draft[enrollment.id] ?? { status: 'unmarked' as const, note: '' }
    return (saved?.status ?? 'unmarked') !== row.status || (saved?.note ?? '') !== row.note
  }).length, [draft, roster, savedByEnrollment])

  useEffect(() => {
    setActiveFilter('unmarked')
  }, [courseId, sessionDate])

  function selectCourse(nextCourseId: string) {
    const course = courses.find((item) => item.courseSeasonCourseId === nextCourseId)
    setCourseId(nextCourseId)
    setSessionDate(defaultSessionDate(course))
    setActiveFilter('unmarked')
    setMessage('')
  }

  function updateDraft(enrollmentId: string, value: Partial<DraftRow>) {
    setDraft((current) => {
      const existing = current[enrollmentId] ?? { status: 'unmarked' as const, note: '' }
      return { ...current, [enrollmentId]: { ...existing, ...value } }
    })
  }

  async function saveAttendance() {
    if (!courseId || !sessionDate || roster.length === 0) return
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/coach/attendance', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseSeasonCourseId: courseId,
          sessionDate,
          records: roster.map((enrollment) => ({
            enrollmentId: enrollment.id,
            status: draft[enrollment.id]?.status ?? 'unmarked',
            note: draft[enrollment.id]?.note ?? '',
          })),
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as AttendancePayload
      if (!response.ok) throw new Error(payload.error || '儲存點名資料失敗。')
      setMessage(payload.message || '點名結果已儲存。')
      await loadAttendance(courseId)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '儲存點名資料失敗。')
    } finally {
      setIsSaving(false)
    }
  }

  async function setSessionCancellation(cancelled: boolean) {
    if (!courseId || !sessionDate) return
    if (cancelled && !window.confirm(`確定將 ${formatSessionDate(sessionDate)} 標記為停課？`)) return
    if (!cancelled && !window.confirm(`確定恢復 ${formatSessionDate(sessionDate)} 的課程？`)) return

    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/coach/attendance', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'set_session_cancellation',
          courseSeasonCourseId: courseId,
          sessionDate,
          cancelled,
          cancellationReason: cancelled ? cancellationReason : '',
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as AttendancePayload
      if (!response.ok) throw new Error(payload.error || '更新停課狀態失敗。')
      setMessage(payload.message || '停課狀態已更新。')
      await loadAttendance(courseId)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '更新停課狀態失敗。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-apple-gray-50 pt-20 sm:pt-24">
      <section className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <CoachSubNav />

          <header className="mb-6 border-b border-black/10 pb-6">
            <div>
              <p className="text-xs font-bold text-apple-blue sm:text-sm">課程管理</p>
              <h1 className="mt-1 text-3xl font-black text-black sm:text-4xl">課程點名</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-apple-gray-600">本頁只記錄教練對學員出席的現場核實；教練本人到課簽到請回工作台「我的授課日程」完成。兩份紀錄彼此獨立。點名狀態為到課、請假或已扣除，補課學生會依學員安排自動加入本堂名單。</p>
            </div>
          </header>

          {error ? <p className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}
          {message ? <p className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p> : null}

          {isLoading && !courses.length ? (
            <div className="py-20 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin" /><p className="mt-3 text-sm font-semibold text-apple-gray-500">正在讀取課程名單</p></div>
          ) : courses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/15 bg-white p-10 text-center"><CalendarCheck2 className="mx-auto h-8 w-8 text-apple-gray-300" /><p className="mt-3 font-bold">目前沒有指派給你的招生中課程。</p><p className="mt-2 text-sm text-apple-gray-500">請由超級管理員在季度課程中指定教練。</p></div>
          ) : (
            <>
              <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-sm md:grid-cols-2">
                <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">班級</span><select value={courseId} onChange={(event) => selectCourse(event.target.value)} className="apple-input">{courses.map((course) => <option key={course.courseSeasonCourseId} value={course.courseSeasonCourseId}>{course.weekday}｜{course.location}｜{course.courseName}</option>)}</select></label>
                <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">點名課次</span><select value={sessionDate} onChange={(event) => { setSessionDate(event.target.value); setActiveFilter('unmarked'); setMessage('') }} className="apple-input">{selectedCourse?.sessionDates.map((date) => <option key={date} value={date}>第 {selectedCourse.sessionDates.indexOf(date) + 1} 堂｜{formatSessionDate(date)}{date > taipeiDateKey() ? '｜未開始' : ''}</option>)}</select></label>
                <div className="md:col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-apple-gray-500"><span>{selectedCourse?.seasonName}</span><span>{selectedCourse?.meetingPoint || selectedCourse?.location}</span><span>名單 {roster.length} 人</span></div>
              </section>

              <section className={`mt-4 flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-end ${selectedCancellation ? 'border-red-200 bg-red-50' : 'border-black/10 bg-white'}`}>
                <div>
                  <p className="flex items-center gap-2 font-black text-apple-gray-950"><Ban className={`h-4 w-4 ${selectedCancellation ? 'text-red-600' : 'text-apple-gray-400'}`} />{selectedCancellation ? '本堂已停課' : '本堂正常開課'}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-apple-gray-500">{selectedCancellation?.reason || '停課是整堂課的狀態，不需要逐位學員點選。'}</p>
                  {!selectedCancellation ? <input value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} maxLength={300} className="apple-input mt-3 min-h-10 w-full text-sm sm:w-80" placeholder="停課原因（選填）" /> : null}
                </div>
                <button type="button" disabled={isSaving} onClick={() => setSessionCancellation(!selectedCancellation)} className="apple-button-outline min-h-10 shrink-0 gap-2 px-4 text-sm disabled:opacity-40">
                  {selectedCancellation ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}{selectedCancellation ? '恢復開課' : '標記停課'}
                </button>
              </section>

              <div className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {([
                  ['present', '到課', counts.present, 'text-emerald-700'],
                  ['excused', '請假', counts.excused, 'text-amber-700'],
                  ['makeup', '補課學生', makeupCount, 'text-blue-700'],
                  ['unmarked', '未點', counts.unmarked, 'text-apple-gray-500'],
                  ['deducted', '已扣除', counts.deducted, 'text-black'],
                ] as Array<[AttendanceFilter, string, number, string]>).map(([filter, label, value, tone]) => <button type="button" key={filter} aria-pressed={activeFilter === filter} onClick={() => setActiveFilter(filter)} className={`rounded-lg border bg-white p-3 text-center transition hover:border-black/35 ${activeFilter === filter ? 'border-black ring-1 ring-black/10' : 'border-black/10'}`}><p className={`text-xl font-black ${tone}`}>{value}</p><p className="mt-1 text-[11px] font-bold text-apple-gray-500 sm:text-xs">{label}</p></button>)}
              </div>

              <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-black/10 px-4 py-3"><h2 className="flex items-center gap-2 font-black"><UsersRound className="h-4 w-4" />學員名單</h2><span className="text-xs font-bold text-apple-gray-500">{formatSessionDate(sessionDate)} · {visibleRoster.length} 人</span></div>
                <div className="divide-y divide-black/5">
                  {visibleRoster.map((enrollment) => {
                    const row = draft[enrollment.id] ?? { status: 'unmarked' as const, note: '' }
                    const earlyAttendance = Boolean(enrollment.billing_start_session_date && sessionDate < enrollment.billing_start_session_date && row.status === 'present')
                    const verifiesClaim = enrollment.prior_attendance_claimed && enrollment.billing_start_session_date === sessionDate
                    return (
                      <article key={enrollment.id} className="p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <p className="truncate font-black text-black">{enrollment.name || enrollment.email}</p>
                            <p className="mt-1 truncate text-[11px] font-bold text-apple-gray-500">所屬班級：{enrollment.home_course_name}</p>
                            <p className="mt-1 truncate text-xs text-apple-gray-500">{enrollment.email}</p>
                            <p className="mt-1 text-xs font-semibold text-apple-gray-500">計費起點：{enrollment.billing_start_session_date ? formatSessionDate(enrollment.billing_start_session_date) : '未設定'}</p>
                            {enrollment.emergency_contact_name || enrollment.emergency_contact_phone ? <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs font-bold text-red-700"><span>緊急聯絡：{enrollment.emergency_contact_name || '未填姓名'}</span>{enrollment.emergency_contact_phone ? <a href={`tel:${enrollment.emergency_contact_phone}`} className="inline-flex items-center gap-1 underline underline-offset-2"><Phone className="h-3.5 w-3.5" />{enrollment.emergency_contact_phone}</a> : null}</p> : null}
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 lg:w-[300px]">
                            {statusOptions.map((option) => {
                              const Icon = option.icon
                              const active = row.status === option.value
                              return <button key={option.value} type="button" disabled={Boolean(selectedCancellation) || isFutureSession} aria-pressed={active} onClick={() => updateDraft(enrollment.id, { status: active ? 'unmarked' : option.value })} className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-md border px-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? option.tone : 'border-black/10 bg-white text-apple-gray-500 hover:bg-apple-gray-50'}`}><Icon className="h-3.5 w-3.5" /><span>{option.label}</span></button>
                            })}
                          </div>
                        </div>
                        {earlyAttendance ? <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs font-bold leading-5 text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />本次到課早於學員選擇的計費起點，儲存後會交由管理員處理補繳或免除。</p> : null}
                        {verifiesClaim ? <p className="mt-3 rounded-md bg-blue-50 p-2.5 text-xs font-bold leading-5 text-blue-800">這堂是學員申報的補繳課次；點名結果會自動完成到課核對。</p> : null}
                        <input disabled={Boolean(selectedCancellation) || isFutureSession} value={row.note} onChange={(event) => updateDraft(enrollment.id, { note: event.target.value })} className="apple-input mt-3 min-h-10 text-sm disabled:cursor-not-allowed disabled:opacity-50" maxLength={300} placeholder={isFutureSession ? '課次尚未開始' : '點名備註（選填）'} />
                      </article>
                    )
                  })}
                  {!visibleRoster.length ? <p className="p-10 text-center text-sm font-semibold text-apple-gray-500">{activeFilter === 'unmarked' ? '本堂所有學員皆已完成點名。' : '目前沒有符合此篩選的學員。'}</p> : null}
                </div>
              </section>

              <div className="mt-5 flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center"><p className="text-center text-xs font-bold text-apple-gray-500 sm:text-left">{isFutureSession ? '課次開始後才可點名' : unsavedCount > 0 ? `尚有 ${unsavedCount} 筆未儲存變更` : '目前沒有未儲存變更'}</p><button type="button" disabled={isSaving || !roster.length || !sessionDate || Boolean(selectedCancellation) || isFutureSession || unsavedCount === 0} onClick={saveAttendance} className="apple-button-primary min-h-12 w-full gap-2 px-6 shadow-sm disabled:opacity-40 sm:w-auto">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}儲存本堂紀錄</button></div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
