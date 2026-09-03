'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Award, CheckCircle2, FileCheck2, Medal, UsersRound } from 'lucide-react'
import { useSiteContent } from '@/app/site-content-provider'

const badgeSeries = [
  {
    slug: 'full-sub3',
    standard: '全馬 SUB 3',
    name: '閃電征途',
    image: '/achievements/2026/collection-full-sub3.jpg',
    imageClassName: 'object-cover object-left',
    description: '閃電構成 SUB「3」，展現速度與爆發力；融入 U 型馬蹄鐵，象徵競速與好運並存。',
    story: '星芒點綴其中，代表在挑戰中持續突破閃耀。',
  },
  {
    slug: 'full-sub4',
    standard: '全馬 SUB 4',
    name: '成就之星',
    image: '/achievements/2026/collection-full-sub4.jpg',
    imageClassName: 'object-cover object-left',
    description: '放射光芒呈現 SUB4，象徵達標瞬間的榮耀時刻；光芒四射的設計，展現挑戰自我的能量。',
    story: '每位跑者，都是為自己發光的一顆星。',
  },
  {
    slug: 'half-sub100',
    standard: '半馬 SUB 100',
    name: '與影同行',
    image: '/achievements/2026/collection-half-sub2.jpg',
    imageClassName: 'object-cover object-left',
    description: '影子為主視覺，象徵一路上的陪伴與自我對話；SUB 字樣延伸形成「100」，代表為目標付出的努力。',
    story: '你不孤單，陪你到終點的，是一路堅持的自己。',
  },
  {
    slug: 'half-sub2',
    standard: '半馬 SUB 2',
    name: '飛躍跑道',
    image: '/achievements/2026/collection-half-sub100.jpg',
    imageClassName: 'object-cover object-left',
    description: '跑道造型呈現 SUB「2」，日復一日的累積與訓練；每一圈都是汗水與堅持的軌跡。',
    story: '斜向延伸如展翅飛翔，突破極限持續向前。',
  },
] as const

const applicationSteps = [
  '必須為好運跑班學員。',
  '參加正式賽事並達標對應成績。',
  '成績須於加入好運跑班期間內達成。',
  '向各班教練詢問及填寫申請表。',
  '經過審核後通知，並於課堂或指定地點領取徽章。',
]

const originTimeline = [
  ['2025.01', 'SUB Series Concept & Design'],
  ['2025.04', 'First Production'],
  ['2025.06', 'First Award Ceremony · Nurture Running Team Anniversary'],
] as const

