'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronRight, Clock, MapPin, Target, Users } from 'lucide-react'
import { allCourses } from '@/lib/goodluck-data'
import CoursePaymentInfo from '@/components/CoursePaymentInfo'

const weekdayOrder = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function normalizeWeekday(weekday: string) {
  return weekday.replace('週', '周')
}

export default function CoursesSection() {
  const courses = [...allCourses].sort(
    (a, b) => weekdayOrder.indexOf(normalizeWeekday(a.weekday)) - weekdayOrder.indexOf(normalizeWeekday(b.weekday))
  )

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
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">Training schedule</p>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-3xl font-black text-apple-gray-900 md:text-5xl">训练课程日程大表</h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                以日程表汇总所有班级，按星期、地点、周期与训练重点快速比较。点击课程名称即可查看专属详情页与教练介绍。
              </p>
            </div>
            <a
              href="https://www.instagram.com/nurture.running.team/"
              target="_blank"
              rel="noreferrer"
              className="apple-button-secondary gap-2 px-5 py-2.5 text-sm"
            >
              咨询适合班级
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </motion.div>

        <div className="mb-8">
          <CoursePaymentInfo />
        </div>

        <div className="apple-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/10 bg-apple-gray-100 text-left">
                  <th className="w-28 p-4 font-bold text-apple-gray-900">星期</th>
                  <th className="w-[30%] p-4 font-bold text-apple-gray-900">课程</th>
                  <th className="p-4 font-bold text-apple-gray-900">地点</th>
                  <th className="p-4 font-bold text-apple-gray-900">周期</th>
                  <th className="w-[28%] p-4 font-bold text-apple-gray-900">训练重点</th>
                  <th className="p-4 font-bold text-apple-gray-900">详情</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.slug} className="border-b border-black/10 last:border-b-0 hover:bg-apple-gray-50">
                    <td className="p-4 align-top">
                      <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                        {normalizeWeekday(course.weekday)}
                      </span>
                    </td>
                    <td className="p-4 align-top">
                      <Link href={`/courses/${course.slug}`} className="font-bold leading-6 text-apple-gray-900 hover:text-apple-blue">
                        {course.name.replaceAll('訓練營', '训练营').replaceAll('週', '周')}
                      </Link>
                      <p className="mt-2 text-xs text-apple-gray-500">{course.groupTitle.replaceAll('運', '运').replaceAll('課程', '课程')}</p>
                    </td>
                    <td className="p-4 align-top text-apple-gray-700">
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-apple-blue" />
                        {course.location}
                      </span>
                    </td>
                    <td className="p-4 align-top text-apple-gray-700">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-apple-blue" />
                        {course.period}
                      </span>
                    </td>
                    <td className="p-4 align-top text-apple-gray-700">
                      <span className="inline-flex items-start gap-2 leading-6">
                        <Target className="mt-0.5 h-4 w-4 shrink-0 text-apple-blue" />
                        {course.focus.replaceAll('訓練', '训练').replaceAll('節奏', '节奏')}
                      </span>
                    </td>
                    <td className="p-4 align-top">
                      <Link href={`/courses/${course.slug}`} className="inline-flex items-center gap-1 text-sm font-bold text-apple-blue">
                        查看
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
          {[
            { icon: Clock, title: '12 周周期', description: '课程集中在 4 月至 6 月，适合完整建立训练节奏。' },
            { icon: Target, title: '多目标备赛', description: '覆盖 5000m、10000m、半马、全马与 PB 目标。' },
            { icon: Users, title: '多地团练', description: '台北、新竹、竹北、板桥、三重、竹南等班级同步整理。' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <item.icon className="mb-4 h-5 w-5 text-apple-gray-700" />
              <h3 className="font-bold text-apple-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-apple-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
