'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronRight, Clock, MapPin, Target, Users, X } from 'lucide-react'
import CoursesTable from '@/components/CoursesTable'
import FAQItem from '@/components/FAQItem'
import { useLanguage } from '@/app/language-context'
import { useSiteContent } from '@/app/site-content-provider'
import type { ManagedCourse } from '@/lib/managed-courses'
import { toSimplifiedWebsiteText, toTraditionalWebsiteText } from '@/lib/traditional-chinese'

type CoursesSectionProps = {
  preview?: boolean
}

const ENTRANCE_EASE = [0.16, 1, 0.3, 1] as const

export default function CoursesSection({ preview = false }: CoursesSectionProps) {
  const { language } = useLanguage()
  const { courses: managedCourses, home, coursesPage, pageMedia } = useSiteContent()
  const prefersReducedMotion = useReducedMotion()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [selectedCourse, setSelectedCourse] = useState<ManagedCourse | null>(null)
  const sortedCourses = managedCourses
  const courses = preview ? sortedCourses.slice(0, 4) : sortedCourses
  const localeText = (text: string) => {
    if (language === 'zh-CN') return toSimplifiedWebsiteText(text)
    if (language === 'zh-TW') return toTraditionalWebsiteText(text)
    return text
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (selectedCourse && dialog && !dialog.open) dialog.showModal()
  }, [selectedCourse])

  const closeCoursePreview = () => {
    dialogRef.current?.close()
  }

  const entranceTransition = (delay = 0) => prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.62, delay, ease: [0.16, 1, 0.3, 1] as const }

  return (
    <section id="courses" className="bg-white">
      {preview ? (
        <>
          <div className="home-course-preview-hero group relative isolate flex min-h-[500px] overflow-hidden text-white sm:min-h-[560px]">
            <Image
              src={pageMedia.homeCoursesHero}
              alt="好運跑班教練與跑者賽前集結"
              fill
              sizes="100vw"
              className="home-course-preview-image object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/55" />
            <div className="container relative z-10 mx-auto flex w-full max-w-7xl items-center px-5 py-16 sm:px-8 lg:px-12">
              <motion.div
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={entranceTransition()}
                className="max-w-3xl"
              >
                <p className="text-sm font-black tracking-wide text-amber-300">{home.coursesLabel}</p>
                <h2 className="mt-4 text-4xl font-black sm:text-6xl">{home.coursesTitle}</h2>
                <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-xl sm:leading-9">
                  {home.coursesDescription}
                </p>
                <Link href="/courses" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-white/90">
                  {home.coursesCtaLabel}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </div>
          </div>

          <div className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {courses.map((course, index) => (
                <motion.button
                  key={course.slug}
                  type="button"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={prefersReducedMotion ? undefined : { y: -7, transition: { duration: 0.22, ease: ENTRANCE_EASE } }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                  viewport={{ once: true, amount: 0.28 }}
                  transition={entranceTransition(index * 0.06)}
                  onClick={() => setSelectedCourse(course)}
                  className="group relative flex min-h-[290px] w-full flex-col justify-between overflow-hidden rounded-3xl border border-black/10 bg-white p-6 text-left shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-apple-blue/35 hover:shadow-xl hover:shadow-black/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-apple-blue/25"
                  aria-label={`快速預覽${localeText(course.name)}`}
                >
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-apple-blue transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100" />
                  <div>
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
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-black/10 pt-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-apple-gray-100 px-4 py-2 text-sm font-bold text-apple-gray-600">
                      {localeText(course.weekday)} · {localeText(course.classTime)}
                    </span>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-apple-blue/10 text-apple-blue transition-[transform,background-color,color] duration-200 group-hover:-rotate-6 group-hover:bg-apple-blue group-hover:text-white group-focus-visible:-rotate-6 group-focus-visible:bg-apple-blue group-focus-visible:text-white">
                      <ChevronRight className="h-5 w-5" />
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Link href="/courses" className="apple-button-secondary inline-flex items-center gap-2 px-6 py-3">
                {home.coursesCtaLabel}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <dialog
            ref={dialogRef}
            className="home-course-dialog m-auto w-[calc(100vw-2rem)] max-w-[650px] overflow-hidden rounded-3xl border-0 bg-white p-0 text-apple-gray-900 shadow-2xl"
            aria-labelledby="home-course-preview-title"
            onClose={() => setSelectedCourse(null)}
            onClick={(event) => {
              if (event.target === event.currentTarget) closeCoursePreview()
            }}
          >
            {selectedCourse ? (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={entranceTransition()}
                className="p-6 sm:p-8"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-sm font-black text-apple-blue">
                      {localeText(selectedCourse.city || selectedCourse.location)} 快速預覽
                    </p>
                    <h2 id="home-course-preview-title" className="mt-2 text-2xl font-black leading-tight text-apple-gray-950 sm:text-3xl">
                      {localeText(selectedCourse.name)}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeCoursePreview}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-apple-gray-100 text-apple-gray-700 transition hover:bg-apple-gray-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-apple-blue/25 active:scale-[0.98]"
                    aria-label="關閉課程預覽"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-6 leading-7 text-apple-gray-600">
                  {localeText(selectedCourse.targetAudience)}
                </p>
                <div className="mt-6 grid gap-3 rounded-2xl bg-apple-gray-100 p-4 text-sm font-bold text-apple-gray-700 sm:grid-cols-2">
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-apple-blue" />
                    {localeText(selectedCourse.city || selectedCourse.location)}
                  </p>
                  <p className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-apple-blue" />
                    {localeText(selectedCourse.weekday)} · {localeText(selectedCourse.classTime)}
                  </p>
                </div>
                <p className="mt-5 border-l-2 border-apple-blue pl-4 text-sm font-semibold leading-7 text-apple-gray-700">
                  {localeText(selectedCourse.focus)}
                </p>
                <Link
                  href={`/courses/${selectedCourse.slug}`}
                  onClick={closeCoursePreview}
                  className="apple-button-primary mt-7 inline-flex items-center gap-2 px-6 py-3"
                >
                  查看課程詳情
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>
            ) : null}
          </dialog>
        </>
      ) : (
        <>
          <div className="relative isolate flex min-h-[520px] overflow-hidden text-white sm:min-h-[620px]">
            <Image
              src={pageMedia.coursesHero}
              alt="好運跑班本期課程預覽"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/50" />
            <div className="container relative z-10 mx-auto flex w-full max-w-7xl items-start px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
              <div className="max-w-4xl">
                <p className="text-sm font-black tracking-wide text-amber-200">{coursesPage.heroLabel}</p>
                <h1 className="mt-4 text-4xl font-black sm:text-6xl">{coursesPage.heroTitle}</h1>
                <p className="mt-6 max-w-3xl text-base leading-8 text-white/85 sm:text-xl sm:leading-9">
                  {coursesPage.heroDescription}
                </p>
              </div>
            </div>
          </div>

          <section className="border-b border-black/10 bg-white px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="container mx-auto max-w-7xl">
              <p className="text-sm font-black uppercase tracking-wide text-apple-blue">{coursesPage.guideLabel}</p>
              <h2 className="mt-3 text-3xl font-black text-apple-gray-950 sm:text-4xl">{coursesPage.guideTitle}</h2>
              <div className="mt-8 grid gap-7 md:grid-cols-2 xl:grid-cols-4">
                {coursesPage.guideSteps.map((step, index) => (
                  <article key={step.title} className="flex gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-apple-blue text-lg font-black text-white">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-apple-gray-950">{step.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-apple-gray-600">{step.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <div className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <CoursesTable />

            {coursesPage.faqs.length ? (
              <section className="mt-10">
                <h3 className="mb-5 text-2xl font-black text-apple-gray-950 sm:text-3xl">{coursesPage.faqTitle}</h3>
                <div className="rounded-lg border border-black/10 bg-white p-5 sm:p-7">
                  {coursesPage.faqs.map((item) => (
                    <FAQItem key={item.title} question={localeText(item.title)} answer={localeText(item.description)} />
                  ))}
                </div>
              </section>
            ) : null}

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {coursesPage.highlights.map((item, index) => {
                const Icon = [Clock, Target, Users][index] ?? Clock
                return (
                  <div key={item.title} className="rounded-2xl border border-black/10 bg-white p-5">
                    <Icon className="mb-4 h-5 w-5 text-apple-gray-700" />
                    <h3 className="font-bold text-apple-gray-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-apple-gray-600">{item.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
