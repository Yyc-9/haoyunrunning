'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Clock3, MapPin } from 'lucide-react'
import { useLanguage } from '@/app/language-context'
import { useSiteContent } from '@/app/site-content-provider'
import { compareCourses, displayCourseLocation, displayCourseTime, getCourseCityOptions, normalizeCourseLocation, orderedWeekdays } from '@/lib/course-sort'
import { formatCourseWeekday } from '@/lib/course-weekday'

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
    .replace(/^(?:週|周|星期)[一二三四五六日天]/, '')
    .trim()
}

function getCourseTone(level: Exclude<LevelFilter, 'all'>) {
  if (level === 'beginner') {
    return 'border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-300'
  }
  if (level === 'elite') {
    return 'border-amber-300 bg-amber-50 text-amber-950 hover:border-amber-400 hover:bg-amber-100'
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-300'
}

function getCourseTime(classTime: string) {
  return classTime.match(/(?:[01]\d|2[0-3]):[0-5]\d/)?.[0] ?? null
}

export default function CoursesTable() {
  const { language } = useLanguage()
  const { courses } = useSiteContent()
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [cityFilter, setCityFilter] = useState('all')

  const localeText = (text: string) => language === 'zh-CN' ? text.replaceAll('週', '周') : text.replaceAll('周', '週')
  const weekdayText = (text: string) => formatCourseWeekday(localeText(text), language)
  const cities = useMemo(() => getCourseCityOptions(courses.map((course) => course.location)), [courses])
  const filteredCourses = useMemo(() => courses.filter((course) => {
    if (levelFilter !== 'all' && getCourseLevel(course.name) !== levelFilter) return false
    if (cityFilter !== 'all' && normalizeCourseLocation(course.location) !== cityFilter) return false
    return true
  }).sort(compareCourses), [cityFilter, courses, levelFilter])

  const filterButtons: Array<{ value: LevelFilter; label: string }> = [
    { value: 'all', label: '全部' },
    { value: 'beginner', label: '新手' },
    { value: 'advanced', label: '進階' },
    { value: 'elite', label: '菁英' },
  ]

  return (
    <div className="space-y-7">
      <div className="course-filter-deck kinetic-reveal grid gap-5 border-b border-black/10 pb-6 md:grid-cols-2 lg:rounded-2xl lg:border lg:bg-white lg:p-5 lg:shadow-sm">
        <div>
          <h3 className="mb-3 text-sm font-bold text-apple-gray-600">程度</h3>
          <div className="flex flex-wrap gap-2">
            {filterButtons.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setLevelFilter(filter.value)}
                aria-pressed={levelFilter === filter.value}
                className={`course-filter-pill min-h-10 rounded-full px-4 text-sm font-bold transition ${levelFilter === filter.value ? 'bg-black text-white lg:bg-[#0b2d3c]' : 'bg-apple-gray-100 text-apple-gray-700 hover:bg-apple-gray-200 lg:bg-white lg:ring-1 lg:ring-black/10 lg:hover:bg-[#eef3f5]'}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold text-apple-gray-600">城市</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCityFilter('all')} aria-pressed={cityFilter === 'all'} className={`course-filter-pill min-h-10 rounded-full px-4 text-sm font-bold transition ${cityFilter === 'all' ? 'bg-black text-white lg:bg-[#0b2d3c]' : 'bg-apple-gray-100 text-apple-gray-700 hover:bg-apple-gray-200 lg:bg-white lg:ring-1 lg:ring-black/10 lg:hover:bg-[#eef3f5]'}`}>全部城市</button>
            {cities.map((city) => (
              <button key={city} type="button" onClick={() => setCityFilter(city)} aria-pressed={cityFilter === city} className={`course-filter-pill min-h-10 rounded-full px-4 text-sm font-bold transition ${cityFilter === city ? 'bg-black text-white lg:bg-[#0b2d3c]' : 'bg-apple-gray-100 text-apple-gray-700 hover:bg-apple-gray-200 lg:bg-white lg:ring-1 lg:ring-black/10 lg:hover:bg-[#eef3f5]'}`}>{localeText(displayCourseLocation(city))}</button>
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
              <h3 className="bg-black px-4 py-3 text-sm font-black text-white">{weekdayText(weekday)}</h3>
              <div className="space-y-2 p-3">
                {weekdayCourses.map((course) => {
                  return (
                    <Link key={course.slug} href={`/courses/${course.slug}`} className={`group block rounded-lg border p-4 transition active:scale-[0.99] ${getCourseTone(getCourseLevel(course.name))}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-black leading-6">{localeText(getCourseShortName(course.name))}</p>
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-black opacity-75">
                            <Clock3 className="h-3.5 w-3.5 shrink-0" />
                            {localeText(displayCourseTime(course.classTime))}
                          </p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 shrink-0 opacity-50" />
                      </div>
                      <p className="mt-2 flex items-start gap-1.5 text-xs font-bold leading-5 opacity-70">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{localeText(displayCourseLocation(course.location))} · {localeText(course.meetingPoint)}</span>
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

      <div className="course-schedule-board kinetic-reveal hidden overflow-x-auto rounded-lg border border-black/10 bg-white shadow-sm md:block lg:rounded-2xl">
        <div className="min-w-[940px]">
          <div className="course-schedule-head grid grid-cols-7 border-b border-black/10 bg-black text-white lg:bg-[#0b2d3c]">
            {weekdays.map((weekday) => <div key={weekday} className="flex min-h-16 items-center justify-center border-r border-white/15 px-3 text-sm font-black last:border-r-0">{weekdayText(weekday)}</div>)}
          </div>

          <div className="grid grid-cols-7">
            {weekdays.map((weekday) => {
              const weekdayCourses = filteredCourses.filter((course) => course.weekday.replace('周', '週') === weekday)
              return (
                <div key={weekday} className="min-h-40 border-r border-black/10 bg-white p-2 last:border-r-0">
                  <div className="space-y-2">
                    {weekdayCourses.map((course) => {
                      const time = getCourseTime(course.classTime)
                      return (
                        <Link key={course.slug} href={`/courses/${course.slug}`} className={`course-event-card group block rounded-lg border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${getCourseTone(getCourseLevel(course.name))}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-black leading-5">{localeText(getCourseShortName(course.name))}</p>
                            <ArrowUpRight className="h-4 w-4 shrink-0 opacity-45 transition group-hover:opacity-100" />
                          </div>
                          {time ? (
                            <p className="mt-2 flex items-center gap-1 text-xs font-black opacity-75">
                              <Clock3 className="h-3.5 w-3.5 shrink-0" />
                              {time}
                            </p>
                          ) : null}
                          <p className="mt-2 flex items-start gap-1 text-xs font-bold leading-4 opacity-70">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{localeText(displayCourseLocation(course.location))} · {localeText(course.meetingPoint)}</span>
                          </p>
                          <p className="mt-2 text-[11px] font-semibold opacity-60">{localeText(course.period)}</p>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="rounded-lg border border-black/10 bg-apple-gray-50 p-8 text-center text-apple-gray-600">暫無符合篩選條件的課程</div>
      ) : null}
    </div>
  )
}
