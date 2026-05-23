'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarPlus, ChevronDown, ChevronUp, Copy, Download, Loader2, Save, UserRoundPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/app/language-context'
import { getStudentDisplayEmail, getStudentDisplayName } from '@/lib/student-display'
import {
  addDays,
  formatCoachWeekTitle,
  formatWeekRange,
  formatWeekSwitchLabel,
  getTodayInfo,
  getWeekStatus,
  getWeekdayIndex,
  type WeekStatus,
} from '@/lib/week-dates'

const columns = [
  { key: 'mon', label: '周一', offset: 0 },
  { key: 'tue', label: '周二', offset: 1 },
  { key: 'wed', label: '周三', offset: 2 },
  { key: 'thu', label: '周四', offset: 3 },
  { key: 'fri', label: '周五', offset: 4 },
  { key: 'sat', label: '周六', offset: 5 },
  { key: 'sun', label: '周日', offset: 6 },
] as const

type PlannerRow = {
  date: string
  mon: string
  tue: string
  wed: string
  thu: string
  fri: string
  sat: string
  sun: string
}

type PlannerKey = keyof PlannerRow

type BoundStudentRow = {
  id: string
  student: {
    id: string
    name: string
    email: string
    program: string | null
    goal: string | null
    pb: string | null
  } | null
}

type TrainingPlan = {
  id: string
  student_id: string
  coach_id: string
  week_number: number
  week_start: string
  workout_date: string
  day_label: string
  title: string
  target: string
  pace: string | null
  note: string | null
  sort_order: number
}

type WeekGroup = {
  key: string
  weekStart: string
  weekNumber: number
  plans: TrainingPlan[]
}

