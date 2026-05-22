'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronRight, Clock, MapPin, Target, Users } from 'lucide-react'
import { allCourses } from '@/lib/goodluck-data'
import CoursePaymentInfo from '@/components/CoursePaymentInfo'
import { useLanguage } from '@/app/language-context'

const weekdayOrder = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function normalizeWeekday(weekday: string) {
  return weekday.replace('週', '周')
}

export default function CoursesSection() {
  const { language, t } = useLanguage()
  const courses = [...allCourses].sort(
    (a, b) => weekdayOrder.indexOf(normalizeWeekday(a.weekday)) - weekdayOrder.indexOf(normalizeWeekday(b.weekday))
  )
  const localeText = (text: string) => {
    if (language === 'zh-TW') return text.replaceAll('训练', '訓練').replaceAll('课程', '課程').replaceAll('周', '週').replaceAll('节奏', '節奏').replaceAll('旧生', '舊生').replaceAll('适合', '適合').replaceAll('请', '請').replaceAll('咨询', '諮詢')
    if (language === 'zh-CN') return text.replaceAll('訓練', '训练').replaceAll('課程', '课程').replaceAll('週', '周').replaceAll('節奏', '节奏').replaceAll('好運', '好运').replaceAll('舊生', '旧生')
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
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                {t.courses.subtitle}
              </p>
            </div>
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
        </motion.div>

        <div className="mb-8">
          <CoursePaymentInfo />
        </div>

        <div className="apple-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/10 bg-apple-gray-100 text-left">
                  <th className="w-[24%] p-4 font-bold text-apple-gray-900">{t.courses.className}</th>
                  <th className="w-[25%] p-4 font-bold text-apple-gray-900">{t.courses.audienceGoal}</th>
                  <th className="w-[23%] p-4 font-bold text-apple-gray-900">{t.courses.timeLocation}</th>
                  <th className="w-[22%] p-4 font-bold text-apple-gray-900">{t.courses.enrollment}</th>
                  <th className="p-4 font-bold text-apple-gray-900">{t.courses.details}</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.slug} className="border-b border-black/10 last:border-b-0 hover:bg-apple-gray-50">
                    <td className="p-4 align-top">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                          {localeText(normalizeWeekday(course.weekday))}
                        </span>
                        <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-bold text-apple-gray-700">
                          {course.beginnerFriendly ? t.courses.beginnerYes : t.courses.beginnerNo}
                        </span>
                      </div>
                      <Link href={`/courses/${course.slug}`} className="font-bold leading-6 text-apple-gray-900 hover:text-apple-blue">
                        {localeText(course.name)}
                      </Link>
                      <p className="mt-2 text-xs text-apple-gray-500">{localeText(course.groupTitle)}</p>
                      <p className="mt-3 text-xs leading-5 text-apple-gray-500">{t.courses.period}：{localeText(course.period)}</p>
                    </td>
                    <td className="p-4 align-top text-apple-gray-700">
                      <p className="leading-6">{localeText(course.groupAudience)}</p>
                      <p className="mt-2 inline-flex items-start gap-2 leading-6">
                        <Target className="mt-0.5 h-4 w-4 shrink-0 text-apple-blue" />
                        {localeText(course.trainingGoal)}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-apple-gray-500">
                        {t.courses.intensity}：{course.beginnerFriendly ? t.courses.beginnerYes : t.courses.beginnerNo}
                      </p>
                    </td>
                    <td className="p-4 align-top text-apple-gray-700">
                      <p className="inline-flex items-start gap-2 leading-6">
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-apple-blue" />
                        {localeText(course.classTime)}
                      </p>
                      <p className="mt-2 inline-flex items-start gap-2 leading-6">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-apple-blue" />
                        {localeText(course.location)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-apple-gray-500">{localeText(course.meetingPoint)}</p>
                    </td>
                    <td className="p-4 align-top text-apple-gray-700">
                      <p className="font-semibold leading-6 text-apple-gray-900">{t.courses.pricingConsult}</p>
                      <p className="mt-2 text-xs leading-5 text-apple-gray-500">{localeText(course.feeNote)}</p>
                      <div className="mt-3 rounded-2xl bg-apple-gray-100 p-3 text-xs leading-5 text-apple-gray-600">
                        <p>{t.courses.policy}</p>
                        <p className="mt-1">{localeText(course.trialPolicy)}</p>
                        <p className="mt-1">{localeText(course.absencePolicy)}</p>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <Link href={`/courses/${course.slug}`} className="inline-flex items-center gap-1 text-sm font-bold text-apple-blue">
                        {t.courses.viewDetail}
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
