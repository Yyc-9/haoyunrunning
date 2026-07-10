'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock,
  CreditCard,
  Instagram,
  MapPin,
  Navigation,
  Route,
} from 'lucide-react'
import { useLanguage } from '@/app/language-context'
import type { allCourses } from '@/lib/goodluck-data'
import CoachCard from '@/components/CoachCard'
import TrainingItemCard from '@/components/TrainingItemCard'
import BenefitItem from '@/components/BenefitItem'
import SuitabilityCard from '@/components/SuitabilityCard'
import FAQItem from '@/components/FAQItem'
import EnrollmentStep from '@/components/EnrollmentStep'
import { useSiteContent } from '@/app/site-content-provider'

type CourseDetail = (typeof allCourses)[number]
type CoachDetail = CourseDetail['coach']

type CourseDetailClientProps = {
  course: CourseDetail | null
}

function localizeText(text: string, _language: string) {
  void _language
  return text
}

function localizeCoach(coach: CoachDetail, language: string): CoachDetail {
  return {
    ...coach,
    name: localizeText(coach.name, language),
    nickname: coach.nickname ? localizeText(coach.nickname, language) : undefined,
    role: localizeText(coach.role, language),
    bio: localizeText(coach.bio, language),
    specialties: coach.specialties.map((item) => localizeText(item, language)),
    style: localizeText(coach.style, language),
    achievements: coach.achievements.map((item) => localizeText(item, language)),
    certifications: coach.certifications?.map((item) => localizeText(item, language)),
  }
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
  const { courses, isLoading } = useSiteContent()
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
  const instagramUrl = course.instagramUrl || 'https://www.instagram.com/nurture.running.team/'
  const paymentHref = `/payment?course=${encodeURIComponent(course.slug)}`
  const courseCoaches = course.coaches.map((coach) => localizeCoach(coach, language))

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <div className="sticky top-24 z-40 border-b border-black/5 bg-white/85 backdrop-blur-md">
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

      <section className="overflow-hidden border-b border-black/5 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-stretch">
            <div className="rounded-[2rem] border border-black/5 bg-apple-gray-50 p-6 shadow-sm md:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-apple-blue">{t.courseDetail.heroLabel}</p>
              <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight text-apple-gray-900 md:text-5xl">
                {text(course.title)}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-apple-gray-600 md:text-lg">
                {text(course.slogan)}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  [t.courseDetail.city, course.city],
                  [t.courseDetail.courseWeekday, course.weekday],
                  [t.courseDetail.classTime, course.time],
                  [t.courseDetail.meetingPoint, course.meetingPoint],
                  [t.courseDetail.coursePeriod, course.period],
                ].map(([label, value]) => (
                  <span key={`${label}-${value}`} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-apple-gray-900 shadow-sm">
                    <span className="text-apple-gray-400">{label}</span>
                    {text(value)}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-black/5 bg-white p-3 shadow-xl shadow-black/10">
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#111] p-5">
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.09)_1px,transparent_1px)] [background-size:28px_28px]" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase text-white/45">{t.courseDetail.courseLocation}</p>
                      <h2 className="mt-2 text-3xl font-black leading-none text-white">{text(course.city)}</h2>
                      <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-white/70">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-apple-blue" />
                        {text(course.meetingPoint)}
                      </p>
                    </div>
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-apple-gray-950">
                      <Navigation className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="my-6 rounded-3xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-apple-gray-950">
                        GO
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-emerald-400 via-white/50 to-apple-blue" />
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-apple-blue text-xs font-black text-white">
                        RUN
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm font-bold text-white">
                      <Route className="h-4 w-4 text-apple-blue" />
                      {text(course.focus)}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    {[
                      [CalendarDays, t.courseDetail.courseWeekday, course.weekday],
                      [Clock, t.courseDetail.classTime, course.time],
                      [Route, t.courseDetail.coursePeriod, course.period],
                    ].map(([Icon, label, value]) => {
                      const CardIcon = Icon as typeof CalendarDays

                      return (
                        <div key={`${label}-${value}`} className="rounded-2xl border border-white/10 bg-white/10 p-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-white/45">
                            <CardIcon className="h-4 w-4" />
                            {label as string}
                          </div>
                          <p className="mt-2 text-sm font-black leading-5 text-white">{text(value as string)}</p>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-5 flex flex-col gap-3">
                    <Link
                      href={paymentHref}
                      className="apple-button-primary inline-flex w-full items-center justify-center gap-2 px-6 py-3"
                    >
                      <CreditCard className="h-5 w-5" />
                      {t.courseDetail.siteSignup}
                    </Link>
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                    >
                      <Instagram className="h-5 w-5" />
                      {t.courseDetail.contactInstagram}
                    </a>
                  </div>
                </div>
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
              <div className="space-y-6">
                {courseCoaches.map((coach) => (
                  <CoachCard
                    key={coach.name}
                    coach={coach}
                    labels={{
                      photo: t.courseDetail.coachPhotoPlaceholder,
                      photoPending: t.courseDetail.coachPhotoPending,
                      specialties: t.courseDetail.coachSpecialties,
                      style: t.courseDetail.coachStyle,
                      achievements: t.courseDetail.coachAchievements,
                      certifications: t.courseDetail.coachCertifications,
                    }}
                  />
                ))}
              </div>
            </section>

            <section>
              <div className="grid gap-6 md:grid-cols-2">
                <SuitabilityCard type="suitable" title={t.courseDetail.suitableFor} items={course.suitableFor.map(text)} />
                <SuitabilityCard type="notSuitable" title={t.courseDetail.notSuitableFor} items={course.notSuitableFor.map(text)} />
              </div>
            </section>

            <section>
              <h2 className="mb-6 text-2xl font-black text-apple-gray-900">{t.courseDetail.howToJoin}</h2>
              <div className="apple-card p-6 md:p-8">
                {t.courseDetail.enrollmentSteps.map((step, index) => (
                  <EnrollmentStep key={step.title} number={index + 1} title={step.title} description={step.description} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-6 text-2xl font-black text-apple-gray-900">{t.courseDetail.faqs}</h2>
              <div className="apple-card p-6 md:p-8">
                {course.faq.map((item) => (
                  <FAQItem key={item.question} question={text(item.question)} answer={text(item.answer)} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
