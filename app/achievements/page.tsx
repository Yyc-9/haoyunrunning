import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Award, CheckCircle2, FileCheck2, Medal, UsersRound } from 'lucide-react'

export const metadata: Metadata = {
  title: '榮耀徽章 - 好運跑班',
  description: '認識好運榮耀徽章全系列的設計故事、達標標準與申請方式。',
}

const badgeSeries = [
  {
    slug: 'full-sub3',
    standard: '全馬 SUB 3',
    name: '閃電征途',
    image: '/achievements/2026/full-sub3.jpg',
    description: '「3」以閃電型態呈現，結合好運馬蹄鐵 Logo，象徵速度與力量在長期訓練中彼此成就。',
    story: '跑進三小時從來不是一次偶然的爆發，而是配速、耐力、恢復與意志長時間累積後的結果。',
  },
  {
    slug: 'full-sub4',
    standard: '全馬 SUB 4',
    name: '成就之星',
    image: '/achievements/2026/full-sub4.jpg',
    description: '努力達標後的每一個人都是耀眼的星。不為追逐別人的目光，而是專注成就更好的自己。',
    story: '四小時是一道清楚的全馬里程碑，也記錄著跑者在訓練週期裡一次次把承諾完成。',
  },
  {
    slug: 'half-sub100',
    standard: '半馬 SUB 100',
    name: '與影同行',
    image: '/achievements/2026/half-sub100.jpg',
    description: '「總會有人陪你進終點：你的影子。」呼應琦琦教練的話，陪伴跑者繼續前行。',
    story: '跑進一百分鐘，需要速度，也需要在後半程守住節奏。影子始終同行，就像那些無人看見的練習。',
  },
  {
    slug: 'half-sub2',
    standard: '半馬 SUB 2',
    name: '飛越跑道',
    image: '/achievements/2026/full-sub2.jpg',
    description: '田徑場記錄著每位跑者揮灑汗水、完成課表並突破極限的過程。',
    story: '今天要跑幾個圈？每一圈看似相同，累積起來卻會讓跑者真正飛越原本的自己。',
  },
] as const

const applicationSteps = [
  '必須為好運跑班成員。',
  '僅採計加入跑班後，於正式賽事達標的完賽成績。',
  '完賽成績需符合對應徽章標準，並提供可核對的成績證明。',
  '至所屬跑班 LINE 群組依當期公告填寫申請表。',
  '通過核對後，於週年活動頒發或由跑班安排領取。',
]

