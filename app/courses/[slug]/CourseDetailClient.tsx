'use client'

import Image from 'next/image'
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
import { useSiteContent } from '@/app/site-content-provider'

type CourseDetail = ManagedCourse

type CourseDetailClientProps = {
  course: CourseDetail | null
}

function localizeText(text: string, _language: string) {
  void _language
  return text
}

function compactCourseName(name: string) {
  return name
    .replace(/^2026\s*/, '')
    .replace(/^好運跑步訓練營\s*X\s*/, '')
    .trim()
}

export default function CourseDetailClient({ course }: CourseDetailClientProps) {
  const { language, t } = useLanguage()
  const { courses, brand, coachProfiles, isLoading } = useSiteContent()
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
  const seasonFocus = course.benefits.slice(0, 3)
  const seasonGoal = course.slogan

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
              <p className="text-xs font-bold uppercase tracking-wide text-apple-blue">{course.campaignLabel || t.courseDetail.heroLabel}</p>
              <h1 className="mt-2 max-w-4xl text-3xl font-black leading-[1.08] text-apple-gray-900 md:text-4xl">
                {text(course.title)}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-apple-gray-600">
                {text(course.slogan)}
              </p>
              <div className="mt-4 max-w-3xl">
                <div className="border-l-2 border-apple-blue pl-4">
                  <p className="text-xs font-bold text-apple-gray-400">適合對象</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-apple-gray-700">{text(course.targetAudience)}</p>
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
              <h2 className="mb-6 text-2xl font-black text-apple-gray-900">{t.courseDetail.coachIntroduction}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {courseCoaches.map((coach) => {
                  const profile = Object.values(coachProfiles).find((item) =>
                    item.displayName === coach.name || (
                      Boolean(coach.imageUrl) &&
                      (item.avatarUrl === coach.imageUrl || item.fullBodyImageUrl === coach.imageUrl)
                    )
                  )
                  const imageUrl = profile?.avatarUrl || coach.imageUrl || coach.fullBodyImageUrl
                  const href = profile ? `/team#coach-${profile.coachKey}` : '/team'

                  return (
                    <Link
                      key={coach.name}
                      href={href}
                      className="group rounded-lg border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-md sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-apple-gray-100 ring-1 ring-black/10">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={`${coach.name}教練照片`}
                              fill
                              sizes="56px"
                              className="object-cover"
                              style={{ objectPosition: `${profile?.avatarFocusX ?? coach.avatarFocusX ?? 50}% ${profile?.avatarFocusY ?? coach.avatarFocusY ?? 18}%` }}
                            />
                          ) : (
                            <UsersRound className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-apple-gray-400" />
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-apple-gray-300 transition group-hover:translate-x-0.5 group-hover:text-black" />
                      </div>
                      <h3 className="mt-4 text-lg font-black text-apple-gray-950">{text(coach.name)}</h3>
                      <p className="mt-2 text-xs font-bold text-apple-gray-400">負責班級</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-apple-gray-700">{text(compactCourseName(course.name))}</p>
                      <p className="mt-3 text-xs font-black text-apple-blue">查看團隊資料</p>
                    </Link>
                  )
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 px-5 py-6 sm:px-7 sm:py-8">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-apple-blue">TRAINING BLUEPRINT</p>
                <h2 className="mt-3 text-2xl font-black leading-tight text-apple-gray-950 sm:text-3xl">本季訓練藍圖</h2>
                <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-apple-gray-600">{text(seasonGoal)}</p>
              </div>
              <div className="grid md:grid-cols-3">
                {seasonFocus.map((item, index) => (
                  <article
                    key={item}
                    className={`p-5 sm:p-7 ${index ? 'border-t border-black/10 md:border-l md:border-t-0' : ''}`}
                  >
                    <span className="text-xs font-black text-apple-blue">0{index + 1}</span>
                    <h3 className="mt-3 text-lg font-black leading-7 text-apple-gray-950">{text(item)}</h3>
                  </article>
                ))}
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
                  {course.enrollmentNote ? (
                    <p className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-100">
                      開班提醒：{text(course.enrollmentNote)}
                    </p>
                  ) : null}
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
