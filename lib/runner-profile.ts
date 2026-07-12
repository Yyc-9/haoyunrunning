export type AccountProfile = {
  id: string
  role: 'student' | 'coach' | 'admin'
  name: string
  email: string
  phone: string
  goal: string
  pb: string
  nickname: string
  bio: string
  city: string
  running_since: string
  favorite_distance: string
  target_event: string
  instagram: string
  facebook: string
  invoice_type: 'none' | 'carrier' | 'tax_id'
  invoice_carrier: string
  tax_id: string
}

export type Achievement = {
  slug: string
  name: string
  description: string
  unlockHint: string
  icon: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  earned: boolean
  reason: string
  awardedAt: string | null
}

export type RaceEvent = {
  id: string
  name: string
  date: string
  city: string
  distances: string
  officialUrl: string
  source: string
  region: '台灣' | '亞洲' | '大洋洲' | '歐洲' | '北美洲'
}

export const emptyProfile: AccountProfile = {
  id: '',
  role: 'student',
  name: '',
  email: '',
  phone: '',
  goal: '',
  pb: '',
  nickname: '',
  bio: '',
  city: '',
  running_since: '',
  favorite_distance: '',
  target_event: '',
  instagram: '',
  facebook: '',
  invoice_type: 'none',
  invoice_carrier: '',
  tax_id: '',
}

export const countryCodes = [
  { value: '+886', label: '台灣 +886' },
  { value: '+86', label: '中國 +86' },
  { value: '+852', label: '香港 +852' },
  { value: '+853', label: '澳門 +853' },
  { value: '+1', label: '美國／加拿大 +1' },
  { value: '+81', label: '日本 +81' },
] as const

export const cityOptions = [
  '台北市', '新北市', '桃園市', '新竹市', '新竹縣', '苗栗縣', '台中市', '彰化縣',
  '南投縣', '雲林縣', '嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣', '宜蘭縣',
  '花蓮縣', '台東縣', '基隆市', '澎湖縣', '金門縣', '連江縣', '中國大陸', '香港', '澳門',
] as const

export const runningExperienceOptions = [
  '未滿 6 個月', '6-12 個月', '1-2 年', '3-5 年', '6-10 年', '10 年以上',
] as const

export const favoriteDistanceOptions = ['5K', '10K', '半馬', '全馬', '越野跑', '尚未確定'] as const
export const pbCategoryOptions = ['尚未有正式 PB', '5K', '10K', '半馬', '全馬', '多項距離'] as const
export const goalOptions = [
  '建立規律跑步習慣', '完成第一場 5K', '完成第一場 10K', '完成第一場半馬', '完成第一場全馬',
  '突破 5K PB', '突破 10K PB', '突破半馬 PB', '突破全馬 PB', '健康減脂', '穩定無傷訓練',
] as const

export const raceEvents: RaceEvent[] = [
  {
    id: 'sydney-marathon-2026',
    name: '2026 TCS 雪梨馬拉松',
    date: '2026-08-30',
    city: '澳洲雪梨',
    distances: '42.195K',
    officialUrl: 'https://www.tcssydneymarathon.com/',
    source: 'TCS Sydney Marathon 官方資訊',
    region: '大洋洲',
  },
  {
    id: 'berlin-marathon-2026',
    name: '2026 BMW 柏林馬拉松',
    date: '2026-09-27',
    city: '德國柏林',
    distances: '42.195K',
    officialUrl: 'https://www.bmw-berlin-marathon.com/en/',
    source: 'BMW BERLIN-MARATHON 官方資訊',
    region: '歐洲',
  },
  {
    id: 'chicago-marathon-2026',
    name: '2026 芝加哥馬拉松',
    date: '2026-10-11',
    city: '美國芝加哥',
    distances: '42.195K',
    officialUrl: 'https://www.chicagomarathon.com/runners/runner-information/future-event-dates/',
    source: 'Bank of America Chicago Marathon 官方資訊',
    region: '北美洲',
  },
  {
    id: 'taiwan-national-park-2026',
    name: '2026 臺灣國家公園馬拉松－陽明山',
    date: '2026-11-01',
    city: '台北市',
    distances: '馬拉松／路跑組',
    officialUrl: 'https://www.taiwan.nps.gov.tw/home/zh-tw/news/33509.html',
    source: '臺灣國家公園官方資訊',
    region: '台灣',
  },
  {
    id: 'new-york-city-marathon-2026',
    name: '2026 紐約市馬拉松',
    date: '2026-11-01',
    city: '美國紐約',
    distances: '42.195K',
    officialUrl: 'https://www.nyrr.org/tcsnycmarathon',
    source: 'New York Road Runners 官方資訊',
    region: '北美洲',
  },
  {
    id: 'garmin-run-taipei-2026',
    name: '2026 Garmin Run 臺北站',
    date: '2026-11-29',
    city: '台北市',
    distances: '5K／10K／21K',
    officialUrl: 'https://www.garmin.com.tw/news/newscenter/news-2026-may-garmin-run/',
    source: 'Garmin 台灣官方資訊',
    region: '台灣',
  },
  {
    id: 'hsinchu-city-marathon-2026',
    name: '2026 新竹城市馬拉松',
    date: '2026-12-06',
    city: '新竹市',
    distances: '4K／9K／21K／42.195K',
    officialUrl: 'https://hsinchucitymarathon.com/tw/competition-introduction/registration-information',
    source: '新竹城市馬拉松官方資訊',
    region: '台灣',
  },
  {
    id: 'valencia-marathon-2026',
    name: '2026 瓦倫西亞馬拉松',
    date: '2026-12-06',
    city: '西班牙瓦倫西亞',
    distances: '42.195K',
    officialUrl: 'https://www.valenciaciudaddelrunning.com/en/evento/maraton-valencia/',
    source: 'Valencia Ciudad del Running 官方資訊',
    region: '歐洲',
  },
  {
    id: 'taipei-marathon-2026',
    name: '2026 臺北馬拉松',
    date: '2026-12-20',
    city: '台北市',
    distances: '21K／42.195K',
    officialUrl: 'https://www.taipeicitymarathon.com/',
    source: '臺北馬拉松官方資訊',
    region: '台灣',
  },
  {
    id: 'kinmen-marathon-2027',
    name: '2027 金門馬拉松',
    date: '2027-01-17',
    city: '金門縣',
    distances: '4K／10K／21K／42.195K',
    officialUrl: 'https://www.sportsnet.org.tw/20270117_web/',
    source: '中華民國路跑協會官方資訊',
    region: '台灣',
  },
  {
    id: 'tokyo-marathon-2027',
    name: '2027 東京馬拉松',
    date: '2027-03-07',
    city: '日本東京',
    distances: '42.195K',
    officialUrl: 'https://www.marathon.tokyo/en/about/outline/',
    source: 'Tokyo Marathon Foundation 官方資訊',
    region: '亞洲',
  },
]

