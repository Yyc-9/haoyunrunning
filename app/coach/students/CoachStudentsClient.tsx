'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Search, Target, UsersRound } from 'lucide-react'
import CoachAccessPanel from '@/components/CoachAccessPanel'
import { supabase } from '@/lib/supabase'

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
}

type RawBoundStudentRow = Omit<BoundStudentRow, 'student'> & {
  student: BoundStudentRow['student'] | BoundStudentRow['student'][]
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

    const { data, error: loadError } = await supabase
      .from('coach_students')
      .select(`
        id,
        active,
        created_at,
        student:student_id (
          id,
          name,
          email,
          program,
          goal,
          pb
        )
      `)
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (loadError) {
      setError(loadError.message)
      setStudents([])
    } else {
      const rows = ((data ?? []) as unknown as RawBoundStudentRow[]).map((row) => ({
        ...row,
        student: Array.isArray(row.student) ? row.student[0] ?? null : row.student,
      }))

      setStudents(rows)
    }

    setIsLoading(false)
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
            回教練工作台
          </Link>

          <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                Athletes
              </p>
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">學員列表</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                綁定完成後，這裡會只顯示目前教練負責的學員，方便查看目標、PB 與後續回饋狀態。
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
              目前無法讀取學員綁定資料。請確認帳號已用邀请码升級為教練，並已執行最新的 Supabase SQL。訊息：{error}
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
                          {student.name || student.email.split('@')[0]}
                        </h2>
                        <p className="mt-1 flex items-center gap-2 text-sm text-apple-gray-500">
                          <Mail className="h-4 w-4" />
                          {student.email}
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

                    <div className="mt-5 flex items-center gap-2 text-sm font-bold text-apple-gray-900">
                      <Target className="h-4 w-4" />
                      課表與回饋面板開發中
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
                先請測試學員註冊帳號，再用上方欄位輸入對方信箱。綁定成功後，這裡就會出現真實學員資料。
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
