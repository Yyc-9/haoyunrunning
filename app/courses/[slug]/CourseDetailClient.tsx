'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock,
  Instagram,
  MapPin,
  Navigation,
  Route,
  UsersRound,
} from 'lucide-react'
import { useLanguage } from '@/app/language-context'
import type { ManagedCourse } from '@/lib/managed-courses'
import TrainingItemCard from '@/components/TrainingItemCard'
import BenefitItem from '@/components/BenefitItem'
import SuitabilityCard from '@/components/SuitabilityCard'
import { useSiteContent } from '@/app/site-content-provider'

type CourseDetail = ManagedCourse

type CourseDetailClientProps = {
  course: CourseDetail | null
}

function localizeText(text: string, _language: string) {
  void _language
  return text
}

const trainingDescriptions: Record<string, string> = {
  動態熱身與跑姿檢測: '透過動態熱身啟動身體，觀察跑姿細節，讓教練掌握當天狀態與需要調整的重點。',
  動態熱身與技術跑: '先用熱身和技術跑喚醒節奏感，建立更穩定的步頻、擺臂和身體控制。',
  基礎有氧訓練: '用穩定強度建立底層耐力，讓身體逐步適應規律跑量。',
  呼吸與節奏控制: '練習用呼吸、步頻和體感控制速度，避免一開始過快造成後段失速。',
  肌力與穩定性訓練: '透過核心、臀腿和下肢穩定練習，提升跑步支撐能力，降低受傷風險。',
  跑後放鬆與恢復: '用伸展、放鬆和恢復提醒整理訓練後的肌肉張力，幫助身體進入下一次訓練。',
  訓練回報與調整: '根據學員每週回報的里程、RPE、疲勞和疼痛情況，幫助教練調整訓練安排。',
  間歇訓練與配速調控: '用分段高強度訓練提升速度能力，並學會控制每一組的配速和恢復時間。',
  間歇訓練: '透過短距離或固定時間的重複訓練刺激速度，同時保留足夠恢復來維持動作品質。',
  節奏跑與維持速度: '在接近比賽感的強度下維持穩定輸出，訓練身體適應長時間的速度壓力。',
  節奏跑與配速訓練: '建立清楚的配速感，讓跑者知道不同距離和強度下該如何穩定分配體力。',
  長距離耐力建立: '循序增加時間與距離，打好半馬、全馬或長距離目標基礎。',
  長距離耐力訓練: '透過較長時間的有氧累積提升耐力，練習補給、節奏和後段穩定度。',
  賽事策略與心理調整: '把目標賽事拆成配速、補給和心理節奏，降低比賽當天的不確定感。',
  恢復與防傷指導: '依照訓練負荷安排恢復方式，提醒常見疼痛風險和需要提早處理的訊號。',
  跑姿與技術調整: '透過動作提示和技術跑，修正落地、重心、擺臂與轉換效率。',
}

function getTrainingDescription(title: string, language: string) {
  const description =
    trainingDescriptions[title] ||
    '依照課程目標安排當日訓練內容，讓跑者在安全節奏中完成有效累積。'

  return localizeText(description, language)
}

