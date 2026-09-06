'use client'

import Link from 'next/link'
import { ArrowLeft, BookOpenCheck, CalendarDays, Instagram, UsersRound } from 'lucide-react'
import { useLanguage } from '@/app/language-context'
import LeadCollectionForm from '@/components/LeadCollectionForm'
import { useSiteContent } from '@/app/site-content-provider'
import MobileContextHeader from '@/components/MobileContextHeader'

function localizeCourseTitle(title: string, language: string) {
  if (language === 'zh-CN') {
    return title
      .replaceAll('好運', '好運')
      .replaceAll('訓練', '訓練')
      .replaceAll('週', '周')
      .replaceAll('課程', '課程')
      .replaceAll('補習班', '补習班')
  }

  return title
}

export default function GroupSignupPageClient() {
  const { language, t } = useLanguage()
  const { brand, courses } = useSiteContent()
  const courseOptions = courses.map((course) => localizeCourseTitle(course.title, language))

  return (
    <main className="mobile-focused-main mobile-activity-page min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <MobileContextHeader backHref="/" backLabel="首頁" title={t.groupSignup.title} />
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <Link href="/" className="mobile-activity-native-back mb-8 inline-flex items-center gap-2 text-sm font-bold text-apple-gray-700 hover:text-apple-blue">
            <ArrowLeft className="h-4 w-4" />
            {t.groupSignup.backHome}
          </Link>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                <UsersRound className="h-4 w-4" />
                {t.groupSignup.label}
              </p>
              <h1 className="text-4xl font-black leading-tight text-apple-gray-900 md:text-6xl">
                {t.groupSignup.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-apple-gray-600">
                {t.groupSignup.subtitle}
              </p>
            </div>
            <a
              href={brand.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="apple-button-outline inline-flex items-center justify-center gap-2 px-6 py-3"
            >
              <Instagram className="h-5 w-5" />
              {t.groupSignup.instagramCta}
            </a>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <aside className="space-y-5">
              <section className="apple-card p-7">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-apple-blue to-apple-orange text-white">
                  <BookOpenCheck className="h-7 w-7" />
                </div>
                <h2 className="text-2xl font-black text-apple-gray-900">{t.groupSignup.infoTitle}</h2>
                <p className="mt-4 leading-7 text-apple-gray-600">{t.groupSignup.infoDescription}</p>
              </section>

              <section className="apple-card p-7">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-apple-gray-900 text-white">
                  <CalendarDays className="h-7 w-7" />
                </div>
                <h2 className="text-2xl font-black text-apple-gray-900">{t.groupSignup.nextTitle}</h2>
                <div className="mt-5 space-y-3">
                  {t.groupSignup.nextSteps.map((step) => (
                    <div key={step} className="rounded-2xl bg-apple-gray-100 px-4 py-3 text-sm font-semibold text-apple-gray-800">
                      {step}
                    </div>
                  ))}
                </div>
              </section>
            </aside>

            <LeadCollectionForm
              source="group_class"
              labels={t.leadForm}
              selectField={{
                name: 'preferredCourse',
                label: t.groupSignup.courseLabel,
                options: courseOptions,
              }}
            />
          </div>
        </div>
      </section>
    </main>
  )
}
