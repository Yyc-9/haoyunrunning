'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, Clock, MapPin, Target, Users } from 'lucide-react'
import CoursesTable from '@/components/CoursesTable'
import FAQItem from '@/components/FAQItem'
import { useLanguage } from '@/app/language-context'
import { useSiteContent } from '@/app/site-content-provider'

type CoursesSectionProps = {
  preview?: boolean
}

export default function CoursesSection({ preview = false }: CoursesSectionProps) {
  const { language, t } = useLanguage()
  const { courses: managedCourses } = useSiteContent()
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
    <section id="courses" className="bg-white">
      {preview ? (
        <>
          <div className="relative isolate flex min-h-[500px] overflow-hidden text-white sm:min-h-[560px]">
            <Image
              src="/site-visuals/hero-2026/home-courses.webp"
              alt="好運跑班教練與跑者賽前集結"
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/55" />
            <div className="container relative z-10 mx-auto flex w-full max-w-7xl items-center px-5 py-16 sm:px-8 lg:px-12">
              <div className="max-w-3xl">
                <p className="text-sm font-black tracking-wide text-amber-300">訓練日程</p>
                <h2 className="mt-4 text-4xl font-black sm:text-6xl">課程預覽</h2>
                <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-xl sm:leading-9">
                  首頁整理本期代表班級，完整時間、訓練內容、費用與報名說明請進入課程頁查看。
                </p>
                <Link href="/courses" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-white/90">
                  查看完整課表
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
                查看完整課表
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="relative isolate flex min-h-[520px] overflow-hidden text-white sm:min-h-[620px]">
            <Image
              src="/site-visuals/hero-2026/home-courses.webp"
              alt="好運跑班本期課程預覽"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/50" />
            <div className="container relative z-10 mx-auto flex w-full max-w-7xl items-start px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
              <div className="max-w-4xl">
                <p className="text-sm font-black tracking-wide text-amber-200">訓練日程</p>
                <h1 className="mt-4 text-4xl font-black sm:text-6xl">訓練日程表</h1>
                <p className="mt-6 max-w-3xl text-base leading-8 text-white/85 sm:text-xl sm:leading-9">
                  先看適合對象、訓練目標、時間地點與報名方式，不進入詳情頁也能初步判斷是否適合。
                </p>
              </div>
            </div>
          </div>

          <section className="border-b border-black/10 bg-white px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="container mx-auto max-w-7xl">
              <p className="text-sm font-black uppercase tracking-wide text-apple-blue">REGISTRATION GUIDE</p>
              <h2 className="mt-3 text-3xl font-black text-apple-gray-950 sm:text-4xl">如何加入課程？</h2>
              <div className="mt-8 grid gap-7 md:grid-cols-2 xl:grid-cols-4">
                {joinSteps.map((step, index) => (
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

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {t.courses.highlightsDecision.map((item, index) => {
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