export default function CourseDetailClient({ course }: CourseDetailClientProps) {
  const { language, t } = useLanguage()
  const { courses, brand, isLoading } = useSiteContent()
  const courseSlug = course?.slug
  const managedCourse = courseSlug ? courses.find((item) => item.slug === courseSlug) ?? (isLoading ? course : null) : null

  if (!managedCourse) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
        <section className="container mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <div className="apple-card p-8 md:p-12">
            <p className="text-sm font-semibold uppercase tracking-wide text-apple-blue">
              {t.courseDetail.heroLabel}
            </p>
            <h1 className="mt-3 text-3xl font-black text-apple-gray-900 md:text-5xl">
              {t.courseDetail.courseNotFoundTitle}
            </h1>
            <p className="mt-4 leading-8 text-apple-gray-600">
              {t.courseDetail.courseNotFoundDescription}
            </p>
            <Link href="/courses" className="apple-button-primary mt-8 inline-flex items-center gap-2 px-6 py-3">
              {t.courseDetail.backToCourseList}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    )
  }

  course = managedCourse

  const text = (value: string) => localizeText(value, language)
  const instagramUrl = brand.instagramUrl || course.instagramUrl || 'https://www.instagram.com/nurture.running.team/'
  const courseCoaches = course.coaches ?? (course.coach ? [course.coach] : [])

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-20 sm:pt-24">
      <div className="sticky top-[52px] z-40 border-b border-black/10 bg-white shadow-sm sm:top-16">
        <div className="container mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-bold text-apple-gray-700 transition-colors hover:text-apple-blue">
            <ArrowLeft className="h-4 w-4" />
            {t.courseDetail.backToCourses}
          </Link>
          <p className="truncate text-sm font-black text-apple-gray-900 md:max-w-2xl">
            {text(course.title)}
          </p>
        </div>
      </div>

      <section className="overflow-hidden border-b border-black/5 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="rounded-[1.5rem] border border-black/5 bg-apple-gray-50 p-5 shadow-sm md:p-7">
              <p className="text-xs font-bold uppercase tracking-wide text-apple-blue">{t.courseDetail.heroLabel}</p>
              <h1 className="mt-2 max-w-4xl text-3xl font-black leading-[1.08] text-apple-gray-900 md:text-4xl">
                {text(course.title)}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-apple-gray-600">
                {text(course.slogan)}
              </p>
              <div className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-2">
                <div className="border-l-2 border-apple-blue pl-4">
                  <p className="text-xs font-bold text-apple-gray-400">適合對象</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-apple-gray-700">{text(course.targetAudience)}</p>
                </div>
                <div className="border-l-2 border-emerald-500 pl-4">
                  <p className="text-xs font-bold text-apple-gray-400">費用說明</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-apple-gray-700">{text(course.feeNote)}</p>
                </div>
              </div>
              <div className="mt-5 border-t border-black/10 pt-4">
                <p className="text-xs font-bold uppercase text-apple-gray-400">本期訓練重點</p>
                <div className="mt-3 grid grid-cols-3 divide-x divide-black/10">
                  {course.trainingItems.slice(0, 3).map((item, index) => (
                    <div key={item} className={index === 0 ? 'pr-2 sm:pr-4' : 'px-2 sm:px-4'}>
                      <span className="text-xs font-black text-apple-blue">0{index + 1}</span>
                      <p className="mt-1 text-xs font-black leading-5 text-apple-gray-900 sm:text-sm">{text(item)}</p>
                    </div>
                  ))}
                </div>
              </div>
          </div>
        </div>
      </section>

      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="space-y-10">
            <section>
              <h2 className="mb-6 text-2xl font-black text-apple-gray-900">{t.courseDetail.trainingItems}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {course.trainingItems.map((item) => (
                  <TrainingItemCard key={item} title={text(item)} description={getTrainingDescription(item, language)} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-6 text-2xl font-black text-apple-gray-900">{t.courseDetail.whatYouWillGet}</h2>
              <div className="apple-card grid gap-4 p-6 md:grid-cols-2 md:p-8">
                {course.benefits.map((benefit) => (
                  <BenefitItem key={benefit} text={text(benefit)} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-6 text-2xl font-black text-apple-gray-900">{t.courseDetail.coachIntroduction}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {courseCoaches.map((coach) => (
                  <article key={coach.name} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                      <UsersRound className="h-4 w-4" />
                    </span>
                    <h3 className="mt-4 text-lg font-black text-apple-gray-950">{text(coach.name)}</h3>
                    <p className="mt-2 text-xs font-bold text-apple-gray-400">負責班級</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-apple-gray-700">{text(course.name)}</p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <div className="max-w-4xl">
                <SuitabilityCard type="suitable" title={t.courseDetail.suitableFor} items={course.suitableFor.map(text)} />
              </div>
            </section>

            <section className="relative overflow-hidden rounded-[1.5rem] bg-[#111] p-5 text-white shadow-xl shadow-black/10 sm:p-7 lg:p-8">
              <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.09)_1px,transparent_1px)] [background-size:28px_28px]" />
              <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-end">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase text-white/45">{t.courseDetail.courseLocation}</p>
                      <h2 className="mt-2 text-3xl font-black leading-none text-white">{text(course.city)}</h2>
                      <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-white/70">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-apple-blue" />
                        {text(course.meetingPoint)}
                      </p>
                    </div>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-apple-gray-950">
                      <Navigation className="h-5 w-5" />
                    </span>
                  </div>

                  <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/10 bg-black/30 p-4 text-sm font-bold leading-6 text-white">
                    <Route className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {text(course.focus)}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                    {[
                      [CalendarDays, t.courseDetail.courseWeekday, '星期', course.weekday],
                      [Clock, t.courseDetail.classTime, '時間', course.time],
                      [Route, t.courseDetail.coursePeriod, '週期', course.period],
                    ].map(([Icon, label, shortLabel, value]) => {
                      const CardIcon = Icon as typeof CalendarDays
                      return (
                        <div key={`${label}-${value}`} className="min-w-0 rounded-xl border border-white/10 bg-white/10 p-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white/45">
                            <CardIcon className="h-3.5 w-3.5 shrink-0" />
                            <span>{shortLabel as string}</span>
                          </div>
                          <p className="mt-2 break-words text-xs font-black leading-5 text-white">{text(value as string)}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Link
                    href={`/courses/${course.slug}/register`}
                    className="apple-button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 px-5 py-3"
                  >
                    立即報名
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                  >
                    <Instagram className="h-5 w-5" />
                    {t.courseDetail.contactInstagram}
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
