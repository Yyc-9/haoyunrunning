import type { HomeActivity } from './site-content'

export const GROUP_PRACTICE_PATH = '/group-signup'

export const GROUP_DESCRIPTION = '週末，一個人跑是練習，一群人跑是好運！\n\n有同學、教練相約，用「輕鬆跑」或「長距離」練習，累積跑量，也享受一起運動的時光，\n大家依自己的狀態與配速，找合拍的夥伴一起跑步。\n\n團練位於台北、新竹兩地舉辦，\n安排在週末，日期、時間與集合地點依每次公告為準。\n\n好運跑班學員皆可「免費」報名，也歡迎邀請朋友一起參加！'

export function isGroupPractice(activity: HomeActivity) {
  return activity.href === GROUP_PRACTICE_PATH || /團練|团练/.test(activity.title)
}

/** Respect saved announcement/link settings; never expose a group invitation from a public card. */
export function publicActivityHref(activity: HomeActivity) {
  if (!activity.href) return ''
  if (isGroupPractice(activity)) {
    try {
      const url = new URL(activity.href)
      if (['line.me', 'lin.ee'].includes(url.hostname)) return GROUP_PRACTICE_PATH
    } catch { /* Internal activity destinations remain unchanged. */ }
  }
  return activity.href
}
