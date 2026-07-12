'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Clock3, MapPin } from 'lucide-react'
import { useLanguage } from '@/app/language-context'
import { useSiteContent } from '@/app/site-content-provider'

const weekdays = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'] as const
const scheduleRows = [
  { period: '上午', time: '05:37' },
  { period: '上午', time: '06:37' },
  { period: '中午', time: '12:00' },
  { period: '晚上', time: '19:27' },
] as const

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
  if (level === 'elite') return 'border-black bg-black text-white'
  return 'border-emerald-200 bg-emerald-50 text-emerald-950'
}

export default function CoursesTable() {
  const { language } = useLanguage()
  const { courses } = useSiteContent()
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [cityFilter, setCityFilter] = useState('all')

  const localeText = (text: string) => language === 'zh-CN' ? text.replaceAll('週', '周') : text.replaceAll('周', '週')
  const cities = useMemo(() => [...new Set(courses.map((course) => course.location))].sort(), [courses])
  const filteredCourses = useMemo(() => courses.filter((course) => {
    if (levelFilter !== 'all' && getCourseLevel(course.name) !== levelFilter) return false
    if (cityFilter !== 'all' && course.location !== cityFilter) return false
    return true
  }), [cityFilter, courses, levelFilter])

  const coursesBySlot = useMemo(() => {
    const slots = new Map<string, typeof courses>()
    filteredCourses.forEach((course) => {
      const weekday = course.weekday.replace('周', '週')
      const time = course.classTime.match(/\d{2}:\d{2}/)?.[0] ?? '19:27'
      const key = `${weekday}-${time}`
      slots.set(key, [...(slots.get(key) ?? []), course])
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

      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="min-w-[1050px]">
          <div className="grid grid-cols-[104px_repeat(7,minmax(132px,1fr))] border-b border-black/10 bg-black text-white">
            <div className="sticky left-0 z-20 flex min-h-16 items-center border-r border-white/15 bg-black px-4 text-sm font-black">時間</div>
            {weekdays.map((weekday) => <div key={weekday} className="flex min-h-16 items-center justify-center border-r border-white/15 px-3 text-sm font-black last:border-r-0">{localeText(weekday)}</div>)}
          </div>

          {scheduleRows.map((row) => (
            <div key={`${row.period}-${row.time}`} className="grid grid-cols-[104px_repeat(7,minmax(132px,1fr))] border-b border-black/10 last:border-b-0">
              <div className="sticky left-0 z-10 flex min-h-[138px] flex-col justify-center border-r border-black/10 bg-apple-gray-50 px-4">
                <span className="text-xs font-bold text-apple-gray-500">{row.period}</span>
                <span className="mt-2 flex items-center gap-1.5 text-base font-black text-black"><Clock3 className="h-4 w-4" />{row.time}</span>
              </div>

              {weekdays.map((weekday) => {
                const slotCourses = coursesBySlot.get(`${weekday}-${row.time}`) ?? []
                return (
                  <div key={`${weekday}-${row.time}`} className="min-h-[138px] border-r border-black/10 bg-white p-2 last:border-r-0">
                    <div className="space-y-2">
                      {slotCourses.map((course) => {
                        const level = getCourseLevel(course.name)
                        return (
                          <Link key={course.slug} href={`/courses/${course.slug}`} className={`group block rounded-lg border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${getCourseTone(level)}`}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-black leading-5">{localeText(getCourseShortName(course.name))}</p>
                              <ArrowUpRight className="h-4 w-4 shrink-0 opacity-45 transition group-hover:opacity-100" />
                            </div>
                            <p className="mt-2 flex items-center gap-1 text-xs font-bold opacity-70"><MapPin className="h-3.5 w-3.5" />{localeText(course.location)}</p>
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
