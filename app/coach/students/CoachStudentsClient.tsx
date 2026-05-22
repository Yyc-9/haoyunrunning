'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Mail, MessageSquareText, NotebookPen, Search, Target, UsersRound } from 'lucide-react'
import CoachAccessPanel from '@/components/CoachAccessPanel'
import { supabase } from '@/lib/supabase'

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
    throw new Error('请先登入教练账号。')
  }

  const response = await fetch('/api/coach/students', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    students?: BoundStudentRow[]
  }

  if (!response.ok) {
    throw new Error(payload.error || '读取学员失败，请稍后再试。')
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
      setError(err instanceof Error ? err.message : '读取学员失败，请稍后再试。')
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

      return [student.name, student.email, student.program, student.goal, student.pb]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(text))
    })
  }, [query, students])

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <Link href="/coach" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-apple-gray-700">
            <ArrowLeft className="h-4 w-4" />
            回教练工作台
          </Link>

          <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                Athletes
              </p>
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">学员列表</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                绑定完成后，这里会显示当前教练负责的学员，并提供课表派发与最近回馈入口。
              </p>
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索姓名、班级或目标"
                className="apple-input pl-11"
              />
            </div>
          </div>

          <div className="mb-8">
            <CoachAccessPanel onStudentBound={loadStudents} />
          </div>

          {error && (
            <div className="mb-6 rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
目前无法读取学员绑定资料。请确认账号已启用教练权限。信息：{error}
            </div>
          )}

          {isLoading ? (
            <div className="apple-card p-8 text-center text-apple-gray-600">读取学员中...</div>
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
                          {student.name || student.email.split('@')[0]}
                        </h2>
                        <p className="mt-1 flex items-center gap-2 text-sm text-apple-gray-500">
                          <Mail className="h-4 w-4" />
                          {student.email}
                        </p>
                      </div>
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
已绑定
                      </span>
                    </div>

                    <div className="space-y-3">
                      {[
                        ['班级', student.program || '尚未填写'],
                        ['目标', student.goal || '尚未填写'],
                        ['PB', student.pb || '尚未填写'],
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
                        最近回馈
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
                              <p className="line-clamp-2 leading-6">{feedback.feeling || '学员未填写文字感受。'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm leading-6 text-apple-gray-600">
                          学员还没有提交训练回馈。可以提醒他完成训练后到学员中心填写 RPE、睡眠、疲劳与不适位置。
                        </p>
                      )}
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Link
                        href={`/coach/planner?studentId=${student.id}`}
                        className="apple-button-primary gap-2 px-4 py-2.5 text-sm"
                      >
                        <NotebookPen className="h-4 w-4" />
                        下发课表
                      </Link>
                      <a
                        href={`#feedback-${student.id}`}
                        className="apple-button-secondary gap-2 px-4 py-2.5 text-sm"
                      >
                        <CalendarDays className="h-4 w-4" />
                        查看回馈
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
              <h2 className="text-2xl font-black text-apple-gray-900">尚未绑定真实学员</h2>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-apple-gray-600">
                请先让学员注册账号，再用上方栏位输入对方邮箱。绑定成功后，这里会出现真实学员资料。
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
