'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock3, Loader2, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useAuth } from '@/app/providers'
import type { MyCourseEnrollment } from '@/lib/course-registration'
import {
  paymentOrderStatusDescriptions,
  paymentOrderStatusLabels,
  type PaymentOrderStatus,
} from '@/lib/payment'
import { supabase } from '@/lib/supabase'

const statusTone: Record<PaymentOrderStatus, string> = {
  pending_transfer: 'border-amber-200 bg-amber-50 text-amber-900',
  pending_review: 'border-blue-200 bg-blue-50 text-blue-900',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  rejected: 'border-red-200 bg-red-50 text-red-900',
}

const statusIcon: Record<PaymentOrderStatus, React.ElementType> = {
  pending_transfer: Clock3,
  pending_review: RefreshCw,
  approved: CheckCircle2,
  rejected: TriangleAlert,
}

function formatDate(value: string | null) {
  if (!value) return '尚未提交'
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function PaymentStatusClient() {
  const { isLoggedIn, isLoading: isAuthLoading } = useAuth()
  const [enrollments, setEnrollments] = useState<MyCourseEnrollment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadEnrollments = useCallback(async () => {
    if (!isLoggedIn) {
      setEnrollments([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
      if (!session?.access_token) throw new Error('登入狀態已失效，請重新登入。')

      const response = await fetch('/api/course-enrollments/mine', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const payload = (await response.json().catch(() => ({}))) as {
        enrollments?: MyCourseEnrollment[]
        error?: string
      }
      if (!response.ok) throw new Error(payload.error || '匯款狀態讀取失敗。')
      setEnrollments(payload.enrollments ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '匯款狀態讀取失敗。')
    } finally {
      setIsLoading(false)
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (isAuthLoading) return
    void loadEnrollments()
  }, [isAuthLoading, loadEnrollments])

  const counts = useMemo(() => (
    enrollments.reduce<Record<PaymentOrderStatus, number>>((result, enrollment) => {
      result[enrollment.status] += 1
      return result
    }, { pending_transfer: 0, pending_review: 0, approved: 0, rejected: 0 })
  ), [enrollments])

  return (
    <main className="min-h-screen bg-gradient-to-b from-apple-gray-50 to-white pt-24">
      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold text-apple-blue">課程報名</p>
              <h1 className="mt-2 text-3xl font-black text-apple-gray-950 sm:text-5xl">我的匯款狀態</h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-apple-gray-600 sm:text-base">
                查看課程應匯金額、後五碼提交狀態與財務核對結果。網站不會保存完整銀行帳號、網銀密碼或信用卡資料。
              </p>
            </div>
            {isLoggedIn ? (
              <button type="button" disabled={isLoading} onClick={loadEnrollments} className="apple-button-outline w-full gap-2 sm:w-fit">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />重新整理
              </button>
            ) : null}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(statusTone) as PaymentOrderStatus[]).map((status) => {
              const Icon = statusIcon[status]
              return (
                <div key={status} className={`rounded-lg border p-4 ${statusTone[status]}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black">{paymentOrderStatusLabels['zh-TW'][status]}</p>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-2 text-2xl font-black">{counts[status]}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 opacity-80">{paymentOrderStatusDescriptions[status]}</p>
                </div>
              )
            })}
          </div>

          {isAuthLoading || isLoading ? (
            <div className="mt-8 flex min-h-64 items-center justify-center gap-2 rounded-lg border border-black/10 bg-white text-sm font-bold text-apple-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />正在讀取匯款狀態
            </div>
          ) : !isLoggedIn ? (
            <div className="mt-8 rounded-lg border border-black/10 bg-white px-6 py-12 text-center sm:px-10">
              <ShieldCheck className="mx-auto h-10 w-10 text-apple-blue" />
              <h2 className="mt-5 text-2xl font-black">登入後查看自己的匯款狀態</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-apple-gray-600">系統只會顯示與登入信箱相符的課程報名資料。</p>
              <Link href="/payment?auth=login" className="apple-button-primary mt-6 w-full sm:w-fit">登入查看</Link>
            </div>
          ) : error ? (
            <div role="alert" className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-800">{error}</div>
          ) : enrollments.length === 0 ? (
            <div className="mt-8 rounded-lg border border-black/10 bg-white px-6 py-12 text-center">
              <h2 className="text-xl font-black">目前沒有課程匯款資料</h2>
              <p className="mt-2 text-sm leading-6 text-apple-gray-600">從課程表進入課程詳情並完成報名後，核對狀態會顯示在這裡。</p>
              <Link href="/courses" className="apple-button-primary mt-6 w-full sm:w-fit">查看訓練課程</Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {enrollments.map((enrollment) => {
                const Icon = statusIcon[enrollment.status]
                return (
                  <article key={enrollment.id} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-apple-gray-400">報名課程</p>
                        <h2 className="mt-1 text-lg font-black leading-7 text-apple-gray-950">{enrollment.courseName || '好運跑班課程'}</h2>
                      </div>
                      <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${statusTone[enrollment.status]}`}>
                        <Icon className="h-3.5 w-3.5" />{paymentOrderStatusLabels['zh-TW'][enrollment.status]}
                      </div>
                    </div>

                    <p className="mt-4 rounded-lg bg-apple-gray-50 px-4 py-3 text-sm font-semibold leading-6 text-apple-gray-700">
                      {paymentOrderStatusDescriptions[enrollment.status]}
                    </p>
                    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                      <div><dt className="text-apple-gray-500">應匯金額</dt><dd className="mt-1 font-black text-apple-gray-950">{enrollment.amountText || '依報名資料'}</dd></div>
                      <div><dt className="text-apple-gray-500">匯款帳號後五碼</dt><dd className="mt-1 font-black text-apple-gray-950">{enrollment.transferLastFive ? `•••${enrollment.transferLastFive}` : '尚未提交'}</dd></div>
                      <div><dt className="text-apple-gray-500">報名時間</dt><dd className="mt-1 font-bold text-apple-gray-900">{formatDate(enrollment.createdAt)}</dd></div>
                      <div><dt className="text-apple-gray-500">匯款資料提交</dt><dd className="mt-1 font-bold text-apple-gray-900">{formatDate(enrollment.paymentSubmittedAt)}</dd></div>
                    </dl>
                    {enrollment.reviewNote ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">核對說明：{enrollment.reviewNote}</p> : null}
                    {enrollment.courseSlug ? (
                      <Link href={`/courses/${enrollment.courseSlug}/register`} className="apple-button-outline mt-5 w-full gap-2">
                        查看報名與匯款資料<ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
