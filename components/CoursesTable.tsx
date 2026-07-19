'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Clock3, MapPin } from 'lucide-react'
import { useLanguage } from '@/app/language-context'
import { useSiteContent } from '@/app/site-content-provider'
import { compareCourseLocations, compareCourses, orderedWeekdays } from '@/lib/course-sort'

const weekdays = orderedWeekdays

type LevelFilter = 'all' | 'beginner' | 'advanced' | 'elite'

function getCourseLevel(name: string): Exclude<LevelFilter, 'all'> {
  if (name.includes('初心') || name.includes('初階') || name.includes('初阶')) return 'beginner'
  if (name.includes('PB')) return 'elite'
  return 'advanced'
}

function getCourseShortName(name: string) {
  return name
    .replace(/^2026\s*/, '')
    .replace(/^好運跑步訓練營\s*X\s*/, '')
    .replace(/^週[一二三四五六日]/, '')
    .trim()
}

function getCourseTone(level: Exclude<LevelFilter, 'all'>) {
  if (level === 'beginner') return 'border-blue-200 bg-blue-50 text-blue-950'
  if (level === 'elite') return 'border-slate-300 bg-slate-200 text-slate-950'
  return 'border-emerald-200 bg-emerald-50 text-emerald-950'
}

function getCourseTime(classTime: string) {
  return classTime.match(/(?:[01]\d|2[0-3]):[0-5]\d/)?.[0] ?? null
}

function getSchedulePeriod(time: string) {
  const hour = Number(time.slice(0, 2))
  if (hour < 12) return '上午'
  if (hour < 14) return '中午'
  if (hour < 18) return '下午'
  return '晚上'
}

