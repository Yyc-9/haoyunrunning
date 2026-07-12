'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ExternalLink, FileText, Loader2, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { useSiteContent } from '@/app/site-content-provider'
import { COURSE_CAPACITY, type CourseAvailability, type LegacyStudentStatus, type MyCourseEnrollment } from '@/lib/course-registration'
import { paymentOrderStatusLabels } from '@/lib/payment'
import { supabase } from '@/lib/supabase'
import DirectCourseRegistrationForm from './DirectCourseRegistrationForm'

type RegistrationPayload = {
  availability?: CourseAvailability
  enrollment?: MyCourseEnrollment | null
  legacyStudent?: LegacyStudentStatus | null
  error?: string
}

const statusTone = {
  pending_transfer: 'border-amber-200 bg-amber-50 text-amber-800',
  pending_review: 'border-blue-200 bg-blue-50 text-blue-800',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
} as const

export default function CourseRegistrationClient({ slug, returnedFromGoogle = false }: { slug: string; returnedFromGoogle?: boolean }) {
  const { courses } = useSiteContent()
  const { user, isLoggedIn, isLoading: isAuthLoading } = useAuth()
  const course = useMemo(() => courses.find((item) => item.slug === slug), [courses, slug])
  const [availability, setAvailability] = useState<CourseAvailability | null>(null)
  const [enrollment, setEnrollment] = useState<MyCourseEnrollment | null>(null)
  const [legacyStudent, setLegacyStudent] = useState<LegacyStudentStatus>({ matched: false, name: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirmingReturn, setIsConfirmingReturn] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [transferLastFive, setTransferLastFive] = useState('')
  const [notes, setNotes] = useState('')
  const confirmationAttemptedRef = useRef(false)

  const loadRegistration = useCallback(async () => {
    if (!course) return
    setError('')

    try {
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
      const response = await fetch(`/api/course-enrollments?courseSlug=${encodeURIComponent(course.slug)}`, {
        cache: 'no-store',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      })
      const payload = (await response.json().catch(() => ({}))) as RegistrationPayload
      if (!response.ok || !payload.availability) throw new Error(payload.error || '讀取報名狀態失敗。')

      setAvailability(payload.availability)
      setEnrollment(payload.enrollment ?? null)
      setLegacyStudent(payload.legacyStudent ?? { matched: false, name: '' })
      if (payload.enrollment?.transferLastFive) setTransferLastFive(payload.enrollment.transferLastFive)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取報名狀態失敗。')
    } finally {
      setIsLoading(false)
    }
  }, [course])

  useEffect(() => {
    if (!course || isAuthLoading) return
    loadRegistration()
    const timer = window.setInterval(loadRegistration, 20_000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadRegistration()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [course, isAuthLoading, loadRegistration, user?.email])

  const confirmGoogleFormReturn = useCallback(async () => {
    if (!course) return
    setError('')
    setSuccess('')
    setIsConfirmingReturn(true)

    try {
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
      if (!session?.access_token) throw new Error('請先登入後再建立待付款記錄。')

      const response = await fetch('/api/course-enrollments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intent: 'confirm_form_submission', courseSlug: course.slug }),
      })
      const payload = (await response.json().catch(() => ({}))) as RegistrationPayload
      if (!response.ok || !payload.enrollment) throw new Error(payload.error || '建立待付款記錄失敗。')

      setEnrollment(payload.enrollment)
      setSuccess('已建立待付款記錄。完成匯款後，請填寫付款帳號後五碼。')
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : '建立待付款記錄失敗。')
    } finally {
      setIsConfirmingReturn(false)
    }
  }, [course])

  useEffect(() => {
    if (
      !returnedFromGoogle ||
      isAuthLoading ||
      !isLoggedIn ||
      isLoading ||
      enrollment ||
      confirmationAttemptedRef.current
    ) return

    confirmationAttemptedRef.current = true
    confirmGoogleFormReturn()
  }, [confirmGoogleFormReturn, enrollment, isAuthLoading, isLoading, isLoggedIn, returnedFromGoogle])

  async function submitTransfer() {
    if (!enrollment) return
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
      if (!session?.access_token) throw new Error('請先登入後再提交付款資料。')

      const response = await fetch('/api/course-enrollments', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId: enrollment.id, transferLastFive, notes }),
      })
      const payload = (await response.json().catch(() => ({}))) as RegistrationPayload
      if (!response.ok || !payload.enrollment) throw new Error(payload.error || '付款資料提交失敗。')

      setEnrollment(payload.enrollment)
      setSuccess('付款資料已送出，管理員核對後會更新為已付款。')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '付款資料提交失敗。')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!course) {
    return (
      <main className="min-h-screen bg-apple-gray-50 px-4 pt-32">
        <div className="mx-auto max-w-xl rounded-lg border border-black/10 bg-white p-8 text-center">
          <h1 className="text-2xl font-black">找不到這個課程</h1>
          <Link href="/courses" className="apple-button-primary mt-6">返回課程列表</Link>
        </div>
      </main>
    )
  }

  const remaining = availability?.remaining ?? COURSE_CAPACITY
  const isFull = availability?.full === true
  const canSubmitTransfer = enrollment && ['pending_transfer', 'rejected'].includes(enrollment.status)
  const usesDirectRegistration = course.slug === 'zhubei-night-run-monday'

  return (
    <main className="min-h-screen bg-apple-gray-50 pt-20">
      <header className="border-b border-black/10 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Link href={`/courses/${course.slug}`} className="text-sm font-bold text-apple-blue">返回課程詳情</Link>
          <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold text-apple-gray-500">{course.weekday} · {course.location}{course.meetingPoint ? ` · ${course.meetingPoint}` : ''} · {course.period}</p>
              <h1 className="mt-2 text-2xl font-black text-apple-gray-950 sm:text-4xl">{course.name}報名</h1>
            </div>
            <div className={`shrink-0 rounded-lg border px-4 py-3 ${isFull ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
              <p className="text-xs font-bold">班額 {COURSE_CAPACITY} 人</p>
              <p className="mt-1 text-lg font-black">{isLoading ? '讀取中' : isFull ? '目前額滿' : `剩餘 ${remaining} 位`}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className={`rounded-lg border border-black/10 bg-white ${usesDirectRegistration ? 'overflow-hidden' : 'p-6 sm:p-8'}`}>
          {isFull ? (
            <div className="py-10 text-center">
              <h2 className="text-xl font-black text-apple-gray-950">本班目前已額滿</h2>
              <p className="mt-2 text-sm text-apple-gray-600">如有釋出名額，這裡會自動恢復報名。</p>
            </div>
          ) : usesDirectRegistration ? (
            isAuthLoading || isLoading ? (
              <div className="flex min-h-[360px] items-center justify-center gap-2 text-sm font-bold text-apple-gray-500"><Loader2 className="h-5 w-5 animate-spin" />正在準備報名表</div>
            ) : !isLoggedIn ? (
              <div className="px-6 py-12 text-center sm:px-10">
                <ShieldCheck className="mx-auto h-10 w-10 text-apple-blue" />
                <h2 className="mt-5 text-2xl font-black">登入後填寫網站報名表</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-apple-gray-600">網站會使用登入信箱建立報名記錄，避免重複報名並讓你隨時查看付款審核狀態。</p>
                <Link href={`/courses/${course.slug}/register?auth=login`} className="apple-button-primary mt-6 w-full sm:w-fit">登入並開始填寫</Link>
              </div>
            ) : enrollment ? (
              <div className="px-6 py-12 text-center sm:px-10">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                <h2 className="mt-5 text-2xl font-black">已收到你的報名資料</h2>
                <p className="mt-3 text-sm leading-6 text-apple-gray-600">目前狀態可在右側查看，管理員核對款項後會更新結果。</p>
              </div>
            ) : (
              <DirectCourseRegistrationForm
                key={`${user?.email ?? ''}:${legacyStudent.matched}:${legacyStudent.name}`}
                course={course}
                userEmail={user?.email ?? ''}
                legacyStudent={legacyStudent}
                onSubmitted={(submittedEnrollment) => {
                  setEnrollment(submittedEnrollment)
                  setSuccess('報名與付款資料已送出，管理員核對後會更新為已付款。')
                }}
              />
            )
          ) : course.signupUrl ? (
            <div className="flex min-h-[320px] flex-col justify-between gap-8">
              <div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-apple-blue/10 text-apple-blue"><FileText className="h-5 w-5" /></span>
                <h2 className="mt-5 text-2xl font-black text-apple-gray-950">官方 Google 報名表</h2>
                <p className="mt-3 max-w-xl text-base leading-7 text-apple-gray-600">使用與網站帳號相同的電子信箱填寫。送出表單並返回本站後，請點擊下方按鈕建立待付款記錄。</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a href={course.signupUrl} target="_blank" rel="noreferrer" className="apple-button-primary w-full gap-2 px-6 py-3 sm:w-fit">
                  填寫 Google 報名表 <ExternalLink className="h-4 w-4" />
                </a>
                {isLoggedIn ? (
                  <button type="button" disabled={isConfirmingReturn || Boolean(enrollment)} onClick={confirmGoogleFormReturn} className="apple-button-outline w-full gap-2 px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit">
                    {isConfirmingReturn ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {enrollment ? '已建立報名記錄' : '我已完成表單'}
                  </button>
                ) : (
                  <Link href={`/courses/${course.slug}/register?submitted=1&auth=login`} className="apple-button-outline w-full gap-2 px-6 py-3 sm:w-fit">
                    <CheckCircle2 className="h-4 w-4" />我已完成表單
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-apple-gray-600">管理員尚未設定這門課程的 Google 表單。</div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="rounded-lg border border-black/10 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-apple-blue" />
                <h2 className="font-black text-apple-gray-950">我的報名狀態</h2>
              </div>
              <button type="button" title="更新狀態" onClick={loadRegistration} className="rounded-lg p-2 text-apple-gray-500 hover:bg-apple-gray-100 hover:text-black">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {returnedFromGoogle && !usesDirectRegistration ? (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-800">
                {isConfirmingReturn
                  ? '正在建立待付款記錄…'
                  : isLoggedIn
                    ? '已從 Google 表單返回，系統會以目前登入信箱建立待付款記錄。'
                    : '已從 Google 表單返回，登入後即可建立待付款記錄。'}
              </div>
            ) : null}

            {isAuthLoading || isLoading || isConfirmingReturn ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-apple-gray-600"><Loader2 className="h-4 w-4 animate-spin" />正在同步狀態</div>
            ) : !isLoggedIn ? (
              <div className="mt-5">
                <p className="text-sm leading-6 text-apple-gray-600">{usesDirectRegistration ? '請先登入，再於網站內填寫報名與付款資料。' : '填完表單後，請使用表單內相同的信箱登入，系統才會顯示你的付款狀態。'}</p>
                <Link href={usesDirectRegistration ? `/courses/${course.slug}/register?auth=login` : `/courses/${course.slug}/register?submitted=1&auth=login`} className="apple-button-primary mt-4 w-full">登入查看狀態</Link>
              </div>
            ) : !enrollment ? (
              <div className="mt-5">
                <p className="text-sm leading-6 text-apple-gray-600">
                  {usesDirectRegistration
                    ? `尚未收到 ${user?.email} 的報名資料，完成左側網站表單後會顯示在這裡。`
                    : returnedFromGoogle
                    ? `尚未建立 ${user?.email} 的待付款記錄，請重新確認。`
                    : `尚未找到 ${user?.email} 的報名記錄。完成 Google 表單後，請點擊「我已完成表單」。`}
                </p>
                {usesDirectRegistration ? null : (
                  <button type="button" disabled={isConfirmingReturn} onClick={confirmGoogleFormReturn} className="apple-button-primary mt-4 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                    {isConfirmingReturn ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    我已完成表單
                  </button>
                )}
                <button type="button" onClick={loadRegistration} className={`apple-button-outline w-full gap-2 ${usesDirectRegistration ? 'mt-4' : 'mt-3'}`}><RefreshCw className="h-4 w-4" />重新檢查狀態</button>
              </div>
            ) : (
              <div className="mt-5">
                <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${statusTone[enrollment.status]}`}>
                  {paymentOrderStatusLabels['zh-TW'][enrollment.status]}
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div><dt className="text-apple-gray-500">報名課程</dt><dd className="mt-1 font-bold text-apple-gray-900">{enrollment.courseName}</dd></div>
                  <div><dt className="text-apple-gray-500">應付金額</dt><dd className="mt-1 font-bold text-apple-gray-900">{enrollment.amountText || '依表單說明'}</dd></div>
                  {enrollment.reviewNote ? <div><dt className="text-apple-gray-500">核對說明</dt><dd className="mt-1 font-bold text-apple-gray-900">{enrollment.reviewNote}</dd></div> : null}
                </dl>
              </div>
            )}
          </section>

          {canSubmitTransfer ? (
            <section className="rounded-lg border border-black/10 bg-white p-5">
              <div className="flex items-center gap-2"><WalletCards className="h-5 w-5" /><h2 className="font-black">完成匯款後回報</h2></div>
              <p className="mt-2 text-sm leading-6 text-apple-gray-600">依 Google 表單內的收款資料完成匯款，再填寫付款帳號後五碼。</p>
              <label className="mt-4 block">
                <span className="mb-2 block text-xs font-bold text-apple-gray-500">付款帳號後五碼</span>
                <input inputMode="numeric" maxLength={5} value={transferLastFive} onChange={(event) => setTransferLastFive(event.target.value.replace(/\D/g, '').slice(0, 5))} className="apple-input" placeholder="例如 12345" />
              </label>
              <label className="mt-3 block">
                <span className="mb-2 block text-xs font-bold text-apple-gray-500">備註（選填）</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="apple-input min-h-20 resize-y" placeholder="可填寫匯款時間；請勿輸入完整帳號或信用卡資料" />
              </label>
              <button type="button" disabled={isSubmitting || transferLastFive.length !== 5} onClick={submitTransfer} className="apple-button-primary mt-4 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-40">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                確認已付款
              </button>
            </section>
          ) : null}

          {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{success}</p> : null}
          {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
        </aside>
      </div>
    </main>
  )
}
