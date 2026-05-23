'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronRight, Clock, MapPin, Target, Users } from 'lucide-react'
import { allCourses } from '@/lib/goodluck-data'
import CoursePaymentInfo from '@/components/CoursePaymentInfo'
import CoursesTable from '@/components/CoursesTable'
import { useLanguage } from '@/app/language-context'

type CoursesSectionProps = {
  preview?: boolean
}

const weekdayOrder = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function normalizeWeekday(weekday: string) {
  return weekday.replace('週', '周')
}

export default function CoursesSection({ preview = false }: CoursesSectionProps) {
  const { language, t } = useLanguage()
  const sortedCourses = [...allCourses].sort(
    (a, b) => weekdayOrder.indexOf(normalizeWeekday(a.weekday)) - weekdayOrder.indexOf(normalizeWeekday(b.weekday))
  )
  const courses = preview ? sortedCourses.slice(0, 4) : sortedCourses

  const localeText = (text: string) => {
    if (language === 'zh-TW') {
      return text
        .replaceAll('好运', '好運')
        .replaceAll('训练', '訓練')
        .replaceAll('课程', '課程')
        .replaceAll('周', '週')
        .replaceAll('节奏', '節奏')
        .replaceAll('旧生', '舊生')
        .replaceAll('适合', '適合')
        .replaceAll('请', '請')
        .replaceAll('咨询', '諮詢')
        .replaceAll('费用', '費用')
    }
    if (language === 'zh-CN') {
      return text
        .replaceAll('好運', '好运')
        .replaceAll('訓練', '训练')
        .replaceAll('課程', '课程')
        .replaceAll('週', '周')
        .replaceAll('節奏', '节奏')
        .replaceAll('舊生', '旧生')
        .replaceAll('費用', '费用')
    }
    return text
  }

  return (
    <section id="courses" className="bg-white py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">{t.courses.sectionLabel}</p>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-3xl font-black text-apple-gray-900 md:text-5xl">{t.courses.title}</h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">{t.courses.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {preview && (
                <Link href="/courses" className="apple-button-primary gap-2 px-5 py-2.5 text-sm">
                  {t.courses.viewAll}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
              <a
                href="https://www.instagram.com/nurture.running.team/"
                target="_blank"
                rel="noreferrer"
                className="apple-button-secondary gap-2 px-5 py-2.5 text-sm"
              >
                {t.courses.consultCta}
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </motion.div>

        {preview ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {courses.map((course) => (
              <article key={course.slug} className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                      {localeText(normalizeWeekday(course.weekday))}
                    </span>
                    <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-bold text-apple-gray-700">
                      {course.beginnerFriendly ? t.courses.beginnerYes : t.courses.beginnerNo}
                    </span>
                  </div>
                  <Link href={`/courses/${course.slug}`} className="text-xl font-black leading-7 text-apple-gray-900 hover:text-apple-blue">
                    {localeText(course.name)}
                  </Link>
                  <p className="mt-2 text-sm text-apple-gray-500">{localeText(course.groupTitle)}</p>
                </div>
                <Link href={`/courses/${course.slug}`} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-apple-blue">
                  {t.courses.viewDetail}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-apple-gray-100 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-apple-gray-500">{t.courses.audienceGoal}</p>
                  <p className="text-sm leading-6 text-apple-gray-700">{localeText(course.groupAudience)}</p>
                  <p className="mt-2 text-xs font-semibold text-apple-gray-500">{t.courses.intensity}：{course.beginnerFriendly ? t.courses.beginnerYes : t.courses.beginnerNo}</p>
                </div>

                <div className="rounded-2xl bg-apple-gray-100 p-4">
                  <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-apple-gray-500">
                    <Target className="h-3.5 w-3.5" />
                    {t.courses.trainingGoal}
                  </p>
                  <p className="text-sm leading-6 text-apple-gray-700">{localeText(course.trainingGoal)}</p>
                </div>

                <div className="rounded-2xl bg-apple-gray-100 p-4">
                  <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-apple-gray-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t.courses.timeLocation}
                  </p>
                  <p className="text-sm leading-6 text-apple-gray-700">{localeText(course.classTime)}</p>
                  <p className="mt-2 inline-flex items-start gap-2 text-sm leading-6 text-apple-gray-700">
                    <MapPin className="mt-1 h-3.5 w-3.5 shrink-0" />
                    {localeText(course.location)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-apple-gray-500">{localeText(course.meetingPoint)}</p>
                  <p className="mt-2 text-xs leading-5 text-apple-gray-500">{t.courses.period}：{localeText(course.period)}</p>
                </div>

                <div className="rounded-2xl bg-black p-4 text-white">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/50">{t.courses.enrollment}</p>
                  <p className="text-sm font-semibold leading-6">{t.courses.pricingConsult}</p>
                  {preview && <p className="mt-2 text-xs leading-5 text-white/60">{localeText(course.feeNote)}</p>}
                </div>
              </div>
            </article>
          ))}
          </div>
        ) : (
          <CoursesTable />
        )}

        {!preview && (
          <>
            <div className="mt-8">
              <CoursePaymentInfo />
            </div>

            <div className="mt-8 rounded-3xl bg-apple-gray-100 p-6">
              <h3 className="text-xl font-black text-apple-gray-900">{t.courses.signupNotesTitle}</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {t.courses.signupNotes.map((note) => (
                  <p key={note} className="rounded-2xl bg-white p-4 text-sm leading-6 text-apple-gray-600">
                    {note}
                  </p>
                ))}
              </div>
            </div>
          </>
        )}

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
      </div>
    </section>
  )
}
