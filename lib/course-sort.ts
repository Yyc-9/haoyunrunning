export type SortableCourse = {
  name: string
  weekday: string
  location: string
  classTime?: string
  time?: string
}

export const orderedWeekdays = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'] as const

const locationOrder = [
  ['台北', '臺北'],
  ['新北'],
  ['桃園'],
  ['竹北', '新竹縣'],
  ['新竹市', '新竹'],
  ['竹南'],
  ['苗栗'],
  ['台中', '臺中'],
  ['彰化'],
  ['南投'],
  ['雲林'],
  ['嘉義'],
  ['台南', '臺南'],
  ['高雄'],
  ['屏東'],
] as const

export function normalizeWeekday(value: string) {
  return value.trim().replaceAll('周', '週')
}

export function normalizeCourseLocation(value: string) {
  const location = value.trim().replaceAll('臺', '台')
  if (location === '台北市') return '台北'
  if (location === '新北') return '新北市'
  if (location === '桃園') return '桃園市'
  if (location === '新竹') return '新竹市'
  if (location === '竹北市') return '竹北'
  if (location === '竹南鎮') return '竹南'
  return location
}

export function getCourseCityOptions(locations: readonly string[]) {
  return [...new Set(locations.map(normalizeCourseLocation).filter(Boolean))].sort(compareCourseLocations)
}

export function displayCourseLocation(value: string) {
  const location = normalizeCourseLocation(value)
  return location === '台北' ? '台北市' : location
}

export function displayCourseTime(value: string) {
  const time = value.match(/(?:[01]\d|2[0-3]):[0-5]\d/)?.[0]
  return time || value.replace(/\s*[（(][^）)]*(?:小時|小时)[）)]\s*/g, '').trim()
}

export function compareCourseLocations(first: string, second: string) {
  first = normalizeCourseLocation(first)
  second = normalizeCourseLocation(second)
  const priority = (location: string) => {
    const index = locationOrder.findIndex((aliases) => aliases.some((alias) => location.includes(alias)))
    return index === -1 ? locationOrder.length : index
  }
  return priority(first) - priority(second) || first.localeCompare(second, 'zh-Hant')
}

function courseMinutes(course: SortableCourse) {
  const value = course.classTime || course.time || ''
  const match = value.match(/(?:[01]\d|2[0-3]):[0-5]\d/)
  if (!match) return Number.MAX_SAFE_INTEGER
  const [hours, minutes] = match[0].split(':').map(Number)
  return hours * 60 + minutes
}

export function compareCourses(first: SortableCourse, second: SortableCourse) {
  const firstWeekday = orderedWeekdays.indexOf(normalizeWeekday(first.weekday) as (typeof orderedWeekdays)[number])
  const secondWeekday = orderedWeekdays.indexOf(normalizeWeekday(second.weekday) as (typeof orderedWeekdays)[number])
  const weekdayDifference = (firstWeekday === -1 ? orderedWeekdays.length : firstWeekday)
    - (secondWeekday === -1 ? orderedWeekdays.length : secondWeekday)

  return weekdayDifference
    || compareCourseLocations(first.location, second.location)
    || courseMinutes(first) - courseMinutes(second)
    || first.name.localeCompare(second.name, 'zh-Hant')
}

export function sortCourses<T extends SortableCourse>(courses: readonly T[]) {
  return [...courses].sort(compareCourses)
}