export const raceRegionOptions: RaceEvent['region'][] = ['台灣', '亞洲', '大洋洲', '歐洲', '北美洲']

export function getUpcomingRaceEvents(today = new Date()) {
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return raceEvents
    .filter((event) => new Date(`${event.date}T23:59:59+08:00`).getTime() >= startOfToday)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function getRaceEvent(value: string) {
  if (!value.startsWith('race:')) return null
  return raceEvents.find((event) => event.id === value.slice(5)) ?? null
}

export function getTargetEventLabel(value: string) {
  const race = getRaceEvent(value)
  if (race) return `${race.name} · ${race.date.replaceAll('-', '/')} · ${race.city}`
  if (value.startsWith('custom:')) return value.slice(7)
  return value
}

export function getRaceCountdown(race: RaceEvent, now = new Date()) {
  const raceTime = new Date(`${race.date}T00:00:00+08:00`).getTime()
  const raceDayEnd = new Date(`${race.date}T23:59:59+08:00`).getTime()
  const remainingSeconds = Math.floor((raceTime - now.getTime()) / 1000)

  if (remainingSeconds <= 0) {
    if (now.getTime() <= raceDayEnd) return { days: 0, hours: 0, minutes: 0, seconds: 0, label: '今天開跑' }
    return { days: -1, hours: 0, minutes: 0, seconds: 0, label: '賽事已結束' }
  }

  const days = Math.floor(remainingSeconds / 86_400)
  const hours = Math.floor((remainingSeconds % 86_400) / 3_600)
  const minutes = Math.floor((remainingSeconds % 3_600) / 60)
  const seconds = remainingSeconds % 60
  const time = [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')

  return { days, hours, minutes, seconds, label: `倒數 ${days} 天 ${time}` }
}

export function parsePhone(value: string) {
  const matchedCode = countryCodes.find((item) => value.trim().startsWith(item.value))
  if (!matchedCode) return { code: '+886', number: value.replace(/\D/g, '') }
  return {
    code: matchedCode.value,
    number: value.trim().slice(matchedCode.value.length).replace(/\D/g, ''),
  }
}

export function formatPhone(code: string, number: string) {
  const digits = number.replace(/\D/g, '')
  if (!digits) return ''
  const internationalNumber = ['+886', '+86'].includes(code) ? digits.replace(/^0/, '') : digits
  return `${code} ${internationalNumber}`
}

export function parsePb(value: string) {
  const [category = '', result = ''] = value.split('｜')
  if (pbCategoryOptions.includes(category.trim() as typeof pbCategoryOptions[number])) {
    return { category: category.trim(), result: result.trim() }
  }
  return { category: value ? '多項距離' : '', result: value }
}

export function formatPb(category: string, result: string) {
  if (!category) return ''
  if (category === '尚未有正式 PB') return category
  return result.trim() ? `${category}｜${result.trim()}` : category
}
