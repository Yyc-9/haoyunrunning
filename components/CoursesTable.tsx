'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, MapPin, Target } from 'lucide-react'
import { allCourses } from '@/lib/goodluck-data'
import { useLanguage } from '@/app/language-context'

const weekdayOrder = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function normalizeWeekday(weekday: string) {
  return weekday.replace('週', '周')
}

function getMobileCourseName(name: string) {
  return name
    .replace(/^2026\s*/, '')
    .replace(/^好運跑步訓練營\s*X\s*/, '')
    .replace(/^好運跑步訓練營\s*X\s*/, '')
}

type LevelFilter = 'all' | 'beginner' | 'advanced' | 'elite'
export default function CoursesTable() {
  const { language } = useLanguage()
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())

  const localeText = (text: string) => {
    if (language === 'zh-TW') {
      return text
        .replaceAll('好運', '好運')
        .replaceAll('訓練', '訓練')
        .replaceAll('課程', '課程')
        .replaceAll('周', '週')
        .replaceAll('節奏', '節奏')
        .replaceAll('舊生', '舊生')
        .replaceAll('適合', '適合')
        .replaceAll('請', '請')
        .replaceAll('諮詢', '諮詢')
        .replaceAll('費用', '費用')
        .replaceAll('班', '班')
        .replaceAll('入門', '入門')
        .replaceAll('初心', '初心')
        .replaceAll('初阶', '初階')
    }
    if (language === 'zh-CN') {
      return text
        .replaceAll('好運', '好運')
        .replaceAll('訓練', '訓練')
        .replaceAll('課程', '課程')
        .replaceAll('週', '周')
        .replaceAll('節奏', '節奏')
        .replaceAll('舊生', '舊生')
        .replaceAll('費用', '費用')
    }
    return text
  }

  const getLevelBadge = (course: typeof allCourses[0]) => {
    if (course.name.includes('初心') || course.name.includes('初階') || course.name.includes('初阶')) {
      return 'beginner'
    }
    if (course.name.includes('PB')) {
      return 'elite'
    }
    return 'advanced'
  }

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner':
        return '新手'
      case 'advanced':
        return '進階'
      case 'elite':
        return '菁英'
      default:
        return '進階'
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-blue-100 text-blue-800'
      case 'advanced':
        return 'bg-green-100 text-green-800'
      case 'elite':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const cities = useMemo(() => {
    const uniqueCities = [...new Set(allCourses.map((c) => c.location))]
    return uniqueCities.sort()
  }, [])

  const filteredCourses = useMemo(() => {
    return allCourses.filter((course) => {
      if (levelFilter !== 'all') {
        const courseLevel = getLevelBadge(course)
        if (courseLevel !== levelFilter) return false
      }

      if (cityFilter !== 'all') {
        if (course.location !== cityFilter) return false
      }

      return true
    })
  }, [levelFilter, cityFilter])

  const groupedCourses = useMemo(() => {
    const sorted = [...filteredCourses].sort(
      (a, b) => weekdayOrder.indexOf(normalizeWeekday(a.weekday)) - weekdayOrder.indexOf(normalizeWeekday(b.weekday))
    )

    const groups = new Map<string, typeof allCourses>()
    sorted.forEach((course) => {
      const weekday = normalizeWeekday(course.weekday)
      if (!groups.has(weekday)) {
        groups.set(weekday, [])
      }
      groups.get(weekday)!.push(course)
    })

    return groups
  }, [filteredCourses])

  const toggleExpanded = (slug: string) => {
    const newExpanded = new Set(expandedCourses)
    if (newExpanded.has(slug)) {
      newExpanded.delete(slug)
    } else {
      newExpanded.add(slug)
    }
    setExpandedCourses(newExpanded)
  }

  return (
    <div className="space-y-8">
      {/* 篩選 Pills */}
      <div className="space-y-4">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-apple-gray-600">程度</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setLevelFilter('all')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                levelFilter === 'all'
                  ? 'bg-apple-blue text-white'
                  : 'bg-apple-gray-100 text-apple-gray-700 hover:bg-apple-gray-200'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setLevelFilter('beginner')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                levelFilter === 'beginner'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
              }`}
            >
              新手
            </button>
            <button
              onClick={() => setLevelFilter('advanced')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                levelFilter === 'advanced'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              進階
            </button>
            <button
              onClick={() => setLevelFilter('elite')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                levelFilter === 'elite'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
              }`}
            >
              菁英
            </button>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-apple-gray-600">城市</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCityFilter('all')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                cityFilter === 'all'
                  ? 'bg-apple-blue text-white'
                  : 'bg-apple-gray-100 text-apple-gray-700 hover:bg-apple-gray-200'
              }`}
            >
              全部城市
            </button>
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setCityFilter(city)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  cityFilter === city
                    ? 'bg-apple-blue text-white'
                    : 'bg-apple-gray-100 text-apple-gray-700 hover:bg-apple-gray-200'
                }`}
              >
                {localeText(city)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 手機課程卡片 */}
      <div className="courses-mobile-list space-y-4 md:hidden">
        {Array.from(groupedCourses.entries()).map(([weekday, coursesInWeek]) => (
          <section key={weekday} className="space-y-3">
            <h3 className="rounded-2xl bg-apple-gray-100 px-4 py-3 text-sm font-black text-apple-gray-800">
              {localeText(weekday)}
            </h3>
            {coursesInWeek.map((course) => {
              const isExpanded = expandedCourses.has(course.slug)
              const level = getLevelBadge(course)

              return (
                <article key={course.slug} className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(course.slug)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-apple-blue/10 px-3 py-1 text-xs font-bold text-apple-blue">
                          {localeText(course.weekday)}
                        </span>
                        <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-bold text-apple-gray-700">
                          {localeText(course.location)}
                        </span>
                      </div>
                      <h4 className="mt-3 text-base font-black leading-6 text-apple-gray-900">
                        {localeText(getMobileCourseName(course.name))}
                      </h4>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getLevelColor(level)}`}>
                          {getLevelLabel(level)}
                        </span>
                        <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-semibold text-apple-gray-700">
                          {localeText(course.period)}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`mt-1 h-5 w-5 shrink-0 text-apple-gray-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <div className="mt-4 space-y-3 text-sm leading-6 text-apple-gray-600">
                    <p className="flex gap-2">
                      <Target className="mt-1 h-4 w-4 shrink-0 text-apple-gray-500" />
                      <span>{localeText(course.trainingGoal)}</span>
                    </p>
                    <p className="flex gap-2">
                      <MapPin className="mt-1 h-4 w-4 shrink-0 text-apple-gray-500" />
                      <span>{localeText(course.meetingPoint)}</span>
                    </p>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-4 rounded-2xl bg-apple-gray-50 p-4">
                      <div>
                        <h5 className="mb-1 text-xs font-bold uppercase tracking-wide text-apple-gray-500">上課時間</h5>
                        <p className="text-sm leading-6 text-apple-gray-700">{localeText(course.classTime)}</p>
                      </div>
                      <div>
                        <h5 className="mb-1 text-xs font-bold uppercase tracking-wide text-apple-gray-500">適合對象</h5>
                        <p className="text-sm leading-6 text-apple-gray-700">{localeText(course.groupAudience)}</p>
                      </div>
                      <div>
                        <h5 className="mb-1 text-xs font-bold uppercase tracking-wide text-apple-gray-500">訓練方向</h5>
                        <p className="text-sm leading-6 text-apple-gray-700">
                          {localeText(
                            Array.isArray(course.trainingGoals)
                              ? course.trainingGoals.join(' / ')
                              : course.trainingGoal
                          )}
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <Link
                          href={`/courses/${course.slug}`}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-apple-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
                        >
                          查看完整課程
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                        <a
                          href="https://www.instagram.com/nurture.running.team/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-apple-blue px-4 py-2.5 text-sm font-semibold text-apple-blue transition-colors hover:bg-apple-blue/10"
                        >
                          Instagram 諮詢
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </section>
        ))}
      </div>

      {/* 桌面課程表格 */}
      <div className="courses-desktop-table hidden overflow-x-auto rounded-2xl border border-apple-gray-200 bg-white md:block">
        <div className="flex flex-col">
          {/* 表头 */}
          <div className="grid grid-cols-7 border-b border-apple-gray-200 bg-apple-gray-50">
            <div className="border-r border-apple-gray-200 px-6 py-4 text-left text-sm font-semibold text-apple-gray-700">時間</div>
            <div className="border-r border-apple-gray-200 px-6 py-4 text-left text-sm font-semibold text-apple-gray-700">班級名稱</div>
            <div className="border-r border-apple-gray-200 px-6 py-4 text-left text-sm font-semibold text-apple-gray-700">地點</div>
            <div className="border-r border-apple-gray-200 px-6 py-4 text-left text-sm font-semibold text-apple-gray-700">程度</div>
            <div className="border-r border-apple-gray-200 px-6 py-4 text-left text-sm font-semibold text-apple-gray-700">訓練方向</div>
            <div className="border-r border-apple-gray-200 px-6 py-4 text-left text-sm font-semibold text-apple-gray-700">課程週期</div>
            <div className="px-6 py-4"></div>
          </div>

          {/* 表格內容 */}
          {Array.from(groupedCourses.entries()).map(([weekday, coursesInWeek]) => (
            <div key={weekday}>
              {/* 星期分隔行 */}
              <div className="bg-apple-gray-100 px-6 py-3 border-b border-apple-gray-200">
                <span className="text-sm font-bold text-apple-gray-700">{localeText(weekday)}</span>
              </div>

              {/* 課程行 */}
              {coursesInWeek.map((course) => {
                const isExpanded = expandedCourses.has(course.slug)
                const level = getLevelBadge(course)

                return (
                  <div key={course.slug} className="border-b border-apple-gray-200">
                    <div
                      className="grid grid-cols-7 transition-colors hover:bg-apple-gray-50 cursor-pointer"
                      onClick={() => toggleExpanded(course.slug)}
                    >
                      <div className="border-r border-apple-gray-200 px-6 py-4 text-sm text-apple-gray-700">{localeText(course.classTime)}</div>
                      <div className="border-r border-apple-gray-200 px-6 py-4 text-sm font-medium text-apple-gray-900">
                        {localeText(course.name)}
                      </div>
                      <div className="border-r border-apple-gray-200 px-6 py-4 text-sm text-apple-gray-700">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {localeText(course.location)}
                        </div>
                      </div>
                      <div className="border-r border-apple-gray-200 px-6 py-4 text-sm">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getLevelColor(level)}`}>
                          {getLevelLabel(level)}
                        </span>
                      </div>
                      <div className="border-r border-apple-gray-200 px-6 py-4 text-sm text-apple-gray-700">
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {localeText(course.trainingGoal)}
                        </div>
                      </div>
                      <div className="border-r border-apple-gray-200 px-6 py-4 text-sm text-apple-gray-700">{localeText(course.period)}</div>
                      <div className="flex items-center justify-center px-6 py-4">
                        <ChevronDown
                          className={`h-5 w-5 transition-transform text-apple-gray-400 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* 展開的內嵌面板 */}
                    {isExpanded && (
                      <div className="bg-apple-gray-50 px-6 py-4 border-t border-apple-gray-200">
                        <div className="space-y-4 rounded-xl bg-white p-4 border border-apple-gray-200">
                          <div className="grid gap-4 md:grid-cols-3">
                            <div>
                              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-apple-gray-500">
                                集合地點
                              </h4>
                              <p className="text-sm text-apple-gray-700">{localeText(course.meetingPoint)}</p>
                            </div>

                            <div>
                              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-apple-gray-500">
                                適合對象
                              </h4>
                              <p className="text-sm text-apple-gray-700">{localeText(course.groupAudience)}</p>
                            </div>

                            <div>
                              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-apple-gray-500">
                                訓練方向
                              </h4>
                              <p className="text-sm text-apple-gray-700">
                                {localeText(
                                  Array.isArray(course.trainingGoals)
                                    ? course.trainingGoals.join(' / ')
                                    : course.trainingGoal
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 pt-2">
                            <Link
                              href={`/courses/${course.slug}`}
                              className="inline-flex items-center gap-2 rounded-lg bg-apple-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
                            >
                              查看完整課程
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                            <a
                              href="https://www.instagram.com/nurture.running.team/"
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg border border-apple-blue px-4 py-2 text-sm font-semibold text-apple-blue hover:bg-apple-blue/10 transition-colors"
                            >
                              Instagram 諮詢
                              <ChevronRight className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {filteredCourses.length === 0 && (
        <div className="rounded-2xl border border-apple-gray-200 bg-apple-gray-50 p-8 text-center">
          <p className="text-apple-gray-600">暫無符合篩選條件的課程</p>
        </div>
      )}
    </div>
  )
}