const createEmptyRows = (label: string): PlannerRow[] => [
  { date: label, mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
]

function parseWeekStart(weekStart: string) {
  const [year, month, day] = weekStart.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function toChineseNumber(value: number) {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  if (value <= 10) return value === 10 ? '十' : digits[value]
  if (value < 20) return `十${digits[value - 10]}`
  if (value < 100) {
    const tens = Math.floor(value / 10)
    const ones = value % 10
    return `${digits[tens]}十${ones ? digits[ones] : ''}`
  }
  return String(value)
}

function formatTrainingWeekLabel(weekNumber: number, language: 'zh-CN' | 'zh-TW' | 'en') {
  if (language === 'en') return `Week ${weekNumber}`
  return `第${toChineseNumber(weekNumber)}周`
}

function formatExportWeekLabel(weekStart: string, weekNumber: number) {
  const [year, month, day] = weekStart.split('-').map(Number)
  return `${year}/${month}/${day}[${weekNumber}]`
}

function escapeCsvCell(value: string | number) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

function downloadCsvFile(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getTrainingWeekNumber(weekStart: string, groups: WeekGroup[]) {
  if (groups.length === 0) return 1

  const earliestWeekStart = groups.reduce((earliest, group) => (
    group.weekStart < earliest ? group.weekStart : earliest
  ), groups[0].weekStart)
  const diffMs = parseWeekStart(weekStart) - parseWeekStart(earliestWeekStart)
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))

  return Math.max(1, diffWeeks + 1)
}

function planToColumnKey(plan: TrainingPlan) {
  const index = getWeekdayIndex(plan.workout_date)
  return columns[index]?.key ?? 'mon'
}

function plansToRows(plans: TrainingPlan[], label: string): PlannerRow[] {
  const row = createEmptyRows(label)[0]
  const byDay = new Map<string, string[]>()

  plans.forEach((plan) => {
    const key = planToColumnKey(plan)
    const list = byDay.get(key) ?? []
    list.push(plan.target)
    byDay.set(key, list)
  })

  columns.forEach((column) => {
    row[column.key] = (byDay.get(column.key) ?? []).join('\n\n')
  })

  return [row]
}

function groupPlansByWeek(plans: TrainingPlan[]) {
  const groups = new Map<string, WeekGroup>()

  plans.forEach((plan) => {
    const key = plan.week_start
    const group = groups.get(key) ?? {
      key,
      weekStart: plan.week_start,
      weekNumber: plan.week_number,
      plans: [],
    }

    group.weekNumber = Math.min(group.weekNumber, plan.week_number)
    group.plans.push(plan)
    groups.set(key, group)
  })

  return Array.from(groups.values()).sort((a, b) => b.weekStart.localeCompare(a.weekStart))
}

async function authedFetch(path: string, init?: RequestInit) {
  if (!supabase) {
    throw new Error('Supabase 尚未设置。')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('请先登录教练账号。')
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(init?.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || '操作失败，请稍后再试。')
  }

  return payload
}

export default function CoachPlannerPage() {
  const { language, t } = useLanguage()
  const [now, setNow] = useState(() => new Date())
  const todayInfo = useMemo(() => getTodayInfo(now, language), [language, now])
  const baseWeekStart = todayInfo.weekStart
  const [activeWeekStart, setActiveWeekStart] = useState(baseWeekStart)
  const [rows, setRows] = useState<PlannerRow[]>(createEmptyRows(formatTrainingWeekLabel(1, language)))
  const [students, setStudents] = useState<BoundStudentRow[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [savedPlans, setSavedPlans] = useState<TrainingPlan[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoadingStudents, setIsLoadingStudents] = useState(true)
  const [isLoadingPlans, setIsLoadingPlans] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCopyingPrevious, setIsCopyingPrevious] = useState(false)

  const weekGroups = useMemo(() => groupPlansByWeek(savedPlans), [savedPlans])
  const activeRangeEnd = useMemo(() => addDays(activeWeekStart, 6), [activeWeekStart])
  const activeWeekStatus = getWeekStatus(activeWeekStart, todayInfo.todayIso)
  const getLocalizedWeekStatusLabel = (status: WeekStatus) => ({
    this: t.schedule.thisWeek,
    next: t.schedule.nextWeek,
    past: t.schedule.pastWeek,
    future: t.schedule.futureWeek,
  })[status]
  const activeWeekRangeLabel = formatWeekRange(activeWeekStart, language)
  const activeWeekStatusLabel = getLocalizedWeekStatusLabel(activeWeekStatus)
  const activeTrainingWeekNumber = getTrainingWeekNumber(activeWeekStart, weekGroups)
  const activeWeekLabel = formatTrainingWeekLabel(activeTrainingWeekNumber, language)
  const activeDateWeekLabel = formatCoachWeekTitle(activeWeekStart, language)
  const isEditingNextWeek = activeWeekStart !== baseWeekStart
  const previousWeek = useMemo(() => {
    const previousWeekStart = addDays(activeWeekStart, -7)
    return (
      weekGroups.find((group) => group.weekStart === previousWeekStart) ??
      weekGroups.find((group) => group.weekStart < activeWeekStart)
    )
  }, [activeWeekStart, weekGroups])
  const historyWeeks = weekGroups.filter(
    (group) => group.weekStart !== activeWeekStart
  )
  const weekdayLabels = language === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : language === 'zh-TW'
      ? ['週一', '週二', '週三', '週四', '週五', '週六', '週日']
      : ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const studentId = params.get('studentId')
    if (studentId) setSelectedStudentId(studentId)
  }, [])

  useEffect(() => {
    const loadStudents = async () => {
      setIsLoadingStudents(true)
      setError('')

      try {
        const payload = await authedFetch('/api/coach/students') as { students?: BoundStudentRow[] }
        const studentRows = payload.students ?? []
        setStudents(studentRows)
        setSelectedStudentId((current) => current || studentRows.find((row) => row.student)?.student?.id || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : '读取学员失败。')
      } finally {
        setIsLoadingStudents(false)
      }
    }

    loadStudents()
  }, [])

  useEffect(() => {
    if (!selectedStudentId) {
      setSavedPlans([])
      setRows(createEmptyRows(activeWeekLabel))
      return
    }

    const loadPlans = async () => {
      setIsLoadingPlans(true)
      setError('')

      try {
        const payload = await authedFetch(`/api/coach/training-plans?studentId=${encodeURIComponent(selectedStudentId)}`) as { plans?: TrainingPlan[] }
        const plans = payload.plans ?? []
        setSavedPlans(plans)

        const grouped = groupPlansByWeek(plans)
        const exact = grouped.find((group) => group.weekStart === activeWeekStart)
        const rangePlans = plans.filter((plan) => plan.workout_date >= activeWeekStart && plan.workout_date <= activeRangeEnd)
        const displayPlans = exact?.plans ?? rangePlans
        const label = formatTrainingWeekLabel(getTrainingWeekNumber(activeWeekStart, grouped), language)
        setRows(displayPlans.length > 0 ? plansToRows(displayPlans, label) : createEmptyRows(label))
      } catch (err) {
        setError(err instanceof Error ? err.message : '读取课表失败。')
        setSavedPlans([])
        setRows(createEmptyRows(activeWeekLabel))
      } finally {
        setIsLoadingPlans(false)
      }
    }

    loadPlans()
  }, [activeRangeEnd, activeWeekLabel, activeWeekStart, baseWeekStart, selectedStudentId])

  useEffect(() => {
    setRows((current) => current.map((row) => ({ ...row, date: activeWeekLabel })))
  }, [activeWeekLabel])

  const selectedStudent = useMemo(
    () => students.find((row) => row.student?.id === selectedStudentId)?.student ?? null,
    [selectedStudentId, students]
  )

  const updateCell = (rowIndex: number, key: PlannerKey, value: string) => {
    if (key === 'date') return

    setRows((current) =>
      current.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row))
    )
    setMessage('')
  }

  const appendTemplate = (template: string) => {
    setRows((current) =>
      current.map((row, index) => {
        if (index !== 0) return row
        const firstEmptyColumn = columns.find((column) => !row[column.key].trim()) ?? columns[0]
        const currentValue = row[firstEmptyColumn.key].trim()
        return {
          ...row,
          [firstEmptyColumn.key]: currentValue ? `${currentValue}\n\n${template}` : template,
        }
      })
    )
    setMessage(t.planner.templatesHint)
  }

  const copyPreviousWeek = () => {
    setError('')
    setMessage('')

    if (!previousWeek) {
      setError(t.planner.noPrevious)
      return
    }

    setIsCopyingPrevious(true)
    setRows(plansToRows(previousWeek.plans, activeWeekLabel))
    setMessage(`${t.planner.copyPrevious}: ${formatTrainingWeekLabel(getTrainingWeekNumber(previousWeek.weekStart, weekGroups), language)} → ${activeWeekLabel}`)
    setIsCopyingPrevious(false)
  }

  const openNextWeek = () => {
    setError('')
    setMessage('')
    const nextWeekStart = addDays(activeWeekStart, 7)
    const exactNextWeek = weekGroups.find((group) => group.weekStart === nextWeekStart)
    const nextLabel = formatTrainingWeekLabel(getTrainingWeekNumber(nextWeekStart, weekGroups), language)

    setActiveWeekStart(nextWeekStart)
    setRows(exactNextWeek ? plansToRows(exactNextWeek.plans, nextLabel) : createEmptyRows(nextLabel))
    setMessage(`${t.planner.openNext}: ${nextLabel}`)
  }

  const returnToThisWeek = () => {
    setError('')
    setMessage('')
    setActiveWeekStart(baseWeekStart)
  }

  const savePlans = async () => {
    setError('')
    setMessage('')

    if (!selectedStudentId) {
      setError(t.planner.chooseStudentError)
      return
    }

    const workouts = rows.flatMap((row) =>
      columns
        .map((column) => {
          const target = row[column.key].trim()
          if (!target) return null

          return {
            workoutDate: addDays(activeWeekStart, column.offset),
            dayLabel: column.label,
            title: activeWeekLabel,
            target,
            note: '',
            sortOrder: column.offset,
          }
        })
        .filter(Boolean)
    )

    setIsSaving(true)
    try {
      const payload = await authedFetch('/api/coach/training-plans', {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedStudentId,
          weekNumber: activeTrainingWeekNumber,
          weekStart: activeWeekStart,
          workouts,
        }),
      }) as { count?: number; replacedCount?: number; plans?: TrainingPlan[] }

      const refreshed = await authedFetch(`/api/coach/training-plans?studentId=${encodeURIComponent(selectedStudentId)}`) as { plans?: TrainingPlan[] }
      setSavedPlans(refreshed.plans ?? payload.plans ?? [])
      setMessage(
        `${t.planner.saveSuccess} ${payload.count ?? workouts.length}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t.planner.saveFailed)
    } finally {
      setIsSaving(false)
    }
  }

  const exportCurrentWeekCsv = () => {
    setError('')
    setMessage('')

    if (!selectedStudentId) {
      setError(t.planner.chooseStudentError)
      return
    }

    const exportWeekLabel = formatExportWeekLabel(activeWeekStart, activeTrainingWeekNumber)
    const csvRows: Array<Array<string | number>> = [
      [
        t.schedule.dateRange,
        ...columns.map((column, index) => `${weekdayLabels[index]} ${addDays(activeWeekStart, column.offset)}`),
      ],
      ...rows.map((row) => [
        exportWeekLabel,
        ...columns.map((column) => row[column.key]),
      ]),
    ]
    const studentName = selectedStudent ? getStudentDisplayName(selectedStudent) || selectedStudent.email : 'student'
    const safeStudentName = studentName.replace(/[\\/:*?"<>|\s]+/g, '_')
    const safeWeekLabel = exportWeekLabel.replace(/[\\/:*?"<>|]+/g, '-')

    downloadCsvFile(`${safeStudentName}_${safeWeekLabel}_training_plan.csv`, csvRows)
    setMessage(`${language === 'en' ? 'CSV exported' : language === 'zh-TW' ? 'CSV 已匯出' : 'CSV 已导出'}：${exportWeekLabel}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <Link href="/coach" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-apple-gray-700">
            <ArrowLeft className="h-4 w-4" />
            {t.planner.back}
          </Link>

          <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_390px] lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                {t.planner.sectionLabel}
              </p>
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">{t.planner.title}</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                {t.planner.subtitle}
              </p>
            </div>

            <div className="apple-card p-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                <UserRoundPlus className="h-6 w-6" />
              </div>
              <h2 className="font-bold text-apple-gray-900">{t.planner.assignTo}</h2>
              <div className="mt-4 space-y-3">
                <select
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  className="apple-input"
                  disabled={isLoadingStudents}
                >
                  <option value="">{t.planner.selectStudent}</option>
                  {students.map((row) => row.student && (
                    <option key={row.id} value={row.student.id}>
                      {getStudentDisplayName(row.student) || row.student.email} · {getStudentDisplayEmail(row.student)}
                    </option>
                  ))}
                </select>
                <div className="rounded-2xl bg-apple-gray-100 p-4">
                  <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-apple-gray-700">
                    {activeWeekStatusLabel}
                  </p>
                  <p className="mt-1 text-xl font-black text-apple-gray-900">{activeWeekLabel}</p>
                  <p className="mt-1 text-sm font-semibold text-apple-gray-700">{activeDateWeekLabel}</p>
                  <p className="mt-1 text-sm text-apple-gray-600">
                    {activeWeekRangeLabel}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-apple-gray-500">
                    weekStart: {activeWeekStart}
                  </p>
                </div>
                <p className="text-sm leading-6 text-apple-gray-600">
                  {selectedStudent ? `${t.planner.currentStudentPrefix}${getStudentDisplayName(selectedStudent) || selectedStudent.email}` : t.planner.chooseAfterBinding}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-4">
            {t.planner.steps.map(([step, title, description]) => (
              <div key={step} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/10">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-black text-white">
                  {step}
                </div>
                <h2 className="font-black text-apple-gray-900">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-apple-gray-600">{description}</p>
              </div>
            ))}
          </div>

          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyPreviousWeek}
                disabled={!previousWeek || isLoadingPlans || isCopyingPrevious}
                className="apple-button-secondary gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Copy className="h-4 w-4" />
                {t.planner.copyPrevious}
              </button>
              <button
                type="button"
                onClick={openNextWeek}
                disabled={isLoadingPlans}
                className="apple-button-secondary gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarPlus className="h-4 w-4" />
                {t.planner.openNext}
              </button>
              {isEditingNextWeek && (
                <button
                  type="button"
                  onClick={returnToThisWeek}
                  className="apple-button-secondary gap-2 px-4 py-2 text-sm"
                >
                  {t.planner.returnThisWeek}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowHistory((current) => !current)}
                disabled={historyWeeks.length === 0}
                className="apple-button-secondary gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showHistory ? t.planner.historyToggleClose : t.planner.historyToggleOpen}
              </button>
              <button
                type="button"
                onClick={exportCurrentWeekCsv}
                disabled={!selectedStudentId}
                className="apple-button-secondary gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {language === 'en' ? 'Export CSV' : language === 'zh-TW' ? '匯出 CSV' : '导出 CSV'}
              </button>
            </div>
            <button
              type="button"
              onClick={savePlans}
              disabled={isSaving || !selectedStudentId}
              className="apple-button-primary gap-2 px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? '...' : t.planner.save}
            </button>
          </div>

          <div className="mb-5 flex flex-wrap gap-2 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-black/10">
            {[
              { label: t.schedule.previousWeek, weekStart: addDays(baseWeekStart, -7) },
              { label: t.schedule.thisWeek, weekStart: baseWeekStart },
              { label: t.schedule.nextWeek, weekStart: addDays(baseWeekStart, 7) },
            ].map((item) => (
              <button
                key={item.weekStart}
                type="button"
                onClick={() => setActiveWeekStart(item.weekStart)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  activeWeekStart === item.weekStart
                    ? 'bg-black text-white'
                    : 'bg-apple-gray-100 text-apple-gray-700 hover:bg-apple-gray-200'
                }`}
              >
                {formatWeekSwitchLabel(item.label, item.weekStart)}
              </button>
            ))}
          </div>

          {message && <div className="mb-5 rounded-3xl bg-green-50 p-4 text-sm font-semibold text-green-800">{message}</div>}
          {error && <div className="mb-5 rounded-3xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

          {!isLoadingStudents && students.length === 0 && (
            <div className="mb-5 rounded-3xl bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              {t.planner.noStudents}
            </div>
          )}

          {!isLoadingStudents && students.length > 0 && !selectedStudentId && (
            <div className="mb-5 rounded-3xl bg-apple-gray-100 p-5 text-sm leading-6 text-apple-gray-700">
              {t.planner.noSelection}
            </div>
          )}

          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-apple-gray-900">{activeWeekStatusLabel}</h2>
            {isLoadingPlans && <span className="text-sm font-semibold text-apple-gray-500">{t.planner.loading}</span>}
          </div>

          <div className="mb-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/10">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-apple-blue">{t.planner.templatesLabel}</p>
                <h2 className="mt-1 text-xl font-black text-apple-gray-900">{t.planner.templatesTitle}</h2>
              </div>
              <p className="text-sm text-apple-gray-500">{t.planner.templatesHint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {t.planner.templates.map(([label, template]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => appendTemplate(template)}
                  disabled={!selectedStudentId}
                  className="rounded-full border border-black/10 bg-apple-gray-50 px-4 py-2 text-sm font-bold text-apple-gray-800 transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="apple-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/10 bg-apple-gray-100 text-left">
                    <th className="w-40 p-4 font-bold text-apple-gray-900">{activeWeekStatusLabel}</th>
                    {columns.map((column, index) => (
                      <th key={column.key} className="w-36 p-4 font-bold text-apple-gray-900">
                        {weekdayLabels[index]}
                        <span className="mt-1 block text-xs font-normal text-apple-gray-500">
                          {addDays(activeWeekStart, column.offset)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-black/10 last:border-b-0">
                      <td className="bg-white p-4 align-top">
                        <div className="rounded-2xl bg-apple-gray-100 px-3 py-3 font-black text-apple-gray-900">
                          {row.date}
                        </div>
                      </td>
                      {columns.map((column) => (
                        <td key={column.key} className="p-3 align-top">
                          <textarea
                            value={row[column.key]}
                            onChange={(event) => updateCell(rowIndex, column.key, event.target.value)}
                            placeholder={t.planner.inputPlaceholder}
                            rows={5}
                            className="min-h-28 w-full resize-none rounded-2xl border border-black/10 bg-white px-3 py-3 leading-6 text-apple-gray-800 outline-none transition focus:border-black/30 focus:shadow-sm"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showHistory && historyWeeks.length > 0 && (
            <section className="mt-8 space-y-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-xl font-black text-apple-gray-900">{t.planner.historyTitle}</h2>
                  <p className="mt-1 text-sm text-apple-gray-500">
                    {historyWeeks.length} · {t.planner.historyDescription}
                  </p>
                </div>
              </div>
              <div className="max-h-[620px] space-y-4 overflow-y-auto rounded-3xl border border-black/10 bg-white/70 p-3 shadow-inner">
                {historyWeeks.map((week) => {
                  const historyWeekLabel = formatTrainingWeekLabel(getTrainingWeekNumber(week.weekStart, weekGroups), language)
                  const historyRows = plansToRows(week.plans, historyWeekLabel)
                  const historyStatus = getLocalizedWeekStatusLabel(getWeekStatus(week.weekStart, todayInfo.todayIso))

                  return (
                    <details key={week.key} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/10" open={week === previousWeek}>
                      <summary className="cursor-pointer text-base font-black text-apple-gray-900">
                        <span className="inline-flex flex-wrap items-center gap-2">
                          {historyWeekLabel}
                          <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-bold text-apple-gray-700">
                            {historyStatus}
                          </span>
                          <span className="text-sm font-semibold text-apple-gray-500">
                            {formatCoachWeekTitle(week.weekStart, language)} · {formatWeekRange(week.weekStart, language)}
                          </span>
                        </span>
                      </summary>
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[980px] border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-black/10 bg-apple-gray-100 text-left">
                              <th className="w-36 p-3 font-bold text-apple-gray-900">{t.planner.thisWeek}</th>
                              {columns.map((column, index) => (
                                <th key={column.key} className="w-32 p-3 font-bold text-apple-gray-900">
                                  {weekdayLabels[index]}
                                  <span className="mt-1 block text-xs font-normal text-apple-gray-500">
                                    {addDays(week.weekStart, column.offset)}
                                  </span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {historyRows.map((row) => (
                              <tr key={row.date}>
                                <td className="p-3 align-top font-black text-apple-gray-900">{row.date}</td>
                                {columns.map((column) => (
                                  <td key={column.key} className="p-3 align-top">
                                    <div className="min-h-24 whitespace-pre-wrap rounded-2xl bg-apple-gray-100 p-3 leading-6 text-apple-gray-700">
                                      {row[column.key] || '-'}
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )
                })}
              </div>
            </section>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {t.planner.helperCards.map(([title, description]) => (
              <div key={title} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/10">
                <h2 className="font-bold text-apple-gray-900">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-apple-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
