'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronRight, Clock, MapPin, Target, Users } from 'lucide-react'
import CoursesTable from '@/components/CoursesTable'
import EnrollmentStep from '@/components/EnrollmentStep'
import FAQItem from '@/components/FAQItem'
import { useLanguage } from '@/app/language-context'
import { useSiteContent } from '@/app/site-content-provider'

type CoursesSectionProps = {
  preview?: boolean
}

export default function CoursesSection({ preview = false }: CoursesSectionProps) {
  const { language, t } = useLanguage()
  const { courses: managedCourses, home } = useSiteContent()
  const sortedCourses = managedCourses
  const courses = preview ? sortedCourses.slice(0, 4) : sortedCourses
  const joinSteps = [
    { title: '查看本期課表', description: '先依照星期、城市與上課時間，找到能穩定參加的班級。' },
    { title: '進入課程詳情', description: '點擊課表中的課程卡片，確認訓練方向、教練與適合對象。' },
    { title: '填寫專屬報名表', description: '在課程詳情最下方點擊「立即報名」，登入後完成資料與計費確認。' },
    { title: '完成匯款與核對', description: '依網站顯示的金額完成匯款並提交後五碼，財務核對後即完成報名。' },
  ]
  const faqItems = Array.from(
    new Map(
      sortedCourses
        .flatMap((course) => course.faq ?? [])
        .map((item) => [item.question, item])
    ).values()
  ).slice(0, 6)

  const localeText = (text: string) => {
    if (language === 'zh-TW') {
      return text
        .replaceAll('好運', '好運')
        .replaceAll('訓練', '訓練')
        .replaceAll('課程', '課程')
        .replaceAll('周', '週')
        .replaceAll('節奏', '節奏')
        .replaceAll('舊生', '舊生')
        .replaceAll('適合', '適合')
        .replaceAll('請', '請')
        .replaceAll('諮詢', '諮詢')
        .replaceAll('費用', '費用')
    }
    if (language === 'zh-CN') {
      return text
        .replaceAll('好運', '好運')
        .replaceAll('訓練', '訓練')
        .replaceAll('課程', '課程')
        .replaceAll('週', '周')
        .replaceAll('節奏', '節奏')
        .replaceAll('舊生', '舊生')
        .replaceAll('費用', '費用')
    }
    return text
  }

  return (
    <section id="courses" className="bg-white py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={false} className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">{preview ? home.coursesLabel : t.courses.sectionLabel}</p>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-3xl font-black text-apple-gray-900 md:text-5xl">
                {preview ? home.coursesTitle : t.courses.title}
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                {preview ? home.coursesDescription : t.courses.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {preview && (
                <Link href="/courses" className="apple-button-primary gap-2 px-5 py-2.5 text-sm">
                  查看完整課表
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </motion.div>

        {preview ? (
          <div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {courses.map((course) => (
                <article key={course.slug} className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 text-sm font-bold text-apple-gray-600">
                    <MapPin className="h-4 w-4 text-apple-blue" />
                    {localeText(course.city || course.location)}
                  </div>
                  <h3 className="text-xl font-black leading-7 text-apple-gray-900">
                    {localeText(course.name)}
                  </h3>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-apple-gray-600">
                    {localeText(course.targetAudience)}
                  </p>
                  <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-apple-gray-100 px-4 py-2 text-sm font-bold text-apple-gray-600">
                    {localeText(course.weekday)} · {localeText(course.classTime)}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Link href="/courses" className="apple-button-secondary inline-flex items-center gap-2 px-6 py-3">
                查看完整課表
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="mb-10">
              <div className="mb-5">
                <p className="text-sm font-bold uppercase tracking-wide text-apple-blue">REGISTRATION GUIDE</p>
                <h3 className="mt-2 text-2xl font-black text-apple-gray-950 sm:text-3xl">如何加入課程？</h3>
              </div>
              <div className="rounded-lg border border-black/10 bg-apple-gray-50 p-5 sm:p-7">
                {joinSteps.map((step, index) => (
                  <EnrollmentStep key={step.title} number={index + 1} title={step.title} description={step.description} />
                ))}
              </div>
            </section>

            <CoursesTable />

            {faqItems.length ? (
              <section className="mt-10">
                <h3 className="mb-5 text-2xl font-black text-apple-gray-950 sm:text-3xl">常見問題</h3>
                <div className="rounded-lg border border-black/10 bg-white p-5 sm:p-7">
                  {faqItems.map((item) => (
                    <FAQItem key={item.question} question={localeText(item.question)} answer={localeText(item.answer)} />
                  ))}
                </div>
              </section>
            ) : null}

          </>
        )}

        {!preview ? (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {t.courses.highlightsDecision.map((item, index) => {
              const Icon = [Clock, Target, Users][index] ?? Clock
              return (
                <div key={item.title} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                  <Icon className="mb-4 h-5 w-5 text-apple-gray-700" />
                  <h3 className="font-bold text-apple-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-apple-gray-600">{item.description}</p>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </section>
  )
}
