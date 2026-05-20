'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Loader2, Save, Sparkles, UserRoundPlus } from 'lucide-react'
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

const createEmptyRows = (): PlannerRow[] => [
  { date: '第 1 组', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { date: '第 2 组', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  { date: '第 3 组', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
]

const templateRows: PlannerRow[] = [
  {
    date: '基础周',
    mon: 'E 跑 45 分钟\nRPE 4-5',
    tue: '休息或核心 20 分钟',
    wed: '节奏跑 3 x 8 分钟\n组间慢跑 3 分钟',
    thu: 'E 跑 40 分钟 + 6 组加速跑',
    fri: '休息 + 拉伸',
    sat: '长距离 90 分钟\n轻松完成',
    sun: '恢复跑 30 分钟或交叉训练',
  },
  { date: '备注', mon: '', tue: '', wed: '注意配速不要冲太快', thu: '', fri: '', sat: '跑后补碳水和蛋白质', sun: '' },
  { date: '疼痛预案', mon: '', tue: '', wed: '若疼痛超过 3/10，改 E 跑', thu: '', fri: '', sat: '若疲劳高，降量 20%', sun: '' },
]

function addDays(dateText: string, offset: number) {
  const date = new Date(`${dateText}T00:00:00`)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
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
  const [rows, setRows] = useState<PlannerRow[]>(createEmptyRows)
  const [students, setStudents] = useState<BoundStudentRow[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [weekStart, setWeekStart] = useState(() => new Date().toISOString().slice(0, 10))
  const [weekNumber, setWeekNumber] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoadingStudents, setIsLoadingStudents] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

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
        const rows = payload.students ?? []
        setStudents(rows)
        setSelectedStudentId((current) => current || rows.find((row) => row.student)?.student?.id || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : '读取学员失败。')
      } finally {
        setIsLoadingStudents(false)
      }
    }

    loadStudents()
  }, [])

  const selectedStudent = useMemo(
    () => students.find((row) => row.student?.id === selectedStudentId)?.student ?? null,
    [selectedStudentId, students]
  )

  const updateCell = (rowIndex: number, key: PlannerKey, value: string) => {
    setRows((current) =>
      current.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row))
    )
    setMessage('')
  }

  const applyTemplate = () => {
    setRows(templateRows)
    setMessage('已套用基础周模板，可继续微调后派发。')
  }

  const copyPreviousWeek = () => {
    setRows((current) => current.map((row) => ({ ...row })))
    setMessage('已复制当前表格内容。')
  }

  const savePlans = async () => {
    setError('')
    setMessage('')

    if (!selectedStudentId) {
      setError('请先选择要派发课表的学员。')
      return
    }

    const workouts = rows.flatMap((row, rowIndex) =>
      columns
        .map((column) => {
          const target = row[column.key].trim()
          if (!target) return null

          return {
            workoutDate: addDays(weekStart, column.offset),
            dayLabel: column.label,
            title: row.date.trim() || '训练课表',
            target,
            note: '',
            sortOrder: rowIndex * 10 + column.offset,
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
          weekNumber,
          weekStart,
          workouts,
        }),
      }) as { count?: number }

      setMessage(`已派发 ${payload.count ?? workouts.length} 条训练课表，学员端会立即显示。`)
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
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">课表派发面板</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                选择已绑定学员，填写本周训练内容并保存。课表会写入 Supabase，并同步到学员端的本周课表。
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-apple-gray-600">周起始日</span>
                    <input
                      type="date"
                      value={weekStart}
                      onChange={(event) => setWeekStart(event.target.value)}
                      className="apple-input"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-apple-gray-600">训练周数</span>
                    <input
                      type="number"
                      min="1"
                      value={weekNumber}
                      onChange={(event) => setWeekNumber(Number(event.target.value))}
                      className="apple-input"
                    />
                  </label>
                </div>
                <p className="text-sm leading-6 text-apple-gray-600">
                  {selectedStudent ? `当前学员：${selectedStudent.name || selectedStudent.email}` : '绑定学员后可在这里选择。'}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyPreviousWeek} className="apple-button-secondary gap-2 px-4 py-2 text-sm">
                <Copy className="h-4 w-4" />
                复制当前周
              </button>
              <button type="button" onClick={applyTemplate} className="apple-button-secondary gap-2 px-4 py-2 text-sm">
                <Sparkles className="h-4 w-4" />
                套用模板
              </button>
            </div>
            <button
              type="button"
              onClick={savePlans}
              disabled={isSaving || !selectedStudentId}
              className="apple-button-primary gap-2 px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? '派发中...' : '保存并派发课表'}
            </button>
          </div>

          {message && <div className="mb-5 rounded-3xl bg-green-50 p-4 text-sm font-semibold text-green-800">{message}</div>}
          {error && <div className="mb-5 rounded-3xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

          <div className="apple-card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/10 bg-apple-gray-100 text-left">
                    <th className="w-40 p-4 font-bold text-apple-gray-900">分组 / 备注</th>
                    {columns.map((column) => (
                      <th key={column.key} className="w-36 p-4 font-bold text-apple-gray-900">
                        {column.label}
                        <span className="mt-1 block text-xs font-normal text-apple-gray-500">
                          {weekStart ? addDays(weekStart, column.offset) : ''}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-black/10 last:border-b-0">
                      <td className="bg-white p-4 align-top font-bold text-apple-gray-900">
                        <input
                          value={row.date}
                          onChange={(event) => updateCell(rowIndex, 'date', event.target.value)}
                          placeholder="例如：质量课"
                          className="w-full rounded-2xl border border-transparent bg-apple-gray-100 px-3 py-2 font-bold outline-none transition focus:border-black/20 focus:bg-white"
                        />
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

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ['选择学员', '只显示已绑定到当前教练账号的学员。'],
              ['派发课表', '保存后会覆盖该学员同一周起始日的旧课表，避免重复。'],
              ['学员回馈', '学员端提交训练感受后，会回到教练面板集中查看。'],
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
