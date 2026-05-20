import Link from 'next/link'
import { ArrowLeft, Link2, Search, UsersRound } from 'lucide-react'

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
                這裡會顯示真實綁定到教練帳號的學員。尚未完成綁定前，先保留搜尋與空狀態。
              </p>
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
              <input placeholder="搜尋姓名、班級或目標" className="apple-input pl-11" />
            </div>
          </div>

          <div className="apple-card p-8 text-center md:p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
              <UsersRound className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-apple-gray-900">尚未綁定真實學員</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-apple-gray-600">
              下一步會加入教練邀请码與學員綁定流程。完成後，教練可以在這裡看到每位學員的週數、目標、最近回饋與需要留意的狀態。
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ['建立教練角色', '用邀请码把指定帳號升級為 coach。'],
                ['綁定學員', '由管理員或教練把 student 加入負責名單。'],
                ['讀取真實狀態', '依照 coach_students 只顯示所屬學員。'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-3xl bg-apple-gray-100 p-5 text-left">
                  <Link2 className="mb-4 h-5 w-5 text-apple-gray-700" />
                  <h3 className="font-bold text-apple-gray-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-apple-gray-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
