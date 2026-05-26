import Link from 'next/link'
import { ArrowRight, HeartHandshake, MapPin, Route, Sparkles, Target, UsersRound } from 'lucide-react'

export const metadata = {
  title: '關於好運跑班 - 好運跑班',
  description: '認識好運跑班：面向台灣跑者的系統化跑步訓練團隊。',
}

const beliefs = [
  {
    icon: Sparkles,
    title: '跑步可以被認識',
    description: '跑步不是只靠意志硬撐。當你理解節奏、強度、恢復與身體訊號，每一次訓練都會變得更有方向。',
  },
  {
    icon: HeartHandshake,
    title: '跑步值得被陪伴',
    description: '從第一次出門跑，到準備一場重要比賽，身邊有人一起練、有人看見你的狀態，進步會變得踏實很多。',
  },
  {
    icon: Target,
    title: '目標需要被拆解',
    description: '5000m、10000m、半馬、全馬，每個目標都有不同的節奏。好運把目標拆成週期、課表與每一次能完成的訓練。',
  },
]

const runners = ['新手小白', '業餘跑者', '專業跑者', '精英跑者', '5000m / 10000m 備賽', '半馬 / 全馬備賽']

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white pt-24">
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                About Good Luck Running
              </p>
              <h1 className="mb-6 text-4xl font-black leading-tight text-apple-gray-900 md:text-6xl">
                我們想讓更多人，
                <span className="block">真正愛上跑步。</span>
              </h1>
              <p className="text-lg leading-8 text-apple-gray-600 md:text-xl md:leading-9">
                好運跑班面向台灣所有跑者。你可以是第一次想規律跑步的人，也可以是正在追逐 PB 的跑者；可以為 5000m、10000m 準備，也可以把目標放在半馬、全馬。重要的不是你現在跑得多快，而是你願意開始理解自己的身體，並且一步一步跑向更穩定的自己。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/courses" className="apple-button-primary text-center">
                  查看近期課程
                </Link>
                <a
                  href="https://www.instagram.com/nurture.running.team/"
                  target="_blank"
                  rel="noreferrer"
                  className="apple-button-outline text-center"
                >
                  聯絡好運
                </a>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-apple-gray-200 bg-apple-gray-100">
              <div
                className="min-h-[320px] bg-cover bg-center sm:min-h-[420px] lg:min-h-[520px]"
                style={{ backgroundImage: 'url("/LINE_ALBUM_四週年手機桌布_260515_1.jpg")' }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-apple-gray-100 px-4 py-20 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
              Our belief
            </p>
            <h2 className="text-3xl font-bold text-apple-gray-900 md:text-4xl">
              好運不是偶然，是一次次被好好安排的訓練。
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {beliefs.map((item) => (
              <article key={item.title} className="rounded-3xl border border-apple-gray-200 bg-white p-8">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-apple-blue to-apple-orange">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-apple-gray-900">{item.title}</h3>
                <p className="leading-7 text-apple-gray-600">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                Who we train
              </p>
              <h2 className="mb-6 text-3xl font-bold text-apple-gray-900 md:text-4xl">
                不同程度的跑者，都可以在這裡找到自己的節奏。
              </h2>
              <p className="text-base leading-8 text-apple-gray-600 md:text-lg">
                我們不把跑者分成「會跑」或「不會跑」。每個人都有自己的起點，也有自己的目標。好運跑班希望做的是，讓你知道今天為什麼這樣跑，這週為什麼這樣練，下一個階段又要怎麼調整。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {runners.map((runner) => (
                  <span
                    key={runner}
                    className="rounded-full border border-apple-gray-200 bg-white px-4 py-2 text-sm font-semibold text-apple-gray-800 shadow-sm"
                  >
                    {runner}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-apple-gray-200 bg-apple-gray-50 p-5 sm:p-8">
              <div className="space-y-6">
                {[
                  {
                    icon: MapPin,
                    title: '台灣多地開課',
                    description: '台北、新竹、竹北、板橋、三重、竹南等班級逐步整理上線。',
                  },
                  {
                    icon: Route,
                    title: '週期化訓練',
                    description: '以固定週期建立跑力，讓課表、團練與恢復彼此銜接。',
                  },
                  {
                    icon: UsersRound,
                    title: '教練與社群支持',
                    description: '學員回報訓練感受，教練依照狀態調整，讓進步不是孤單發生。',
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 rounded-2xl bg-white p-4 sm:p-5">
                    <item.icon className="mt-1 h-6 w-6 flex-shrink-0 text-apple-blue" />
                    <div>
                      <h3 className="mb-2 font-bold text-apple-gray-900">{item.title}</h3>
                      <p className="text-sm leading-6 text-apple-gray-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="rounded-3xl border border-apple-gray-200 bg-gradient-to-r from-apple-blue/5 via-white to-apple-orange/5 p-8 text-center md:p-12">
            <h2 className="mb-4 text-3xl font-bold text-apple-gray-900">
              從下一次訓練開始，跑得更清楚一點。
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-8 text-apple-gray-600">
              如果你還不確定自己適合哪一班，先讓我們知道你的跑步經驗、目標距離與可訓練時間，我們會協助你找到更適合的起點。
            </p>
            <Link href="/courses" className="apple-button-secondary inline-flex items-center">
              前往課程列表
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
