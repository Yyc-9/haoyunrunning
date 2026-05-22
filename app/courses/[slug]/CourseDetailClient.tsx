'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ChevronRight,
  Instagram,
} from 'lucide-react'
import { useLanguage } from '@/app/language-context'
import type { allCourses } from '@/lib/goodluck-data'
import CoachCard from '@/components/CoachCard'
import TrainingItemCard from '@/components/TrainingItemCard'
import BenefitItem from '@/components/BenefitItem'
import SuitabilityCard from '@/components/SuitabilityCard'
import FAQItem from '@/components/FAQItem'
import EnrollmentStep from '@/components/EnrollmentStep'

type CourseDetail = (typeof allCourses)[number]

type CourseDetailClientProps = {
  course: CourseDetail | null
}

function localizeText(text: string, language: string) {
  if (language === 'zh-CN') {
    return text
      .replaceAll('好運', '好运')
      .replaceAll('訓練', '训练')
      .replaceAll('課程', '课程')
      .replaceAll('週', '周')
      .replaceAll('節奏', '节奏')
      .replaceAll('備賽', '备赛')
      .replaceAll('階', '阶')
      .replaceAll('適合', '适合')
      .replaceAll('請', '请')
      .replaceAll('諮詢', '咨询')
      .replaceAll('實際', '实际')
      .replaceAll('集合點', '集合点')
      .replaceAll('報名', '报名')
      .replaceAll('後', '后')
  }

  return text
}

function getTrainingDescription(title: string, language: string) {
  const descriptions = [
    '用穩定強度建立底層耐力，讓身體逐步適應規律跑量。',
    '透過技術跑與動作觀察，調整落地、擺臂與身體控制。',
    '以短距離重複訓練提升速度能力，同時學會掌握恢復節奏。',
    '建立配速感與持續輸出能力，讓比賽或長跑更穩定。',
    '循序增加時間與距離，打好半馬、全馬或長距離目標基礎。',
    '整理肌肉張力與訓練感受，降低累積疲勞與受傷風險。',
  ]

  const index =
    title.includes('跑姿') || title.includes('技術')
      ? 1
      : title.includes('間歇')
        ? 2
        : title.includes('節奏') || title.includes('配速')
          ? 3
          : title.includes('長距離') || title.includes('耐力')
            ? 4
            : title.includes('放鬆') || title.includes('恢復') || title.includes('防傷')
              ? 5
              : 0

  return localizeText(descriptions[index], language)
}

export default function CourseDetailClient({ course }: CourseDetailClientProps) {
  const { language, t } = useLanguage()

  if (!course) {
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

  const text = (value: string) => localizeText(value, language)
  const instagramUrl = course.instagramUrl || 'https://www.instagram.com/nurture.running.team/'

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <div className="sticky top-24 z-40 border-b border-black/5 bg-white/85 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-bold text-apple-gray-700 transition-colors hover:text-apple-blue">
            <ArrowLeft className="h-4 w-4" />
            {t.courseDetail.backToCourses}
          </Link>
        </div>
      </div>

      <section className="overflow-hidden border-b border-black/5 bg-apple-gray-950 px-4 py-12 text-white sm:px-6 lg:px-8 lg:py-16">
        <div className="container mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-sm font-semibold uppercase tracking-wide text-apple-blue">{t.courseDetail.heroLabel}</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
                {text(course.title)}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
                {text(course.slogan)}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  [t.courseDetail.city, course.city],
                  [t.courseDetail.courseWeekday, course.weekday],
                  [t.courseDetail.classTime, course.time],
                  [t.courseDetail.meetingPoint, course.meetingPoint],
                  [t.courseDetail.coursePeriod, course.period],
                ].map(([label, value]) => (
                  <span key={`${label}-${value}`} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90">
                    <span className="text-white/50">{label}</span>
                    {text(value)}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="apple-button-primary inline-flex w-full items-center justify-center gap-2 px-6 py-3 lg:w-auto"
            >
              <Instagram className="h-5 w-5" />
              {t.courseDetail.instagramSignup}
            </motion.a>
          </div>
        </div>
      </section>

      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="space-y-16">
            <motion.section initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
              <h2 className="mb-6 text-2xl font-black text-apple-gray-900">{t.courseDetail.trainingItems}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {course.trainingItems.map((item) => (
                  <TrainingItemCard key={item} title={text(item)} description={getTrainingDescription(item, language)} />
                ))}
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
              <h2 className="mb-6 text-2xl font-black text-apple-gray-900">{t.courseDetail.whatYouWillGet}</h2>
              <div className="apple-card grid gap-4 p-6 md:grid-cols-2 md:p-8">
                {course.benefits.map((benefit) => (
                  <BenefitItem key={benefit} text={text(benefit)} />
                ))}
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
              <h2 className="mb-6 text-2xl font-black text-apple-gray-900">{t.courseDetail.coachIntroduction}</h2>
              <CoachCard
                coach={course.coach}
                labels={{
                  photo: t.courseDetail.coachPhotoPlaceholder,
                  photoPending: t.courseDetail.coachPhotoPending,
                  specialties: t.courseDetail.coachSpecialties,
                  style: t.courseDetail.coachStyle,
                  achievements: t.courseDetail.coachAchievements,
                }}
              />
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
              <div className="grid gap-6 md:grid-cols-2">
                <SuitabilityCard type="suitable" title={t.courseDetail.suitableFor} items={course.suitableFor.map(text)} />
                <SuitabilityCard type="notSuitable" title={t.courseDetail.notSuitableFor} items={course.notSuitableFor.map(text)} />
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
              <h2 className="mb-6 text-2xl font-black text-apple-gray-900">{t.courseDetail.howToJoin}</h2>
              <div className="apple-card p-6 md:p-8">
                {t.courseDetail.enrollmentSteps.map((step, index) => (
                  <EnrollmentStep key={step.title} number={index + 1} title={step.title} description={step.description} />
                ))}
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
              <h2 className="mb-6 text-2xl font-black text-apple-gray-900">{t.courseDetail.faqs}</h2>
              <div className="apple-card p-6 md:p-8">
                {course.faq.map((item) => (
                  <FAQItem key={item.question} question={text(item.question)} answer={text(item.answer)} />
                ))}
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </main>
  )
}
