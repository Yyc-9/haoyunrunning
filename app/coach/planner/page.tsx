'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarPlus, ChevronDown, ChevronUp, Copy, Loader2, Save, UserRoundPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(dateText: string, offset: number) {
  const date = new Date(`${dateText}T00:00:00`)
  date.setDate(date.getDate() + offset)
  return toIsoDate(date)
}

function getMonday(date = new Date()) {
  const localDate = new Date(date)
  localDate.setHours(0, 0, 0, 0)
  localDate.setDate(localDate.getDate() - ((localDate.getDay() + 6) % 7))
  return toIsoDate(localDate)
}

function formatWeekLabel(weekStart: string, weekNumber: number) {
  const date = new Date(`${weekStart}T00:00:00`)
  const year = String(date.getFullYear()).slice(2)
  return `${year}/${date.getMonth() + 1}/${date.getDate()}[${weekNumber}]`
}

function planToColumnKey(plan: TrainingPlan) {
  const date = new Date(`${plan.workout_date}T00:00:00`)
  const index = (date.getDay() + 6) % 7
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
  const baseWeekStart = useMemo(() => getMonday(), [])
  const [activeWeekStart, setActiveWeekStart] = useState(baseWeekStart)
  const [rows, setRows] = useState<PlannerRow[]>(createEmptyRows(formatWeekLabel(baseWeekStart, 1)))
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
  const plansInActiveRange = useMemo(
    () => savedPlans.filter((plan) => plan.workout_date >= activeWeekStart && plan.workout_date <= activeRangeEnd),
    [activeRangeEnd, activeWeekStart, savedPlans]
  )
  const exactActiveWeek = weekGroups.find((group) => group.weekStart === activeWeekStart)
  const inferredActiveWeekNumber =
    exactActiveWeek?.weekNumber ??
    plansInActiveRange[0]?.week_number ??
    (weekGroups.length > 0 ? Math.max(...weekGroups.filter((group) => group.weekStart < activeWeekStart).map((group) => group.weekNumber), 0) + 1 : 1)
  const activeWeekLabel = formatWeekLabel(activeWeekStart, inferredActiveWeekNumber)
  const isEditingNextWeek = activeWeekStart > baseWeekStart
  const previousWeek = useMemo(() => {
    const previousWeekStart = addDays(activeWeekStart, -7)
    return (
      weekGroups.find((group) => group.weekStart === previousWeekStart) ??
      weekGroups.find((group) => group.weekStart < activeWeekStart)
    )
  }, [activeWeekStart, weekGroups])
  const historyWeeks = weekGroups.filter(
    (group) =>
      group.weekStart !== activeWeekStart &&
      !group.plans.some((plan) => plan.workout_date >= activeWeekStart && plan.workout_date <= activeRangeEnd)
  )

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
        const weekNumber =
          exact?.weekNumber ??
          rangePlans[0]?.week_number ??
          (grouped.length > 0 ? Math.max(...grouped.filter((group) => group.weekStart < activeWeekStart).map((group) => group.weekNumber), 0) + 1 : 1)
        const label = formatWeekLabel(activeWeekStart, weekNumber)
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
  }, [activeRangeEnd, activeWeekLabel, activeWeekStart, selectedStudentId])

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

  const copyPreviousWeek = () => {
    setError('')
    setMessage('')

    if (!previousWeek) {
      setError('还没有可复制的上一周课表。')
      return
    }

    setIsCopyingPrevious(true)
    setRows(plansToRows(previousWeek.plans, activeWeekLabel))
    setMessage(`已复制 ${formatWeekLabel(previousWeek.weekStart, previousWeek.weekNumber)} 到 ${activeWeekLabel}，可继续调整后保存。`)
    setIsCopyingPrevious(false)
  }

  const openNextWeek = () => {
    setError('')
    setMessage('')
    const nextWeekStart = addDays(activeWeekStart, 7)
    const exactNextWeek = weekGroups.find((group) => group.weekStart === nextWeekStart)
    const nextWeekNumber =
      exactNextWeek?.weekNumber ??
      Math.max(inferredActiveWeekNumber + 1, ...weekGroups.filter((group) => group.weekStart < nextWeekStart).map((group) => group.weekNumber + 1), 1)
    const nextLabel = formatWeekLabel(nextWeekStart, nextWeekNumber)

    setActiveWeekStart(nextWeekStart)
    setRows(exactNextWeek ? plansToRows(exactNextWeek.plans, nextLabel) : createEmptyRows(nextLabel))
    setMessage(`已开启 ${nextLabel}，第一列已按上一周格式生成。`)
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
      setError('请先选择要派发课表的学员。')
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
          weekNumber: inferredActiveWeekNumber,
          weekStart: activeWeekStart,
          workouts,
        }),
      }) as { count?: number; replacedCount?: number; plans?: TrainingPlan[] }

      const refreshed = await authedFetch(`/api/coach/training-plans?studentId=${encodeURIComponent(selectedStudentId)}`) as { plans?: TrainingPlan[] }
      setSavedPlans(refreshed.plans ?? payload.plans ?? [])
      setMessage(
        payload.replacedCount
          ? `已覆盖${activeWeekLabel}旧课表，并储存 ${payload.count ?? workouts.length} 条新训练。`
          : `已储存 ${payload.count ?? workouts.length} 条训练课表，已写入 training_plans 并同步到学员端。`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '课表派发失败，请稍后再试。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <Link href="/coach" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-apple-gray-700">
            <ArrowLeft className="h-4 w-4" />
            回教练工作台
          </Link>

          <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_390px] lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                Training planner
              </p>
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">课表面板</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                当前只展开本周课表，上一周和更早课表默认折叠。复制上一周后，可直接在本周课表里微调再保存。
              </p>
            </div>

            <div className="apple-card p-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                <UserRoundPlus className="h-6 w-6" />
              </div>
              <h2 className="font-bold text-apple-gray-900">派发对象</h2>
              <div className="mt-4 space-y-3">
                <select
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  className="apple-input"
                  disabled={isLoadingStudents}
                >
                  <option value="">选择学员</option>
                  {students.map((row) => row.student && (
                    <option key={row.id} value={row.student.id}>
                      {row.student.name || row.student.email} · {row.student.email}
                    </option>
                  ))}
                </select>
                <div className="rounded-2xl bg-apple-gray-100 p-4">
                  <p className="text-xs font-semibold text-apple-gray-500">
                    {isEditingNextWeek ? '下一周课表' : '本周课表'}
                  </p>
                  <p className="mt-1 text-xl font-black text-apple-gray-900">{activeWeekLabel}</p>
                  <p className="mt-1 text-sm text-apple-gray-600">
                    {columns[0].label} {activeWeekStart} 至 {columns[6].label} {activeRangeEnd}
                  </p>
                </div>
                <p className="text-sm leading-6 text-apple-gray-600">
                  {selectedStudent ? `当前学员：${selectedStudent.name || selectedStudent.email}` : '绑定学员后可在这里选择。'}
                </p>
              </div>
            </div>
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
                复制上一周
              </button>
              <button
                type="button"
                onClick={openNextWeek}
                disabled={isLoadingPlans}
                className="apple-button-secondary gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarPlus className="h-4 w-4" />
                开启下一周
              </button>
              {isEditingNextWeek && (
                <button
                  type="button"
                  onClick={returnToThisWeek}
                  className="apple-button-secondary gap-2 px-4 py-2 text-sm"
                >
                  回到本周
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowHistory((current) => !current)}
                disabled={historyWeeks.length === 0}
                className="apple-button-secondary gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showHistory ? '收起历史周' : `回看上一周${historyWeeks.length > 1 ? `等 ${historyWeeks.length} 周` : ''}`}
              </button>
            </div>
            <button
              type="button"
              onClick={savePlans}
              disabled={isSaving || !selectedStudentId}
              className="apple-button-primary gap-2 px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? '派发中...' : `储存${isEditingNextWeek ? '下一周' : '本周'}课表并同步`}
            </button>
          </div>

          {message && <div className="mb-5 rounded-3xl bg-green-50 p-4 text-sm font-semibold text-green-800">{message}</div>}
          {error && <div className="mb-5 rounded-3xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-apple-gray-900">{isEditingNextWeek ? '下一周课表' : '本周课表'}</h2>
            {isLoadingPlans && <span className="text-sm font-semibold text-apple-gray-500">读取中...</span>}
          </div>

          <div className="apple-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/10 bg-apple-gray-100 text-left">
                    <th className="w-40 p-4 font-bold text-apple-gray-900">周起始日期</th>
                    {columns.map((column) => (
                      <th key={column.key} className="w-36 p-4 font-bold text-apple-gray-900">
                        {column.label}
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
                            placeholder="输入训练内容"
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
              <h2 className="text-xl font-black text-apple-gray-900">历史课表</h2>
              {historyWeeks.map((week) => {
                const historyRows = plansToRows(week.plans, formatWeekLabel(week.weekStart, week.weekNumber))

                return (
                  <details key={week.key} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/10" open={week === previousWeek}>
                    <summary className="cursor-pointer text-base font-black text-apple-gray-900">
                      {formatWeekLabel(week.weekStart, week.weekNumber)}
                    </summary>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[980px] border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-black/10 bg-apple-gray-100 text-left">
                            <th className="w-36 p-3 font-bold text-apple-gray-900">周起始日期</th>
                            {columns.map((column) => (
                              <th key={column.key} className="w-32 p-3 font-bold text-apple-gray-900">
                                {column.label}
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
            </section>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ['选择学员', '只显示已绑定到当前教练账号的学员。'],
              ['保存当前周', '保存后会覆盖该学员当前编辑周的旧课表，避免重复。'],
              ['复制上一周', '复制后训练内容会进入当前编辑周，可调整日期对应的内容后再保存。'],
            ].map(([title, description]) => (
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