export default function AchievementsPage() {
  const { achievements } = useSiteContent()
  const badges = achievements.badges.length ? achievements.badges : badgeSeries
  const steps = achievements.howToSteps.length ? achievements.howToSteps : applicationSteps
  return (
    <main translate="no" className="kinetic-page kinetic-page-gold min-h-screen bg-[#f5f3ef] pt-20 sm:pt-24">
      <section className="kinetic-hero overflow-hidden bg-[#0f0d0c] px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="container mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(520px,1.15fr)] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d6b66c]">{achievements.heroLabel}</p>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              {achievements.heroTitle.split('\n').map((line) => <span key={line} className="block whitespace-pre-line">{line}</span>)}
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-white/90">
              {achievements.heroStrapline}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
              {achievements.heroDescription}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#badge-series" className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-black">
                認識全系列
              </a>
              <a href="#how-to-apply" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-black text-white">
                查看申請方式
              </a>
            </div>
          </div>

          <div className="relative aspect-[6/5] overflow-hidden rounded-2xl border border-white/10 bg-black">
            <Image
              src={achievements.heroImage}
              alt="好運榮耀徽章與達標紀念卡全系列"
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 58vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="kinetic-reveal px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="container mx-auto grid max-w-7xl gap-7 lg:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)] lg:items-center">
          <div className="relative aspect-[6/7] overflow-hidden rounded-2xl bg-white shadow-sm">
            <Image
              src={achievements.originImage}
              alt="手持全馬 SUB 3 好運榮耀徽章"
              fill
              sizes="(max-width: 1023px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9a742d]">{achievements.originLabel}</p>
            <h2 className="mt-3 text-3xl font-black text-apple-gray-950 sm:text-4xl">{achievements.originTitle}</h2>
            <div className="mt-5 space-y-4 text-base leading-8 text-apple-gray-600">
              {achievements.originParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <div className="mt-7 grid gap-3 border-t border-black/10 pt-6 sm:grid-cols-3">
              {originTimeline.map(([date, event]) => (
                <div key={date} className="rounded-xl bg-[#f5f3ef] p-4">
                  <p className="text-xs font-black text-[#9a742d]">{date}</p>
                  <p className="mt-2 text-xs font-bold leading-5 text-apple-gray-700">{event}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="badge-series" className="scroll-mt-28 border-y border-black/10 bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9a742d]">{achievements.collectionLabel}</p>
            <h2 className="mt-3 text-3xl font-black text-apple-gray-950 sm:text-4xl">{achievements.collectionTitle}</h2>
            <p className="mt-4 text-base leading-8 text-apple-gray-600">{achievements.collectionDescription}</p>
          </div>

          <p className="mt-7 text-xs font-bold tracking-wide text-apple-gray-500 md:hidden">
            左右滑動查看全系列
          </p>
          <div
            data-mobile-carousel="badge-series"
            aria-label="好運榮耀徽章全系列"
            className="scrollbar-hidden -mx-4 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-4 pb-3 md:mx-0 md:mt-9 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4"
          >
            {badges.map((badge) => (
              <article key={badge.slug} className="kinetic-card w-[82vw] max-w-[21rem] shrink-0 snap-start overflow-hidden rounded-2xl border border-black/10 bg-[#12100f] text-white shadow-sm md:w-auto md:max-w-none">
                <div className="relative aspect-[2/3]">
                  <Image
                    src={badge.image}
                    alt={`${badge.standard} ${badge.name}徽章`}
                    fill
                    sizes="(max-width: 767px) 100vw, 25vw"
                    className={badge.imageClassName}
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs font-black tracking-[0.14em] text-[#d6b66c]">{badge.standard}</p>
                  <h3 className="mt-2 text-2xl font-black">{badge.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/70">{badge.description}</p>
                  <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-6 text-white/50">{badge.story}</p>
                </div>
              </article>
            ))}
          </div>

          <article className="kinetic-card mt-5 grid overflow-hidden rounded-2xl border border-[#d8c08a] bg-[#f6f0e4] shadow-sm lg:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
            <div className="relative min-h-[28rem]">
              <Image
                src={achievements.bqImage}
                alt="BQ Pride 波士頓馬拉松完賽徽章"
                fill
                sizes="(max-width: 1023px) 100vw, 45vw"
                className="-translate-x-[8%] scale-[1.12] object-cover"
              />
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8b6620]">{achievements.bqLabel}</p>
              <h3 className="mt-3 text-3xl font-black text-[#17120d] sm:text-4xl">{achievements.bqTitle}</h3>
              <p className="mt-2 text-lg font-black text-[#8b6620]">{achievements.bqSubtitle}</p>
              <p className="mt-5 text-base leading-8 text-[#5c5040]">
                {achievements.bqDescription}
              </p>
              <div className="mt-6 rounded-xl border border-[#d8c08a] bg-white/65 p-5">
                <p className="flex items-center gap-2 text-sm font-black text-[#17120d]">
                  <FileCheck2 className="h-4 w-4" />
                  申請資格
                </p>
                <p className="mt-2 text-sm leading-7 text-[#5c5040]">{achievements.bqQualification}</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="kinetic-reveal border-b border-black/10 bg-[#171412] px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d6b66c]">{achievements.milestoneLabel}</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">{achievements.milestoneTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-white/65 sm:text-base">{achievements.milestoneDescription}</p>
          </div>
          <p className="mt-7 text-xs font-bold tracking-wide text-white/55 sm:hidden">
            左右滑動查看全部紀念卡
          </p>
          <div
            data-mobile-carousel="milestone-cards"
            aria-label="好運榮耀徽章達標紀念卡"
            className="scrollbar-hidden -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth px-4 pb-3 sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5"
          >
            {achievements.milestones.map(({ image, alt }) => (
              <div key={image} className="relative aspect-[3/4] w-[72vw] max-w-[17rem] shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 bg-black sm:w-auto sm:max-w-none">
                <Image src={image} alt={alt} fill sizes="(max-width: 639px) 72vw, 20vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-to-apply" className="scroll-mt-28 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="container mx-auto grid max-w-7xl gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.78fr)]">
          <div className="kinetic-card rounded-2xl bg-black p-6 text-white sm:p-8 lg:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
              <Medal className="h-5 w-5" />
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[#d6b66c]">{achievements.howToLabel}</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">{achievements.howToTitle}</h2>
            <div className="mt-7 space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-black">{index + 1}</span>
                  <p className="pt-0.5 text-sm font-semibold leading-6 text-white/78">{step}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs leading-6 text-white/50">{achievements.howToNote}</p>
          </div>

          <div className="space-y-5">
            <div className="kinetic-media relative aspect-square overflow-hidden rounded-2xl bg-white shadow-sm">
              <Image src={achievements.howToImage} alt="跑者手持好運榮耀徽章" fill sizes="(max-width: 1023px) 100vw, 36vw" className="object-cover" />
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <h3 className="font-black text-apple-gray-950">{achievements.verifiedTitle}</h3>
                  <p className="mt-2 text-sm leading-7 text-apple-gray-600">{achievements.verifiedDescription}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="kinetic-card container mx-auto flex max-w-7xl flex-col gap-5 rounded-2xl border border-black/10 bg-apple-gray-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-apple-gray-950">{achievements.accountTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-apple-gray-600">{achievements.accountDescription}</p>
            </div>
          </div>
          <Link href="/profile" className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-black px-6 text-sm font-black text-white sm:w-auto">
            <UsersRound className="mr-2 h-4 w-4" />
            {achievements.accountCta}
          </Link>
        </div>
      </section>
    </main>
  )
}
