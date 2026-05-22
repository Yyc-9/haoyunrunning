'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { useContext, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock,
  Instagram,
  MapPin,
  Target,
} from 'lucide-react'
import { allCourses, getCourseBySlug } from '@/lib/goodluck-data'
import { LanguageContext } from '@/app/language-context'
import CoursePaymentInfo from '@/components/CoursePaymentInfo'
import CoachCard from '@/components/CoachCard'
import TrainingItemCard from '@/components/TrainingItemCard'
import BenefitItem from '@/components/BenefitItem'
import SuitabilityCard from '@/components/SuitabilityCard'
import FAQItem from '@/components/FAQItem'
import EnrollmentStep from '@/components/EnrollmentStep'

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const router = useRouter()
  const [slug, setSlug] = useState<string | null>(null)
  const [course, setCourse] = useState<any>(null)
  const [isMounted, setIsMounted] = useState(false)
  const languageContext = useContext(LanguageContext)

  if (!languageContext) {
    throw new Error('CourseDetailPage must be used within LanguageProvider')
  }

  const { t } = languageContext

  useEffect(() => {
    params.then((p) => {
      setSlug(p.slug)
    })
  }, [params])

  useEffect(() => {
    if (slug) {
      const foundCourse = getCourseBySlug(slug)
      if (!foundCourse) {
        notFound()
      }
      setCourse(foundCourse)
    }
    setIsMounted(true)
  }, [slug])

  if (!isMounted || !course) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
        <div className="container mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="h-20 animate-pulse rounded-lg bg-apple-gray-100" />
        </div>
      </main>
    )
  }

  function zh(text: string) {
    return text
      .replaceAll('好運', '好运')
      .replaceAll('訓練', '训练')
      .replaceAll('課程', '课程')
      .replaceAll('週', '周')
      .replaceAll('節奏', '节奏')
      .replaceAll('備賽', '备赛')
      .replaceAll('階', '阶')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      {/* 返回按钮 */}
      <div className="sticky top-24 z-40 border-b border-black/5 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-bold text-apple-gray-700 hover:text-apple-blue transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t.courseDetail.backToCourses}
          </Link>
        </div>
      </div>

      {/* 1. Hero 区域 */}
      <section className="border-b border-black/5 bg-gradient-to-b from-apple-blue/5 to-transparent px-4 py-12 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                  {t.courseDetail.courseInfo}
                </p>
                <h1 className="text-4xl font-black leading-tight text-apple-gray-900 md:text-5xl">
                  {zh(course.name)}
                </h1>
                <p className="mt-4 text-lg leading-8 text-apple-gray-600">
                  {course.slogan || '一起穩定累積，一起跑得更遠'}
                </p>

                {/* 核心标签 */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-apple-blue/10 px-4 py-2 text-sm font-semibold text-apple-blue">
                    <MapPin className="h-4 w-4" />
                    {course.location}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-apple-orange/10 px-4 py-2 text-sm font-semibold text-apple-orange">
                    <CalendarDays className="h-4 w-4" />
                    {zh(course.weekday)}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                    <Clock className="h-4 w-4" />
                    {course.period}
                  </span>
                </div>
              </div>

              {/* Instagram 按钮 */}
              <a
                href={course.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="apple-button-primary inline-flex items-center gap-2 px-6 py-3"
              >
                <Instagram className="h-5 w-5" />
                {t.courseDetail.contactInstagram}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 主内容区 */}
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
            {/* 左侧主内容 */}
            <div className="space-y-12">
              {/* 2. 课程核心信息区 */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="mb-6 text-2xl font-black text-apple-gray-900">
                  {t.courseDetail.courseInfo}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {[
                    { icon: Target, label: t.courseDetail.courseLevel, value: course.level || '中級' },
                    {
                      icon: CalendarDays,
                      label: t.courseDetail.coursePeriod,
                      value: course.period,
                    },
                    { icon: MapPin, label: t.courseDetail.courseLocation, value: course.location },
                    {
                      icon: Clock,
                      label: t.courseDetail.classTime,
                      value: course.classTime,
                    },
                    {
                      icon: MapPin,
                      label: t.courseDetail.meetingPoint,
                      value: course.meetingPoint,
                    },
                    {
                      icon: Target,
                      label: '適合新手',
                      value: course.beginnerFriendly ? t.courseDetail.beginnerFriendly : t.courseDetail.notBeginnerFriendly,
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                      <item.icon className="mb-3 h-5 w-5 text-apple-blue" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-apple-gray-500">
                        {item.label}
                      </p>
                      <p className="mt-2 font-bold text-apple-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* 3. 课程内容介绍区 */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="mb-6 text-2xl font-black text-apple-gray-900">
                  {t.courseDetail.trainingItems}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {course.trainingItems.map((item: string) => (
                    <TrainingItemCard key={item} title={zh(item)} />
                  ))}
                </div>
              </motion.section>

              {/* 4. 参加后可以获得什么 */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="mb-6 text-2xl font-black text-apple-gray-900">
                  {t.courseDetail.whatYouWillGet}
                </h2>
                <div className="apple-card space-y-4 p-6 md:p-8">
                  {course.benefits.map((benefit: string) => (
                    <BenefitItem key={benefit} text={zh(benefit)} />
                  ))}
                </div>
              </motion.section>

              {/* 5. 教练介绍区 */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="mb-6 text-2xl font-black text-apple-gray-900">
                  {t.courseDetail.coachIntroduction}
                </h2>
                {course.coaches && course.coaches.length > 0 && (
                  <CoachCard coach={course.coaches[0]} />
                )}
              </motion.section>

              {/* 6. 适合与不适合人群 */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="mb-6 text-2xl font-black text-apple-gray-900">适合人群</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <SuitabilityCard
                    type="suitable"
                    title={t.courseDetail.suitableFor}
                    items={course.suitableFor}
                  />
                  <SuitabilityCard
                    type="notSuitable"
                    title={t.courseDetail.notSuitableFor}
                    items={course.notSuitableFor}
                  />
                </div>
              </motion.section>

              {/* 7. 报名流程 */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="mb-6 text-2xl font-black text-apple-gray-900">
                  {t.courseDetail.howToJoin}
                </h2>
                <div className="apple-card p-6 md:p-8">
                  {t.courseDetail.enrollmentSteps.map((step, index) => (
                    <EnrollmentStep
                      key={step.title}
                      number={index + 1}
                      title={step.title}
                      description={step.description}
                    />
                  ))}
                </div>
              </motion.section>

              {/* 8. FAQ */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="mb-6 text-2xl font-black text-apple-gray-900">
                  {t.courseDetail.faqs}
                </h2>
                <div className="apple-card p-6 md:p-8">
                  {course.faq.map((item: any) => (
                    <FAQItem
                      key={item.question}
                      question={item.question}
                      answer={item.answer}
                    />
                  ))}
                </div>
              </motion.section>
            </div>

            {/* 右侧快速报名卡片 */}
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-6 lg:sticky lg:top-32"
            >
              {/* 9. 快速总览卡片 */}
              <div className="apple-card p-6 md:p-8">
                <h3 className="text-lg font-black text-apple-gray-900">
                  {t.courseDetail.quickOverview}
                </h3>

                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-apple-gray-500">
                      {t.courseDetail.courseLevel}
                    </p>
                    <p className="mt-1 font-bold text-apple-gray-900">
                      {course.level || '中級'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-apple-gray-500">
                      {t.courseDetail.coursePeriod}
                    </p>
                    <p className="mt-1 font-bold text-apple-gray-900">{course.period}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-apple-gray-500">
                      {t.courseDetail.courseLocation}
                    </p>
                    <p className="mt-1 font-bold text-apple-gray-900">{course.location}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-apple-gray-500">
                      {t.courseDetail.courseWeekday}
                    </p>
                    <p className="mt-1 font-bold text-apple-gray-900">{zh(course.weekday)}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-apple-gray-500">
                      時間
                    </p>
                    <p className="mt-1 font-bold text-apple-gray-900">{course.classTime}</p>
                  </div>
                </div>

                <a
                  href={course.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="apple-button-primary mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-2.5"
                >
                  <Instagram className="h-5 w-5" />
                  {t.courseDetail.contactInstagram}
                </a>
              </div>

              {/* 费用信息 */}
              <CoursePaymentInfo compact />
            </motion.aside>
          </div>
        </div>
      </div>
    </main>
  )
}

