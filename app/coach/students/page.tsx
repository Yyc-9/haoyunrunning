import Link from 'next/link'
import { ArrowLeft, CalendarClock, Search, Target, UserRoundCheck } from 'lucide-react'
import { coachStudents } from '@/lib/training-workflow-data'

export const metadata = {
  title: '學員列表 - 好運跑班教練端',
  description: '查看好運跑班學員週數、目標、最近回饋與訓練風險。',
}

export default function CoachStudentsPage() {
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
                先用一張清楚的列表讓教練知道：誰已經回報、誰要留意、誰的下一課需要調整。
              </p>
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
              <input placeholder="搜尋姓名、班級或目標" className="apple-input pl-11" />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {coachStudents.map((student) => (
              <article key={student.id} className="apple-card p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-apple-gray-900">{student.name}</h2>
                    <p className="mt-1 text-sm text-apple-gray-500">{student.program}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      student.readiness === '需調整' || student.readiness === '待追蹤'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-green-50 text-green-700'
                    }`}
                  >
                    {student.readiness}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: Target, label: '目標', value: student.goal },
                    { icon: CalendarClock, label: '週數', value: `第 ${student.week} 週` },
                    { icon: UserRoundCheck, label: '回饋', value: student.lastFeedback },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-apple-gray-100 p-4">
                      <item.icon className="mb-3 h-4 w-4 text-apple-gray-600" />
                      <p className="text-xs text-apple-gray-500">{item.label}</p>
                      <p className="mt-1 text-sm font-bold text-apple-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 rounded-3xl border border-black/10 bg-white p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-apple-gray-500">風險提醒</p>
                    <p className="mt-1 font-semibold text-apple-gray-900">{student.risk}</p>
                  </div>
                  <div>
                    <p className="text-xs text-apple-gray-500">下一課</p>
                    <p className="mt-1 font-semibold text-apple-gray-900">{student.nextWorkout}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
