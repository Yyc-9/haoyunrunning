'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, Clock, MapPin, Target, Users } from 'lucide-react'
import CoursesTable from '@/components/CoursesTable'
import FAQItem from '@/components/FAQItem'
import { useLanguage } from '@/app/language-context'
import { useSiteContent } from '@/app/site-content-provider'
import { toSimplifiedWebsiteText, toTraditionalWebsiteText } from '@/lib/traditional-chinese'

type CoursesSectionProps = {
  preview?: boolean
}

export default function CoursesSection({ preview = false }: CoursesSectionProps) {
  const { language } = useLanguage()
  const { courses: managedCourses, home, coursesPage, pageMedia } = useSiteContent()
  const sortedCourses = managedCourses
  const courses = preview ? sortedCourses.slice(0, 4) : sortedCourses
  const localeText = (text: string) => {
    if (language === 'zh-CN') return toSimplifiedWebsiteText(text)
    if (language === 'zh-TW') return toTraditionalWebsiteText(text)
    return text
  }

  return (
    <section id="courses" className="bg-white">
      {preview ? (
        <>
          <div className="relative isolate flex min-h-[500px] overflow-hidden text-white sm:min-h-[560px]">
            <Image
              src={pageMedia.homeCoursesHero}
              alt="好運跑班教練與跑者賽前集結"
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/55" />
            <div className="container relative z-10 mx-auto flex w-full max-w-7xl items-center px-5 py-16 sm:px-8 lg:px-12">
              <div className="max-w-3xl">
                <p className="text-sm font-black tracking-wide text-amber-300">{home.coursesLabel}</p>
                <h2 className="mt-4 text-4xl font-black sm:text-6xl">{home.coursesTitle}</h2>
                <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-xl sm:leading-9">
                  {home.coursesDescription}
                </p>
                <Link href="/courses" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-white/90">
                  {home.coursesCtaLabel}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {courses.map((course) => (
                <article key={course.slug} className="rounded-3xl border border-black/10 bg-white p-6">
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
                {home.coursesCtaLabel}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
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
