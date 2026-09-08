'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, UsersRound } from 'lucide-react'
import { useSiteContent } from '@/app/site-content-provider'
import MobileContextHeader from '@/components/MobileContextHeader'
import { GROUP_DESCRIPTION, groupLineUrl, isGroupPractice } from '@/lib/group-practice'

export default function GroupSignupPageClient() {
  const { activities } = useSiteContent()
  const activity = activities.find(isGroupPractice)

  return (
    <main className="mobile-focused-main min-h-screen bg-white pb-16 pt-24">
      <MobileContextHeader backHref="/" backLabel="首頁" title="團練說明" />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
        <Link href="/" className="mb-10 hidden min-h-11 items-center gap-2 text-sm font-semibold text-apple-gray-600 hover:text-apple-blue md:inline-flex">
          <ArrowLeft className="h-4 w-4" /> 返回首頁
        </Link>
        <p className="mb-4 flex items-center gap-2 font-semibold text-apple-blue"><UsersRound className="h-5 w-5" /> 團練說明</p>
        <h1 className="text-3xl font-black leading-tight text-apple-gray-900 sm:text-5xl">{activity?.title ?? '好運跑班 X 週末團練'}</h1>
        <section aria-labelledby="group-why" className="mt-10">
          <h2 id="group-why" className="mb-5 text-xl font-bold text-apple-gray-900">為什麼我們一起團練</h2>
          <p className="whitespace-pre-wrap break-words text-base leading-8 text-apple-gray-700 sm:text-lg sm:leading-9">{activity?.description ?? GROUP_DESCRIPTION}</p>
        </section>
        <section aria-labelledby="group-join" className="mt-10 rounded-2xl border border-apple-gray-200 bg-apple-gray-50 p-5 sm:p-8">
          <h2 id="group-join" className="text-xl font-bold text-apple-gray-900">如何參加團練</h2>
          <ol className="mt-5 list-decimal space-y-3 pl-5 text-base leading-7 text-apple-gray-700">
            <li>進入 LINE 大家庭，查看當次團練記事本。</li>
            <li>依記事本說明登記參加；需要更改或取消，也請在同一則記事本更新。</li>
            <li>出發前確認群內最新公告的日期、時間與集合地點。</li>
          </ol>
          <p className="mt-6 text-base font-semibold leading-7 text-apple-gray-900">團練報名與人數統計，統一以 LINE 大家庭記事本為準。網站不另外收集報名資料。</p>
          <a href={groupLineUrl(activity?.href)} target="_blank" rel="noreferrer" className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-apple-gray-900 px-4 py-4 text-center font-bold text-white transition-colors hover:bg-apple-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-apple-blue">
            前往 LINE 大家庭報名 <ArrowUpRight className="h-5 w-5 shrink-0" />
          </a>
          <p className="mt-3 text-sm leading-6 text-apple-gray-600">連結會開啟 LINE 社群邀請頁；加入後，請到記事本查看團練公告。</p>
        </section>
      </div>
    </main>
  )
}