export default function CoursesTable() {
  const { language } = useLanguage()
  const { courses } = useSiteContent()
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [cityFilter, setCityFilter] = useState('all')

  const localeText = (text: string) => language === 'zh-CN' ? text.replaceAll('週', '周') : text.replaceAll('周', '週')
  const cities = useMemo(() => [...new Set(courses.map((course) => course.location))].sort(compareCourseLocations), [courses])
  const filteredCourses = useMemo(() => courses.filter((course) => {
    if (levelFilter !== 'all' && getCourseLevel(course.name) !== levelFilter) return false
    if (cityFilter !== 'all' && course.location !== cityFilter) return false
    return true
  }).sort(compareCourses), [cityFilter, courses, levelFilter])

  const scheduleRows = useMemo(() => {
    const times = new Set<string>()
    filteredCourses.forEach((course) => {
      const time = getCourseTime(course.classTime)
      if (time) times.add(time)
    })
    return [...times]
      .sort((a, b) => a.localeCompare(b))
      .map((time) => ({ period: getSchedulePeriod(time), time }))
  }, [filteredCourses])

  const coursesBySlot = useMemo(() => {
    const slots = new Map<string, typeof courses>()
    filteredCourses.forEach((course) => {
      const weekday = course.weekday.replace('周', '週')
      const time = getCourseTime(course.classTime)
      if (!time) return
      const key = `${weekday}-${time}`
      slots.set(key, [...(slots.get(key) ?? []), course].sort(compareCourses))
    })
    return slots
  }, [filteredCourses])

  const filterButtons: Array<{ value: LevelFilter; label: string }> = [
    { value: 'all', label: '全部' },
    { value: 'beginner', label: '新手' },
    { value: 'advanced', label: '進階' },
    { value: 'elite', label: '菁英' },
  ]

  return (
    <div className="space-y-7">
      <div className="grid gap-5 border-b border-black/10 pb-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-bold text-apple-gray-600">程度</h3>
          <div className="flex flex-wrap gap-2">
            {filterButtons.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setLevelFilter(filter.value)}
                className={`min-h-10 rounded-full px-4 text-sm font-bold transition ${levelFilter === filter.value ? 'bg-black text-white' : 'bg-apple-gray-100 text-apple-gray-700 hover:bg-apple-gray-200'}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold text-apple-gray-600">城市</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCityFilter('all')} className={`min-h-10 rounded-full px-4 text-sm font-bold transition ${cityFilter === 'all' ? 'bg-black text-white' : 'bg-apple-gray-100 text-apple-gray-700 hover:bg-apple-gray-200'}`}>全部城市</button>
            {cities.map((city) => (
              <button key={city} type="button" onClick={() => setCityFilter(city)} className={`min-h-10 rounded-full px-4 text-sm font-bold transition ${cityFilter === city ? 'bg-black text-white' : 'bg-apple-gray-100 text-apple-gray-700 hover:bg-apple-gray-200'}`}>{localeText(city)}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {weekdays.map((weekday) => {
          const weekdayCourses = filteredCourses.filter((course) => course.weekday.replace('周', '週') === weekday)
          if (!weekdayCourses.length) return null

          return (
            <section key={weekday} className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
              <h3 className="bg-black px-4 py-3 text-sm font-black text-white">{localeText(weekday)}</h3>
              <div className="space-y-2 p-3">
                {weekdayCourses.map((course) => {
                  const level = getCourseLevel(course.name)
                  return (
                    <Link key={course.slug} href={`/courses/${course.slug}`} className={`group block rounded-lg border p-4 transition active:scale-[0.99] ${getCourseTone(level)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-black leading-6">{localeText(getCourseShortName(course.name))}</p>
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-black opacity-75">
                            <Clock3 className="h-3.5 w-3.5 shrink-0" />
                            {localeText(course.classTime)}
                          </p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 shrink-0 opacity-50" />
                      </div>
                      <p className="mt-2 flex items-start gap-1.5 text-xs font-bold leading-5 opacity-70">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{localeText(course.location)} · {localeText(course.meetingPoint)}</span>
                      </p>
                      <p className="mt-2 text-[11px] font-semibold opacity-60">{localeText(course.period)}</p>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-black/10 bg-white shadow-sm md:block">
        <div className="min-w-[940px]">
          <div className="grid grid-cols-7 border-b border-black/10 bg-black text-white">
            {weekdays.map((weekday) => <div key={weekday} className="flex min-h-16 items-center justify-center border-r border-white/15 px-3 text-sm font-black last:border-r-0">{localeText(weekday)}</div>)}
          </div>

          {scheduleRows.map((row) => (
            <div key={`${row.period}-${row.time}`} className="grid grid-cols-7 border-b border-black/10 last:border-b-0">
              {weekdays.map((weekday) => {
                const slotCourses = coursesBySlot.get(`${weekday}-${row.time}`) ?? []
                return (
                  <div key={`${weekday}-${row.time}`} className="min-h-[154px] border-r border-black/10 bg-white p-2 last:border-r-0">
                    <div className="space-y-2">
                      {slotCourses.map((course) => {
                        const level = getCourseLevel(course.name)
                        const duration = course.classTime.match(/（(.+?)）/)?.[1] ?? ''
                        return (
                          <Link key={course.slug} href={`/courses/${course.slug}`} className={`group block rounded-lg border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${getCourseTone(level)}`}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-black leading-5">{localeText(getCourseShortName(course.name))}</p>
                              <ArrowUpRight className="h-4 w-4 shrink-0 opacity-45 transition group-hover:opacity-100" />
                            </div>
                            <p className="mt-2 flex items-center gap-1 text-xs font-black opacity-75">
                              <Clock3 className="h-3.5 w-3.5 shrink-0" />
                              {row.time}
                            </p>
                            <p className="mt-2 flex items-start gap-1 text-xs font-bold leading-4 opacity-70">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>{localeText(course.location)} · {localeText(course.meetingPoint)}</span>
                            </p>
                            {duration ? <p className="mt-1 text-[11px] font-bold opacity-65">{duration}</p> : null}
                            <p className="mt-2 text-[11px] font-semibold opacity-60">{localeText(course.period)}</p>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="rounded-lg border border-black/10 bg-apple-gray-50 p-8 text-center text-apple-gray-600">暫無符合篩選條件的課程</div>
      ) : null}
    </div>
  )
}
