'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, CalendarCheck2, Check, Clock3, Loader2, RotateCcw, X } from 'lucide-react'
import {
  courseSessionStart,
  formatAttendanceDate,
  isBeforeCourseStart,
  isCourseSessionAfter,
  nearestUpcomingCourseSession,
  type CourseAttendanceRecord,
  type CourseMakeupRequest,
  type CourseSessionCancellation,
  type StudentAttendanceCourse,
  type StudentAttendanceEnrollment,
} from '@/lib/course-attendance'
import AcceptanceTestCheckin from '@/components/AcceptanceTestCheckin'
import { supabase } from '@/lib/supabase'

type AttendancePayload = {
  season?: { id: string; name: string; code: string; endsOn: string }
  courses?: StudentAttendanceCourse[]
  enrollments?: StudentAttendanceEnrollment[]
  attendance?: CourseAttendanceRecord[]
  makeups?: CourseMakeupRequest[]
  cancellations?: CourseSessionCancellation[]
  message?: string
  error?: string
}

type AttendanceRow = {
  key: string
  enrollment: StudentAttendanceEnrollment
  course: StudentAttendanceCourse
  sessionDate: string
  record?: CourseAttendanceRecord
  makeup?: CourseMakeupRequest
  cancellation?: CourseSessionCancellation
}

const statusLabels = {
  present: '到課',
  excused: '請假',
  deducted: '已扣除',
} as const

async function getAccessToken() {
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  if (!session?.access_token) throw new Error('登入狀態已失效，請重新登入。')
  return session.access_token
}

