'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Mail, MessageSquareText, NotebookPen, Search, UsersRound } from 'lucide-react'
import CoachAccessPanel from '@/components/CoachAccessPanel'
import CoachSubNav from '@/components/CoachSubNav'
import { supabase } from '@/lib/supabase'
import { getStudentDisplayEmail, getStudentDisplayName, hasStudentName } from '@/lib/student-display'

type RecentFeedback = {
  id: string
  created_at: string
  distance_km: number | null
  pace_text: string | null
  average_heart_rate: number | null
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

async function fetchCoachStudents() {
  if (!supabase) {
    throw new Error('Supabase 尚未設定。')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('請先登入教練帳號。')
  }

  const response = await fetch('/api/coach/students', {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    students?: BoundStudentRow[]
  }

  if (!response.ok) {
    throw new Error(payload.error || '讀取學員失敗，請稍後再試。')
  }

  return payload.students ?? []
}

export default function CoachStudentsClient() {
  const [students, setStudents] = useState<BoundStudentRow[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStudents = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const rows = await fetchCoachStudents()
      setStudents(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取學員失敗，請稍後再試。')
      setStudents([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  const filteredStudents = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return students

    return students.filter((row) => {
      const student = row.student
      if (!student) return false

      return [getStudentDisplayName(student), student.email, student.program, student.goal, student.pb]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(text))
    })
  }, [query, students])

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <CoachSubNav />

          <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                學員名單
              </p>
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">學員列表</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                綁定完成後，這裡會顯示目前教練負責的學員，並提供課表派發與最近回饋入口。
              </p>
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜尋姓名、班級或目標"
                className="apple-input pl-11"
              />
            </div>
          </div>

          <div className="mb-8">
            <CoachAccessPanel onStudentBound={loadStudents} />
          </div>

          {error && (
            <div className="mb-6 rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
目前無法讀取學員綁定資料。請確認帳號已啟用教練權限。資訊：{error}
            </div>
          )}

          {isLoading ? (
            <div className="apple-card p-8 text-center text-apple-gray-600">讀取學員中...</div>
          ) : filteredStudents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredStudents.map((row) => {
                const student = row.student
                if (!student) return null

                return (
                  <article key={row.id} className="apple-card p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black text-apple-gray-900">
                          {getStudentDisplayName(student) || student.email}
                        </h2>
                        <p className="mt-1 flex items-center gap-2 text-sm text-apple-gray-500">
                          <Mail className="h-4 w-4" />
                          {hasStudentName(student) ? getStudentDisplayEmail(student) : '學員尚未設定姓名'}
                        </p>
                      </div>
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
已綁定
                      </span>
                    </div>

                    <div className="space-y-3">
                      {[
                        ['班級', student.program || '尚未填寫'],
                        ['目標', student.goal || '尚未填寫'],
                        ['PB', student.pb || '尚未填寫'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl bg-apple-gray-100 p-4">
                          <p className="text-xs text-apple-gray-500">{label}</p>
                          <p className="mt-1 font-bold text-apple-gray-900">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div id={`feedback-${student.id}`} className="mt-5 rounded-2xl bg-apple-gray-100 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-apple-gray-900">
                        <MessageSquareText className="h-4 w-4" />
                        最近回饋
                      </div>
                      {row.recentFeedback && row.recentFeedback.length > 0 ? (
                        <div className="space-y-2">
                          {row.recentFeedback.slice(0, 2).map((feedback) => (
                            <div key={feedback.id} className="rounded-xl bg-white p-3 text-sm text-apple-gray-700">
                              <div className="mb-1 flex items-center justify-between gap-3">
                                <span className="font-semibold text-apple-gray-900">
                                  {new Date(feedback.created_at).toLocaleDateString('zh-CN')}
                                </span>
                                <span className="rounded-full bg-apple-gray-100 px-2 py-0.5 text-xs font-semibold">
                                  RPE {feedback.rpe ?? '-'}
                                </span>
                              </div>
                              <p className="line-clamp-4 whitespace-pre-line leading-6">{feedback.feeling || '學員未填寫文字感受。'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm leading-6 text-apple-gray-600">
                          學員還沒有提交訓練回饋。可以提醒他完成訓練後到學員中心填寫 RPE、睡眠、疲勞與不適位置。
                        </p>
                      )}
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Link
                        href={`/coach/planner?studentId=${student.id}`}
                        className="apple-button-primary gap-2 px-4 py-2.5 text-sm"
                      >
                        <NotebookPen className="h-4 w-4" />
                        下發課表
                      </Link>
                      <a
                        href={`#feedback-${student.id}`}
                        className="apple-button-secondary gap-2 px-4 py-2.5 text-sm"
                      >
                        <CalendarDays className="h-4 w-4" />
                        查看回饋
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="apple-card p-8 text-center md:p-12">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
                <UsersRound className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-apple-gray-900">尚未綁定真實學員</h2>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-apple-gray-600">
                請先讓學員註冊帳號，再用上方欄位輸入對方信箱。綁定成功後，這裡會出現真實學員資料。
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
