import Link from 'next/link'
import {
  CalendarDays,
  ClipboardList,
  KeyRound,
  MessageSquareText,
  NotebookPen,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'

export const metadata = {
  title: '教練工作台 - 好運跑班',
  description: '好運跑班教練端概念頁，用於規劃課表同步、學員回饋與教練權限入口。',
}

const focusCards = [
  {
    icon: CalendarDays,
    title: '同步本週課表',
    description: '依照班級、目標賽事與學員狀態，發布本週訓練內容與注意事項。',
  },
  {
    icon: MessageSquareText,
    title: '查看訓練回饋',
    description: '集中閱讀學員提交的里程、配速、心率、RPE、截圖與主觀感受。',
  },
  {
    icon: NotebookPen,
    title: '留下教練建議',
    description: '針對疲勞、傷痛、配速失衡或狀態良好的學員，給出下一步調整。',
  },
]

const feedbackQueue = [
  { name: '台北 PB 班學員', workout: '800m x 6', status: '需要配速建議', tag: '待回覆' },
  { name: '竹北夜跑班學員', workout: 'E 跑 10km', status: 'RPE 偏高', tag: '留意恢復' },
  { name: '初心補習班學員', workout: '跑走 40 分鐘', status: '完成度良好', tag: '可鼓勵' },
]

const weekPlan = [
  { day: '週一', title: '有氧基礎', detail: 'E 跑 8-10km，保持能完整說話的強度。' },
  { day: '週三', title: '速度刺激', detail: '間歇 800m x 6，組間慢跑恢復 400m。' },
  { day: '週六', title: '長距離', detail: '16-24km，依班級與賽事目標調整距離。' },
]

export default function CoachPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                Coach workspace
              </p>
              <h1 className="mb-6 text-4xl font-black leading-tight text-apple-gray-900 md:text-6xl">
                給教練一個安靜、
                <span className="block">清楚的工作台。</span>
              </h1>
              <p className="text-lg leading-8 text-apple-gray-600">
                這裡先作為教練端概念頁。未來教練可以在這裡發布本週課表、查看學員訓練回饋，並依照每個人的狀態調整下一步訓練。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/profile" className="apple-button-primary">
                  先查看學員中心
                </Link>
                <Link href="/courses" className="apple-button-outline">
                  回到課程列表
                </Link>
              </div>
            </div>

            <div className="apple-card p-6 md:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-apple-gray-500">Access model</p>
                  <h2 className="text-2xl font-bold text-apple-gray-900">教練權限概念</h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl bg-apple-gray-100 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <KeyRound className="h-5 w-5 text-apple-gray-700" />
                    <h3 className="font-bold text-apple-gray-900">邀请码升级</h3>
                  </div>
                  <p className="text-sm leading-6 text-apple-gray-600">
                    普通注册不打扰学员。教练注册后，在隐藏入口输入内部邀请码，即可升级为教练权限。
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-black/10 bg-white p-4">
                    <div className="text-3xl font-black text-apple-gray-900">3</div>
                    <p className="text-sm text-apple-gray-500">待回覆回饋</p>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-white p-4">
                    <div className="text-3xl font-black text-apple-gray-900">11</div>
                    <p className="text-sm text-apple-gray-500">目前班級</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid gap-6 md:grid-cols-3">
            {focusCards.map((item) => (
              <article key={item.title} className="apple-card p-7">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                  <item.icon className="h-6 w-6" />
                </div>
                <h2 className="mb-3 text-xl font-bold text-apple-gray-900">{item.title}</h2>
                <p className="leading-7 text-apple-gray-600">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="apple-card p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-apple-gray-700" />
                <h2 className="text-xl font-bold text-apple-gray-900">本週課表示例</h2>
              </div>
              <div className="space-y-4">
                {weekPlan.map((item) => (
                  <div key={item.day} className="rounded-3xl bg-apple-gray-100 p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="apple-chip apple-chip-active px-3 py-1 text-xs">{item.day}</span>
                      <span className="text-xs font-semibold text-apple-gray-500">可按班級覆寫</span>
                    </div>
                    <h3 className="mb-2 font-bold text-apple-gray-900">{item.title}</h3>
                    <p className="text-sm leading-6 text-apple-gray-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="apple-card p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <UsersRound className="h-5 w-5 text-apple-gray-700" />
                <h2 className="text-xl font-bold text-apple-gray-900">學員回饋佇列</h2>
              </div>
              <div className="space-y-4">
                {feedbackQueue.map((item) => (
                  <div key={item.name} className="rounded-3xl border border-black/10 bg-white p-5">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-apple-gray-900">{item.name}</h3>
                        <p className="text-sm text-apple-gray-500">{item.workout}</p>
                      </div>
                      <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-semibold text-apple-gray-700">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-apple-gray-600">{item.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
