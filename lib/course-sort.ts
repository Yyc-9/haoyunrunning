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
  ['新竹市', '新竹'],
  ['竹北'],
  ['竹南'],
] as const

export function normalizeWeekday(value: string) {
  return value.trim().replaceAll('周', '週')
}

export function normalizeCourseLocation(value: string) {
  const location = value.trim()
  if (location === '臺北' || location === '台北市' || location === '臺北市') return '台北'
  if (location === '新竹') return '新竹市'
  return location
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
    || courseMinutes(first) - courseMinutes(second)
    || compareCourseLocations(first.location, second.location)
    || first.name.localeCompare(second.name, 'zh-Hant')
}

export function sortCourses<T extends SortableCourse>(courses: readonly T[]) {
  return [...courses].sort(compareCourses)
}
