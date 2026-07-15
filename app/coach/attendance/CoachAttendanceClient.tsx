'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarCheck2, Check, CircleMinus, Clock3, Loader2, RefreshCw, Save, UsersRound, X } from 'lucide-react'
import CoachSubNav from '@/components/CoachSubNav'
import { supabase } from '@/lib/supabase'

type AttendanceStatus = 'present' | 'absent' | 'excused' | 'unmarked'

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
  name: string
  email: string
  status: string
  billing_start_session_date: string | null
  prior_attendance_claimed: boolean
  attendance_verification_status: string
}

type AttendanceRecord = {
  id: string
  course_season_course_id: string
  session_date: string
  enrollment_id: string
  status: Exclude<AttendanceStatus, 'unmarked'>
  note: string
  marked_at: string
  updated_at: string
}

type AttendancePayload = {
  courses?: AttendanceCourse[]
  enrollments?: Enrollment[]
  attendance?: AttendanceRecord[]
  error?: string
  message?: string
}

type DraftRow = { status: AttendanceStatus; note: string }

const statusOptions: Array<{ value: AttendanceStatus; label: string; icon: typeof Check; tone: string }> = [
  { value: 'present', label: '到課', icon: Check, tone: 'border-emerald-600 bg-emerald-600 text-white' },
  { value: 'absent', label: '未到', icon: X, tone: 'border-red-600 bg-red-600 text-white' },
  { value: 'excused', label: '請假', icon: Clock3, tone: 'border-amber-500 bg-amber-50 text-amber-800' },
  { value: 'unmarked', label: '未點', icon: CircleMinus, tone: 'border-black/15 bg-white text-apple-gray-500' },
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
  const [courseId, setCourseId] = useState('')
  const [sessionDate, setSessionDate] = useState('')
  const [draft, setDraft] = useState<Record<string, DraftRow>>({})
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
      setCourseId(nextCourseId)
      setSessionDate((current) => nextCourse?.sessionDates.includes(current) && current <= taipeiDateKey() ? current : defaultSessionDate(nextCourse))
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
  const roster = useMemo(() => enrollments.filter((enrollment) => enrollment.course_season_course_id === courseId), [courseId, enrollments])
  const savedByEnrollment = useMemo(() => new Map(attendance
    .filter((record) => record.course_season_course_id === courseId && record.session_date === sessionDate)
    .map((record) => [record.enrollment_id, record])), [attendance, courseId, sessionDate])

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
  }, { present: 0, absent: 0, excused: 0, unmarked: 0 } as Record<AttendanceStatus, number>), [draft, roster])

  function selectCourse(nextCourseId: string) {
    const course = courses.find((item) => item.courseSeasonCourseId === nextCourseId)
    setCourseId(nextCourseId)
    setSessionDate(defaultSessionDate(course))
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

  return (
    <main className="min-h-screen bg-apple-gray-50 pt-20 sm:pt-24">
      <section className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <CoachSubNav />

          <header className="mb-6 flex flex-col justify-between gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold text-apple-blue sm:text-sm">課程管理</p>
              <h1 className="mt-1 text-3xl font-black text-black sm:text-4xl">課程點名</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-apple-gray-600">只記錄學員實際到課、未到或請假。系統會自動核對計費起點，收費異常由管理員處理。</p>
            </div>
            <button type="button" title="重新整理" onClick={() => loadAttendance(courseId)} className="apple-button-secondary min-h-10 gap-2 px-4 py-2 text-sm">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />重新整理
            </button>
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
                <label><span className="mb-2 block text-xs font-bold text-apple-gray-500">點名課次</span><select value={sessionDate} onChange={(event) => { setSessionDate(event.target.value); setMessage('') }} className="apple-input">{selectedCourse?.sessionDates.filter((date) => date <= taipeiDateKey()).map((date) => <option key={date} value={date}>第 {selectedCourse.sessionDates.indexOf(date) + 1} 堂｜{formatSessionDate(date)}</option>)}</select></label>
                <div className="md:col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-apple-gray-500"><span>{selectedCourse?.seasonName}</span><span>{selectedCourse?.meetingPoint || selectedCourse?.location}</span><span>名單 {roster.length} 人</span></div>
              </section>

              <div className="my-4 grid grid-cols-4 gap-2">
                {[['到課', counts.present, 'text-emerald-700'], ['未到', counts.absent, 'text-red-700'], ['請假', counts.excused, 'text-amber-700'], ['未點', counts.unmarked, 'text-apple-gray-500']].map(([label, value, tone]) => <div key={String(label)} className="rounded-lg border border-black/10 bg-white p-3 text-center"><p className={`text-xl font-black ${tone}`}>{value}</p><p className="mt-1 text-[11px] font-bold text-apple-gray-500 sm:text-xs">{label}</p></div>)}
              </div>

              <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-black/10 px-4 py-3"><h2 className="flex items-center gap-2 font-black"><UsersRound className="h-4 w-4" />學員名單</h2><span className="text-xs font-bold text-apple-gray-500">{formatSessionDate(sessionDate)}</span></div>
                <div className="divide-y divide-black/5">
                  {roster.map((enrollment) => {
                    const row = draft[enrollment.id] ?? { status: 'unmarked' as const, note: '' }
                    const earlyAttendance = Boolean(enrollment.billing_start_session_date && sessionDate < enrollment.billing_start_session_date && row.status === 'present')
                    const verifiesClaim = enrollment.prior_attendance_claimed && enrollment.billing_start_session_date === sessionDate
                    return (
                      <article key={enrollment.id} className="p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0"><p className="truncate font-black text-black">{enrollment.name || enrollment.email}</p><p className="mt-1 truncate text-xs text-apple-gray-500">{enrollment.email}</p><p className="mt-1 text-xs font-semibold text-apple-gray-500">計費起點：{enrollment.billing_start_session_date ? formatSessionDate(enrollment.billing_start_session_date) : '未設定'}｜付款：{enrollment.status === 'approved' ? '已確認' : '待核對'}</p></div>
                          <div className="grid grid-cols-4 gap-1.5 lg:w-[360px]">
                            {statusOptions.map((option) => {
                              const Icon = option.icon
                              const active = row.status === option.value
                              return <button key={option.value} type="button" aria-pressed={active} onClick={() => updateDraft(enrollment.id, { status: option.value })} className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-md border px-2 text-xs font-bold transition ${active ? option.tone : 'border-black/10 bg-white text-apple-gray-500 hover:bg-apple-gray-50'}`}><Icon className="h-3.5 w-3.5" /><span>{option.label}</span></button>
                            })}
                          </div>
                        </div>
                        {earlyAttendance ? <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs font-bold leading-5 text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />本次到課早於學員選擇的計費起點，儲存後會交由管理員處理補繳或免除。</p> : null}
                        {verifiesClaim ? <p className="mt-3 rounded-md bg-blue-50 p-2.5 text-xs font-bold leading-5 text-blue-800">這堂是學員申報的補繳課次；點名結果會自動完成到課核對。</p> : null}
                        <input value={row.note} onChange={(event) => updateDraft(enrollment.id, { note: event.target.value })} className="apple-input mt-3 min-h-10 text-sm" maxLength={300} placeholder="點名備註（選填）" />
                      </article>
                    )
                  })}
                  {!roster.length ? <p className="p-10 text-center text-sm font-semibold text-apple-gray-500">本班目前沒有待點名的報名學員。</p> : null}
                </div>
              </section>

              <div className="mt-5 flex justify-end"><button type="button" disabled={isSaving || !roster.length || !sessionDate} onClick={saveAttendance} className="apple-button-primary min-h-12 w-full gap-2 px-6 shadow-sm disabled:opacity-40 sm:w-auto">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}儲存本堂點名</button></div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