export default function AchievementsPage() {
  return (
    <main className="min-h-screen bg-[#f5f3ef] pt-20 sm:pt-24">
      <section className="overflow-hidden bg-[#0f0d0c] px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="container mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(520px,1.15fr)] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d6b66c]">GOOD LUCK HONOR PINS</p>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">好運榮耀徽章</h1>
            <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-white/90">
              一枚徽章，記住一段真正跑過的路。
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
              全系列以黑、金、白為核心，將馬蹄鐵、閃電、星芒、跑道與獨角獸化成跑者的達標記號。它不是商品，而是加入好運之後，用正式賽事成績換來的紀念。
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
              src="/achievements/2026/series-grid.jpg"
              alt="好運榮耀徽章全系列"
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 58vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="container mx-auto grid max-w-7xl gap-7 lg:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)] lg:items-center">
          <div className="relative aspect-[6/7] overflow-hidden rounded-2xl bg-white shadow-sm">
            <Image
              src="/achievements/2026/series-overview.jpg"
              alt="大理石背景上的好運榮耀徽章"
              fill
              sizes="(max-width: 1023px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9a742d]">THE ORIGIN</p>
            <h2 className="mt-3 text-3xl font-black text-apple-gray-950 sm:text-4xl">為什麼要做一套屬於跑者的徽章？</h2>
            <div className="mt-5 space-y-4 text-base leading-8 text-apple-gray-600">
              <p>一場比賽只留下一個完賽時間，但真正改變跑者的，是為了那個時間經歷過的清晨、夜晚、疲勞與堅持。</p>
              <p>好運榮耀徽章把這些過程濃縮成可以被保存的記號。每一款對應一道清楚的成績門檻，也對應一段只有完成訓練的人才懂的故事。</p>
              <p>它不比較誰更值得被看見，而是讓每位達標的跑者，都能看見自己曾經認真走過的路。</p>
            </div>
          </div>
        </div>
      </section>

      <section id="badge-series" className="scroll-mt-28 border-y border-black/10 bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9a742d]">THE COLLECTION</p>
            <h2 className="mt-3 text-3xl font-black text-apple-gray-950 sm:text-4xl">全系列五款榮耀徽章</h2>
            <p className="mt-4 text-base leading-8 text-apple-gray-600">四款對應全馬與半馬達標標準，第五款 BQ Pride 獻給完成波士頓馬拉松的跑者。</p>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {badgeSeries.map((badge) => (
              <article key={badge.slug} className="overflow-hidden rounded-2xl border border-black/10 bg-[#12100f] text-white shadow-sm">
                <div className="relative aspect-[2/3]">
                  <Image src={badge.image} alt={`${badge.standard} ${badge.name}徽章`} fill sizes="(max-width: 767px) 100vw, 25vw" className="object-cover" />
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

          <article className="mt-5 grid overflow-hidden rounded-2xl border border-[#d8c08a] bg-[#f6f0e4] shadow-sm lg:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
            <div className="relative min-h-[28rem]">
              <Image
                src="/achievements/2026/bq-pride.jpg"
                alt="BQ Pride 波士頓馬拉松完賽徽章"
                fill
                sizes="(max-width: 1023px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8b6620]">BOSTON MARATHON SPECIAL</p>
              <h3 className="mt-3 text-3xl font-black text-[#17120d] sm:text-4xl">BQ Pride</h3>
              <p className="mt-2 text-lg font-black text-[#8b6620]">獻給真正完成波士頓馬拉松的你</p>
              <p className="mt-5 text-base leading-8 text-[#5c5040]">
                You start as a runner. You finish as a Boston Marathoner. 為了踏上波馬起跑線，跑者犧牲無數清晨與夜晚；曾為達標門檻拼盡全力，也曾為夢想燃燒到底。那份執著，值得一枚專屬的獨角獸勳章。
              </p>
              <div className="mt-6 rounded-xl border border-[#d8c08a] bg-white/65 p-5">
                <p className="flex items-center gap-2 text-sm font-black text-[#17120d]">
                  <FileCheck2 className="h-4 w-4" />
                  申請資格
                </p>
                <p className="mt-2 text-sm leading-7 text-[#5c5040]">提供當年度波士頓馬拉松正式完賽證明，經核對後依當期公告領取。</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="border-b border-black/10 bg-[#171412] px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d6b66c]">MILESTONE CARDS</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">每一道成績，都有一張專屬紀念</h2>
            <p className="mt-4 text-sm leading-7 text-white/65 sm:text-base">達標紀念卡會和榮耀徽章一起留下賽事、成績與跑者姓名，讓突破不只存在於成績查詢頁裡。</p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ['/achievements/2026/claim-sub3.jpg', '全馬 SUB 3 達標紀念卡'],
              ['/achievements/2026/claim-sub4.jpg', '全馬 SUB 4 達標紀念卡'],
              ['/achievements/2026/claim-sub100.jpg', '半馬 SUB 100 達標紀念卡'],
              ['/achievements/2026/claim-sub2.jpg', '半馬 SUB 2 達標紀念卡'],
              ['/achievements/2026/claim-bq-pride.jpg', 'BQ Pride 達標紀念卡'],
            ].map(([src, alt]) => (
              <div key={src} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-black">
                <Image src={src} alt={alt} fill sizes="(max-width: 639px) 50vw, 20vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-to-apply" className="scroll-mt-28 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="container mx-auto grid max-w-7xl gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.78fr)]">
          <div className="rounded-2xl bg-black p-6 text-white sm:p-8 lg:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
              <Medal className="h-5 w-5" />
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[#d6b66c]">HOW TO EARN</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">如何取得好運榮耀徽章</h2>
            <div className="mt-7 space-y-4">
              {applicationSteps.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-black">{index + 1}</span>
                  <p className="pt-0.5 text-sm font-semibold leading-6 text-white/78">{step}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs leading-6 text-white/50">每年度申請期間與領發安排不同，請以所屬跑班 LINE 群組的當期公告為準。</p>
          </div>

          <div className="space-y-5">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-white shadow-sm">
              <Image src="/achievements/2026/collection-cards.jpg" alt="好運榮耀徽章完整收藏卡" fill sizes="(max-width: 1023px) 100vw, 36vw" className="object-cover" />
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <h3 className="font-black text-apple-gray-950">成績核對後才正式取得</h3>
                  <p className="mt-2 text-sm leading-7 text-apple-gray-600">申請資料會依正式賽事成績與跑班成員資格核對。徽章不是報名贈品，也不能單獨購買。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="container mx-auto flex max-w-7xl flex-col gap-5 rounded-2xl border border-black/10 bg-apple-gray-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-apple-gray-950">查看你已經取得的徽章</h2>
              <p className="mt-2 text-sm leading-6 text-apple-gray-600">登入個人帳戶後，可查看解鎖狀態與實際取得原因。</p>
            </div>
          </div>
          <Link href="/profile" className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-black px-6 text-sm font-black text-white sm:w-auto">
            <UsersRound className="mr-2 h-4 w-4" />
            前往個人帳戶
          </Link>
        </div>
      </section>
    </main>
  )
}