export default function StudentAttendancePanel() {
  const [payload, setPayload] = useState<AttendancePayload>({})
  const [isLoading, setIsLoading] = useState(true)
  const [busyKey, setBusyKey] = useState('')
  const [editingRequestId, setEditingRequestId] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadAttendance = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/student/attendance', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      })
      const nextPayload = (await response.json().catch(() => ({}))) as AttendancePayload
      if (!response.ok) throw new Error(nextPayload.error || '讀取點名表失敗。')
      setPayload(nextPayload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取點名表失敗。')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAttendance()
  }, [loadAttendance])

  const courses = useMemo(() => payload.courses ?? [], [payload.courses])
  const enrollments = useMemo(() => payload.enrollments ?? [], [payload.enrollments])
  const cancellations = useMemo(() => payload.cancellations ?? [], [payload.cancellations])
  const rows = useMemo<AttendanceRow[]>(() => enrollments.flatMap((enrollment) => {
    const course = courses.find((item) => item.courseSeasonCourseId === enrollment.courseSeasonCourseId)
    if (!course) return []
    return course.sessionDates.map((sessionDate) => ({
      key: `${enrollment.id}:${sessionDate}`,
      enrollment,
      course,
      sessionDate,
      record: payload.attendance?.find((record) => record.enrollment_id === enrollment.id
        && record.course_season_course_id === course.courseSeasonCourseId
        && record.session_date === sessionDate),
      makeup: payload.makeups?.find((request) => request.enrollment_id === enrollment.id
        && request.original_course_season_course_id === course.courseSeasonCourseId
        && request.original_session_date === sessionDate
        && request.status !== 'cancelled'),
      cancellation: cancellations.find((item) => item.course_season_course_id === course.courseSeasonCourseId && item.session_date === sessionDate),
    }))
  }).sort((first, second) => first.sessionDate.localeCompare(second.sessionDate)), [cancellations, courses, enrollments, payload.attendance, payload.makeups])

  const courseNames = useMemo(() => new Map(courses.map((course) => [course.courseSeasonCourseId, course.courseName])), [courses])

  const nearestSessionKeys = useMemo(() => new Map(enrollments.flatMap((enrollment) => {
    const course = courses.find((item) => item.courseSeasonCourseId === enrollment.courseSeasonCourseId)
    if (!course) return []
    const cancelledDates = new Set(cancellations
      .filter((item) => item.course_season_course_id === course.courseSeasonCourseId)
      .map((item) => item.session_date))
    const nearestSessionDate = nearestUpcomingCourseSession(
      course.sessionDates,
      course.classTime,
      cancelledDates,
    )
    return nearestSessionDate ? [[enrollment.id, `${enrollment.id}:${nearestSessionDate}`] as const] : []
  })), [cancellations, courses, enrollments])

  function targetOptions(row: AttendanceRow) {
    return courses.flatMap((course) => {
      if (course.courseSeasonCourseId === row.course.courseSeasonCourseId) return []
      return course.sessionDates.flatMap((sessionDate) => {
        const cancelled = cancellations.some((item) => item.course_season_course_id === course.courseSeasonCourseId && item.session_date === sessionDate)
        const scheduledCount = course.scheduledMakeupCounts[sessionDate] ?? 0
        const isCurrentTarget = row.makeup?.target_course_season_course_id === course.courseSeasonCourseId && row.makeup.target_session_date === sessionDate
        const full = course.approvedCount + scheduledCount >= course.capacity
        const afterOriginalSession = isCourseSessionAfter(
          sessionDate,
          course.classTime,
          row.sessionDate,
          row.course.classTime,
        )
        const withinSeason = !payload.season?.endsOn || sessionDate <= payload.season.endsOn
        if (
          cancelled
          || !afterOriginalSession
          || !withinSeason
          || !isBeforeCourseStart(sessionDate, course.classTime)
          || (full && !isCurrentTarget)
        ) return []
        return [{
          value: `${course.courseSeasonCourseId}|${sessionDate}`,
          label: `${course.courseName}｜${formatAttendanceDate(sessionDate)}｜${course.classTime}`,
          startsAt: courseSessionStart(sessionDate, course.classTime).getTime(),
        }]
      })
    }).sort((first, second) => first.startsAt - second.startsAt || first.label.localeCompare(second.label, 'zh-TW'))
  }

  async function runAction(key: string, body: Record<string, string>) {
    setBusyKey(key)
    setError('')
    setMessage('')
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/student/attendance', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = (await response.json().catch(() => ({}))) as AttendancePayload
      if (!response.ok) throw new Error(result.error || '點名操作失敗。')
      setMessage(result.message || '點名資料已更新。')
      setEditingRequestId('')
      setTargetValue('')
      await loadAttendance()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '點名操作失敗。')
    } finally {
      setBusyKey('')
    }
  }

  function openMakeupPicker(row: AttendanceRow) {
    if (!row.makeup) return
    setEditingRequestId(row.makeup.id)
    setTargetValue(row.makeup.target_course_season_course_id && row.makeup.target_session_date
      ? `${row.makeup.target_course_season_course_id}|${row.makeup.target_session_date}`
      : '')
  }

  if (isLoading && !payload.season) {
    return <section id="attendance" className="apple-card mb-6 scroll-mt-28 p-6"><div className="flex min-h-32 items-center justify-center gap-2 text-sm font-bold text-apple-gray-500"><Loader2 className="h-5 w-5 animate-spin" />正在讀取本季度點名表</div></section>
  }

  return (
    <section id="attendance" className="apple-card mb-6 scroll-mt-28 overflow-hidden">
      <div className="border-b border-black/10 p-5 md:p-6">
        <div>
          <p className="text-sm font-semibold text-apple-blue">{payload.season?.name || '本季度'}</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-black text-apple-gray-900"><CalendarCheck2 className="h-6 w-6" />我的點名表</h2>
          <p className="mt-2 text-sm leading-6 text-apple-gray-600">查看自己的到課紀錄；只能為最近一堂課請假，補課則可選擇原課次之後、本季度內其他班級的可用課次。</p>
        </div>
      </div>

      <AcceptanceTestCheckin role="student" className="m-4 sm:m-5" />

      {error ? <p className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}
      {message ? <p className="m-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p> : null}

      {enrollments.length === 0 ? (
        <div className="p-8 text-center"><CalendarCheck2 className="mx-auto h-8 w-8 text-apple-gray-300" /><p className="mt-3 font-bold text-apple-gray-900">目前沒有以此登入信箱核准的本季度課程。</p><p className="mt-2 text-sm text-apple-gray-500">如報名使用其他信箱，請聯絡管理員協助確認。</p></div>
      ) : (
        <div className="divide-y divide-black/5">
          {rows.map((row, index) => {
            const canChangeBeforeClass = isBeforeCourseStart(row.sessionDate, row.course.classTime)
            const canRequestLeave = nearestSessionKeys.get(row.enrollment.id) === row.key
              && canChangeBeforeClass
              && !row.cancellation
              && !row.record
              && !row.makeup
            const options = targetOptions(row)
            const targetCourseName = row.makeup?.target_course_season_course_id ? courseNames.get(row.makeup.target_course_season_course_id) : ''
            const isEditing = row.makeup?.id === editingRequestId
            const status = row.cancellation ? '停課' : row.record ? statusLabels[row.record.status] : '未點'
            const statusTone = row.cancellation
              ? 'bg-red-50 text-red-700'
              : row.record?.status === 'present'
                ? 'bg-emerald-50 text-emerald-700'
                : row.record?.status === 'excused'
                  ? 'bg-amber-50 text-amber-800'
                  : row.record?.status === 'deducted'
                    ? 'bg-black text-white'
                    : 'bg-apple-gray-100 text-apple-gray-600'
            return (
              <article key={row.key} className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-apple-gray-100 text-xs font-black text-apple-gray-600">{index + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <p className="font-black text-apple-gray-950">{formatAttendanceDate(row.sessionDate)} · {row.course.classTime}</p>
                        <p className="mt-1 text-xs font-semibold text-apple-gray-500">所屬班級：{row.course.courseName}</p>
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusTone}`}>{status}</span>
                    </div>

                    {row.cancellation ? <p className="mt-3 flex items-center gap-2 text-xs font-bold text-red-700"><Ban className="h-3.5 w-3.5" />{row.cancellation.reason || '本堂停課，不需要請假或扣除課次。'}</p> : null}

                    {row.makeup?.status === 'scheduled' && targetCourseName && row.makeup.target_session_date ? (
                      <p className="mt-3 rounded-lg bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-800">補課安排：{targetCourseName}｜{formatAttendanceDate(row.makeup.target_session_date)}</p>
                    ) : row.makeup?.status === 'completed' && targetCourseName && row.makeup.target_session_date ? (
                      <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">補課已完成：{targetCourseName}｜{formatAttendanceDate(row.makeup.target_session_date)}</p>
                    ) : row.makeup?.status === 'forfeited' ? (
                      <p className="mt-3 rounded-lg bg-apple-gray-100 p-3 text-xs font-bold leading-5 text-apple-gray-600">本次補課資格已結束。</p>
                    ) : row.makeup?.status === 'needs_reselection' ? (
                      <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">原補課課次已停課，請重新選擇本季度其他課次。</p>
                    ) : row.makeup?.status === 'leave_requested' ? (
                      <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">請假已成立，尚未選擇補課課次。</p>
                    ) : null}

                    {isEditing && row.makeup ? (
                      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <label className="block"><span className="mb-2 block text-xs font-black text-blue-900">選擇原課次之後、本季度其他班級的補課課次</span><select value={targetValue} onChange={(event) => setTargetValue(event.target.value)} className="apple-input min-h-11 bg-white text-sm"><option value="">請選擇課次</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                        {options.length === 0 ? <p className="mt-2 text-xs font-semibold leading-5 text-blue-800">目前沒有原課次之後、尚未開始且未額滿的本季度補課課次，稍後可再回來查看。</p> : null}
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <button type="button" disabled={!targetValue || Boolean(busyKey)} onClick={() => {
                            const [targetCourseSeasonCourseId, targetSessionDate] = targetValue.split('|')
                            void runAction(`schedule:${row.key}`, { intent: 'schedule_makeup', enrollmentId: row.enrollment.id, requestId: row.makeup!.id, targetCourseSeasonCourseId, targetSessionDate })
                          }} className="apple-button-primary min-h-10 gap-2 px-4 text-sm disabled:opacity-40">{busyKey === `schedule:${row.key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}確認補課</button>
                          <button type="button" onClick={() => { setEditingRequestId(''); setTargetValue('') }} className="apple-button-outline min-h-10 gap-2 px-4 text-sm"><X className="h-4 w-4" />關閉</button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {canRequestLeave ? <button type="button" disabled={Boolean(busyKey)} onClick={() => void runAction(`leave:${row.key}`, { intent: 'request_leave', enrollmentId: row.enrollment.id, sessionDate: row.sessionDate })} className="apple-button-outline min-h-10 gap-2 px-4 text-sm text-amber-800 disabled:opacity-40">{busyKey === `leave:${row.key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}請假</button> : null}
                      {row.makeup && ['leave_requested', 'scheduled', 'needs_reselection'].includes(row.makeup.status) && !isEditing ? <button type="button" onClick={() => openMakeupPicker(row)} className="apple-button-outline min-h-10 gap-2 px-4 text-sm text-blue-700"><RotateCcw className="h-4 w-4" />{row.makeup.status === 'scheduled' ? '更換補課' : '選擇補課'}</button> : null}
                      {row.makeup?.status === 'scheduled' ? <button type="button" disabled={Boolean(busyKey)} onClick={() => void runAction(`cancel-makeup:${row.key}`, { intent: 'cancel_makeup', enrollmentId: row.enrollment.id, requestId: row.makeup!.id })} className="apple-button-outline min-h-10 gap-2 px-4 text-sm disabled:opacity-40"><X className="h-4 w-4" />取消補課</button> : null}
                      {row.makeup && ['leave_requested', 'scheduled', 'needs_reselection'].includes(row.makeup.status) && canChangeBeforeClass ? <button type="button" disabled={Boolean(busyKey)} onClick={() => void runAction(`cancel-leave:${row.key}`, { intent: 'cancel_leave', enrollmentId: row.enrollment.id, requestId: row.makeup!.id })} className="min-h-10 rounded-lg px-3 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40">取消請假</button> : null}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
