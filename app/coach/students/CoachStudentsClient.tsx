'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/app/language-context'
import { localizeTrainingFeedback } from '@/lib/training-feedback-language'
import { CalendarDays, Mail, MessageSquareText, Search, UsersRound } from 'lucide-react'
import CoachSubNav from '@/components/CoachSubNav'
import CoachRegistrationDetails from '@/components/coach/CoachRegistrationDetails'
import StudentDisplayToggle, { useStudentDisplay } from '@/components/coach/StudentDisplayToggle'
import type { RegistrationField } from '@/lib/coach-registration'
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

export type BoundStudentRow = {
  id: string
  active: boolean
  pendingReview?: boolean
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
  enrollments?: { id: string; courseName: string; fields: RegistrationField[]; status?: string }[]
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

  const response = await fetch('/api/coach/students?includePending=true', {
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

export default function CoachStudentsClient({ previewStudents }: { previewStudents?: BoundStudentRow[] } = {}) {
  const { language } = useLanguage()
  const [display, setDisplay] = useStudentDisplay()
  const compact = display === 'compact'
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
    if (previewStudents) {
      setStudents(previewStudents)
      setIsLoading(false)
      return
    }
    loadStudents()
  }, [loadStudents, previewStudents])

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
    <div className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <CoachSubNav />

          <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                學員名單
              </p>
              <h1 className="text-3xl font-black text-apple-gray-900 sm:text-5xl">學員列表</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-apple-gray-600 sm:text-base sm:leading-7">
                這裡會顯示你負責班級的待核對學員與正式學員。待核對僅供提前查看；確認入帳後才正式綁定並開放簽到。
              </p>
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜尋姓名、班級或目標"
                className="apple-input pl-11"
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-apple-gray-600">{language === 'en' ? `${filteredStudents.length} students · ${compact ? 'Compact list' : 'Comfortable cards'}` : `${filteredStudents.length} 位學員 · ${compact ? '緊湊列表' : '舒適卡片'}`}</p>
            <StudentDisplayToggle value={display} onChange={setDisplay} />
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-800">
目前無法讀取學員綁定資料。請確認帳號已啟用教練權限。資訊：{error}
            </div>
          )}

          {isLoading ? (
            <div className="apple-card p-8 text-center text-apple-gray-600">讀取學員中...</div>
          ) : filteredStudents.length > 0 ? (
            <div className={compact ? 'grid gap-1.5' : 'grid gap-5 lg:grid-cols-2'}>
              {filteredStudents.map((row) => {
                const student = row.student
                if (!student) return null

                return (
                  <article key={row.id} className={`min-w-0 rounded-xl border border-black/10 bg-white shadow-sm ${compact ? 'px-3 py-2.5 sm:grid sm:grid-cols-[minmax(160px,1fr)_3fr] sm:gap-x-4' : 'p-5 sm:p-7'}`}>
                    <div className={`${compact ? 'mb-2 sm:mb-0' : 'mb-5'} flex items-start justify-between gap-2`}>
                      <div className="min-w-0">
                        <h2 className={`${compact ? 'text-base' : 'text-2xl'} font-black text-apple-gray-900`}>
                          {getStudentDisplayName(student) || student.email}
                        </h2>
                        <p className="mt-1 flex items-center gap-2 break-all text-sm text-apple-gray-500">
                          <Mail className="h-4 w-4 shrink-0" />
                          {hasStudentName(student) ? getStudentDisplayEmail(student) : '學員尚未設定姓名'}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${row.pendingReview ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'}`}>
{row.pendingReview ? '待核對' : '已綁定'}
                      </span>
                    </div>

                    <div className={compact ? 'grid gap-x-3 gap-y-1 sm:grid-cols-3' : 'space-y-3'}>
                      {[
                        ['班級', student.program || '尚未填寫'],
                        ['目標', student.goal || '尚未填寫'],
                        ['PB', student.pb || '尚未填寫'],
                      ].map(([label, value]) => (
                        <div key={label} className={`min-w-0 ${compact ? 'flex items-baseline gap-2 sm:block' : 'rounded-xl bg-apple-gray-100 p-4'}`}>
                          <p className="shrink-0 text-xs text-apple-gray-500">{label}</p>
                          <p className={`break-words font-bold text-apple-gray-900 ${compact ? 'text-sm leading-5' : 'mt-1 text-lg leading-7'}`}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {row.enrollments?.map(enrollment => (
                      <section key={enrollment.id} className={compact ? 'mt-2 sm:col-span-2' : 'mt-4'}>
                        <h3 className="text-sm font-bold">{enrollment.courseName}</h3>
                        {enrollment.status === 'pending_review' && <p className="mt-1 text-xs leading-5 text-amber-800">待核對，尚未取得此班正式資格。</p>}
                        <CoachRegistrationDetails fields={enrollment.fields} />
                      </section>
                    ))}

                    {!row.pendingReview && <details open={compact ? undefined : true} id={`feedback-${student.id}`} className={compact ? 'mt-1 sm:col-span-2' : 'mt-5 rounded-2xl bg-apple-gray-100 p-4'} key={display}>
                      <summary className={`${compact ? 'py-1 text-xs' : 'mb-3 text-sm'} cursor-pointer font-bold text-apple-gray-900`}><MessageSquareText aria-hidden="true" className="mr-2 inline h-4 w-4" />{language === 'en' ? 'Recent feedback' : '最近回饋'}</summary>
                      {row.recentFeedback && row.recentFeedback.length > 0 ? (
                        <div className="space-y-2">
                          {row.recentFeedback.slice(0, 2).map((feedback) => (
                            <div key={feedback.id} className="rounded-xl bg-white p-3 text-sm text-apple-gray-700">
                              <div className="mb-1 flex items-center justify-between gap-3">
                                <span className="font-semibold text-apple-gray-900">
                                  {new Date(feedback.created_at).toLocaleDateString(language)}
                                </span>
                                <span className="rounded-full bg-apple-gray-100 px-2 py-0.5 text-xs font-semibold">
                                  RPE {feedback.rpe ?? '-'}
                                </span>
                              </div>
                              <p data-training-feedback translate={feedback.feeling && language === 'en' ? 'no' : undefined} className="line-clamp-4 whitespace-pre-line leading-6">{feedback.feeling ? localizeTrainingFeedback(feedback.feeling, language) : '學員未填寫文字感受。'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm leading-6 text-apple-gray-600">
                          學員還沒有提交訓練回饋。可以提醒他完成訓練後到學員中心填寫 RPE、睡眠、疲勞與不適位置。
                        </p>
                      )}
                    </details>}

                    {!row.pendingReview && !compact && <div className="mt-5">
                      <a
                        href={`#feedback-${student.id}`}
                        onClick={() => {
                          const details = document.getElementById(`feedback-${student.id}`)
                          if (details instanceof HTMLDetailsElement) details.open = true
                        }}
                        className="apple-button-secondary w-full gap-2 px-4 py-2.5 text-sm"
                      >
                        <CalendarDays className="h-4 w-4" />
                        查看回饋
                      </a>
                    </div>}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="apple-card p-8 text-center md:p-12">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
                <UsersRound className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-apple-gray-900">目前沒有符合條件的學員</h2>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-apple-gray-600">
                學員報名你的班級並進入待核對後，就會顯示在這裡；也可以清除搜尋條件再查看。
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
