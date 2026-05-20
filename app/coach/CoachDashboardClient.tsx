'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileText,
  MessageSquareText,
  NotebookPen,
  Sparkles,
  TimerReset,
  UsersRound,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import CoachAccessPanel from '@/components/CoachAccessPanel'

type FeedbackItem = {
  id: string
  student: string
  program: string
  workout: string
  submittedAt: string
  createdAt: string
  distance: string
  pace: string
  heartRate: string
  rpe: number | string
  feeling: string
  status: 'new' | 'flagged' | 'reviewed' | 'missing'
}

type BoundStudentRow = {
  id: string
  active: boolean
  created_at: string
  student: {
    id: string
    name: string
    email: string
    program: string | null
    goal: string | null
    pb: string | null
  } | null
}

const statusStyle = {
  new: 'bg-blue-50 text-blue-700',
  flagged: 'bg-amber-50 text-amber-700',
  reviewed: 'bg-green-50 text-green-700',
  missing: 'bg-gray-100 text-gray-700',
}

const quickLinks = [
  {
    href: '/coach/students',
    icon: UsersRound,
    title: '学员列表',
    description: '查看每位学员的周数、目标、最近回馈与风险提醒。',
  },
  {
    href: '/coach/planner',
    icon: NotebookPen,
    title: '课表面板',
    description: '编辑周课表并写入 training_plans，同步到学员端。',
  },
  {
    href: '/student',
    icon: MessageSquareText,
    title: '查看学员端',
    description: '站在学员视角检查今日训练与回馈表单。',
  },
]

const weeklyPending = [
  {
    title: '回看高风险反馈',
    student: '3 位学员',
    detail: 'RPE 偏高、膝盖不适或连续两次疲劳反馈',
    due: '今天',
    tone: 'bg-amber-50 text-amber-700',
  },
  {
    title: '补发本周课表',
    student: '半马进阶组',
    detail: '确认周三间歇和周末长距离安排',
    due: '周三前',
    tone: 'bg-blue-50 text-blue-700',
  },
  {
    title: '追踪未回报学员',
    student: '5 位学员',
    detail: '超过 48 小时未提交训练记录',
    due: '今晚',
    tone: 'bg-gray-100 text-gray-700',
  },
  {
    title: '复查伤痛备注',
    student: '恢复跑名单',
    detail: '下调强度或改为交叉训练',
    due: '本周内',
    tone: 'bg-green-50 text-green-700',
  },
]

const scheduleTemplates = [
  {
    name: '半马基础周',
    focus: '有氧容量 + 轻量节奏',
    sessions: ['E 跑 45 分', '节奏跑 3 x 8 分', '长距离 90 分'],
  },
  {
    name: '全马赛前调整',
    focus: '降量、保频率、保感觉',
    sessions: ['E 跑 35 分', '短间歇唤醒', '赛前 20 分轻松跑'],
  },
  {
    name: '伤后恢复周',
    focus: '低冲击 + 观察疼痛反应',
    sessions: ['跑走结合', '椭圆机 40 分', '灵活性与臀腿激活'],
  },
]

const coachNotes = [
  {
    title: '状态正常',
    body: '这周状态稳定，先维持当前强度。注意 easy run 不要跑快，长距离后补足碳水和睡眠。',
  },
  {
    title: '疲劳偏高',
    body: '今天反馈显示疲劳偏高，下一次训练先下调 20% 量，保留轻松跑和拉伸，暂不追配速。',
  },
  {
    title: '疼痛观察',
    body: '先记录疼痛位置、程度和出现时机。若热身后没有缓解，本周把质量课改成交叉训练。',
  },
]

async function fetchCoachStudents() {
  if (!supabase) {
    throw new Error('Supabase 尚未設定。')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('请先登入教练账号。')
  }

  const response = await fetch('/api/coach/students', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    students?: BoundStudentRow[]
  }

  if (!response.ok) {
    throw new Error(payload.error || '读取学员失败，请稍后再试。')
  }

  return payload.students ?? []
}

const formatFeedback = (item: any): FeedbackItem => ({
  id: item.id,
  student: item.profiles?.name || '已登录学员',
  program: item.profiles?.program || '尚未分班',
  workout: item.training_plans?.target || '自主训练回馈',
  submittedAt: new Date(item.created_at).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }),
  createdAt: item.created_at,
  distance: item.distance_km ? `${item.distance_km}km` : '-',
  pace: item.pace_text || '-',
  heartRate: item.average_heart_rate ? String(item.average_heart_rate) : '-',
  rpe: item.rpe ?? '-',
  feeling: item.feeling || '尚未填寫感受。',
  status: item.status,
})

export default function CoachDashboardClient() {
  const [liveFeedback, setLiveFeedback] = useState<FeedbackItem[]>([])
  const [coachStudents, setCoachStudents] = useState<BoundStudentRow[]>([])
  const [loadError, setLoadError] = useState('')
  const [studentLoadError, setStudentLoadError] = useState('')
  const [copiedNote, setCopiedNote] = useState('')

  const loadCoachStudents = useCallback(async () => {
    if (!supabase) return

    setStudentLoadError('')

    try {
      const rows = await fetchCoachStudents()
      setCoachStudents(rows)
    } catch (err) {
      setStudentLoadError(err instanceof Error ? err.message : '读取学员失败，请稍后再试。')
      setCoachStudents([])
    }
  }, [])

  useEffect(() => {
    const loadFeedback = async () => {
      if (!supabase) return

      const { data, error } = await supabase
        .from('training_feedback')
        .select(`
          id,
          created_at,
          distance_km,
          pace_text,
          average_heart_rate,
          rpe,
          feeling,
          status,
          profiles:student_id (name, program),
          training_plans:training_plan_id (target)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        setLoadError(error.message)
        return
      }

      setLiveFeedback((data ?? []).map(formatFeedback))
    }

    loadFeedback()
    loadCoachStudents()
  }, [loadCoachStudents])

  const displayFeedback = liveFeedback
  const displayStudents = coachStudents.filter((row) => row.student).slice(0, 3)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(todayStart)
  weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7))
  const todayFeedbackCount = displayFeedback.filter((item) => new Date(item.createdAt) >= todayStart).length
  const weekFeedbackCount = displayFeedback.filter((item) => new Date(item.createdAt) >= weekStart).length
  const flaggedCount = displayFeedback.filter((item) => item.status === 'flagged').length

  const stats = useMemo(
    () => [
      { label: '今日回馈', value: todayFeedbackCount, icon: MessageSquareText },
      { label: '本周回馈', value: weekFeedbackCount, icon: ClipboardList },
      { label: '需要留意', value: flaggedCount, icon: AlertTriangle },
      { label: '管理学员', value: coachStudents.length > 0 ? coachStudents.length : '待绑定', icon: UsersRound },
    ],
    [todayFeedbackCount, weekFeedbackCount, flaggedCount, coachStudents.length]
  )

  const handleCopyNote = async (note: string, title: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(note)
      }
    } catch {
      // Some embedded browsers block clipboard access; keep the UI feedback responsive.
    }

    setCopiedNote(title)
    window.setTimeout(() => setCopiedNote(''), 1800)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                Coach workspace
              </p>
              <h1 className="text-4xl font-black leading-tight text-apple-gray-900 md:text-6xl">
                今天不用再一个一个等 Line。
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-apple-gray-600">
                教练端会集中训练回馈、标出风险，并提供清晰的课表入口。这里会成为每天调整训练的主画面。
              </p>
            </div>

            <CoachAccessPanel compact onStudentBound={loadCoachStudents} />
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            {stats.map((item) => (
              <div key={item.label} className="apple-card p-5">
                <item.icon className="mb-4 h-5 w-5 text-apple-gray-600" />
                <p className="text-3xl font-black text-apple-gray-900">{item.value}</p>
                <p className="mt-1 text-sm text-apple-gray-500">{item.label}</p>
              </div>
            ))}
          </div>

          {loadError && (
            <div className="mb-6 rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              目前教练端读取真实资料受权限限制。之后完成教练角色与学员绑定后，这里会只显示所属学员回馈。信息：{loadError}
            </div>
          )}

          {studentLoadError && (
            <div className="mb-6 rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              目前无法读取已绑定学员。请确认账号已启用教练权限。信息：{studentLoadError}
            </div>
          )}

          <div className="mb-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="apple-card p-6 md:p-7">
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm text-apple-gray-500">Weekly queue</p>
                  <h2 className="text-2xl font-black text-apple-gray-900">本周待处理</h2>
                </div>
                <Link href="/coach/students" className="apple-button-secondary gap-2 px-4 py-2 text-sm">
                  查看学员
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {weeklyPending.map((item) => (
                  <article key={item.title} className="rounded-2xl border border-black/10 bg-white p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-apple-gray-900">{item.title}</h3>
                        <p className="mt-1 text-sm text-apple-gray-500">{item.student}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${item.tone}`}>
                        {item.due}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-apple-gray-600">{item.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-1">
              <section className="apple-card p-6 md:p-7">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-apple-gray-500">Templates</p>
                    <h2 className="text-2xl font-black text-apple-gray-900">常用课表模版</h2>
                  </div>
                  <Sparkles className="h-5 w-5 text-apple-gray-600" />
                </div>

                <div className="space-y-3">
                  {scheduleTemplates.map((template) => (
                    <Link
                      key={template.name}
                      href="/coach/planner"
                      className="block rounded-2xl border border-black/10 bg-white p-4 transition hover:border-black/20 hover:bg-apple-gray-50"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="font-bold text-apple-gray-900">{template.name}</h3>
                        <ArrowRight className="h-4 w-4 text-apple-gray-500" />
                      </div>
                      <p className="mb-3 text-sm text-apple-gray-500">{template.focus}</p>
                      <div className="flex flex-wrap gap-2">
                        {template.sessions.map((session) => (
                          <span
                            key={session}
                            className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-semibold text-apple-gray-700"
                          >
                            {session}
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="apple-card p-6 md:p-7">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-apple-gray-500">Reply library</p>
                    <h2 className="text-2xl font-black text-apple-gray-900">教练备注库</h2>
                  </div>
                  <FileText className="h-5 w-5 text-apple-gray-600" />
                </div>

                <div className="space-y-3">
                  {coachNotes.map((note) => (
                    <article key={note.title} className="rounded-2xl border border-black/10 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="font-bold text-apple-gray-900">{note.title}</h3>
                        <button
                          onClick={() => handleCopyNote(note.body, note.title)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-apple-gray-700 transition hover:bg-apple-gray-100"
                          title={`复制${note.title}备注`}
                          aria-label={`复制${note.title}备注`}
                        >
                          {copiedNote === note.title ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-sm leading-6 text-apple-gray-600">{note.body}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="apple-card p-6 md:p-8">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-apple-gray-500">Feedback queue</p>
                  <h2 className="text-2xl font-black text-apple-gray-900">今日 / 本周训练回馈</h2>
                </div>
                <Link href="/coach/students" className="apple-button-secondary gap-2 px-4 py-2 text-sm">
                  全部学员
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {displayFeedback.length > 0 ? (
                <div className="space-y-4">
                  {displayFeedback.map((item) => (
                    <article key={item.id} className="rounded-3xl border border-black/10 bg-white p-5">
                    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h3 className="text-lg font-bold text-apple-gray-900">{item.student}</h3>
                        <p className="text-sm text-apple-gray-500">
                          {item.program} · {item.submittedAt}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle[item.status]}`}>
                        {item.status === 'flagged'
                          ? '需留意'
                          : item.status === 'new'
                            ? '新回馈'
                            : item.status === 'missing'
                              ? '未回报'
                              : '已看过'}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      {[
                        ['课表', item.workout],
                        ['实际', item.distance],
                        ['心率', item.heartRate],
                        ['RPE', item.rpe],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl bg-apple-gray-100 p-3">
                          <p className="text-xs text-apple-gray-500">{label}</p>
                          <p className="mt-1 font-bold text-apple-gray-900">{value}</p>
                        </div>
                      ))}
                    </div>

                    <p className="mt-4 rounded-2xl bg-apple-gray-50 p-4 text-sm leading-6 text-apple-gray-700">
                      {item.feeling}
                    </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-black/15 bg-white p-8 text-center">
                  <p className="text-lg font-bold text-apple-gray-900">还没有真实学员回馈</p>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-apple-gray-600">
                    学员从 `/student` 提交训练回馈后，资料会出现在这里；教练能看到当天或本周训练状态。
                  </p>
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <div className="apple-card p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-apple-gray-500">Bound athletes</p>
                    <h2 className="text-xl font-bold text-apple-gray-900">已绑定学员</h2>
                  </div>
                  <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-bold text-apple-gray-700">
                    {coachStudents.length} 人
                  </span>
                </div>

                {displayStudents.length > 0 ? (
                  <div className="space-y-3">
                    {displayStudents.map((row) => {
                      const student = row.student!

                      return (
                        <Link
                          key={row.id}
                          href="/coach/students"
                          className="block rounded-2xl border border-black/10 bg-white p-4 transition hover:border-black/20 hover:bg-apple-gray-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-bold text-apple-gray-900">
                                {student.name || student.email.split('@')[0]}
                              </h3>
                              <p className="mt-1 text-sm text-apple-gray-500">{student.email}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-apple-gray-500" />
                          </div>
                          <p className="mt-3 text-sm leading-6 text-apple-gray-600">
                            {student.program || student.goal || '尚未填写班级与目标'}
                          </p>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-black/15 bg-white p-5 text-sm leading-6 text-apple-gray-600">
                    绑定成功后，学员会马上出现在这里。
                  </div>
                )}

                <Link href="/coach/students" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-apple-gray-900">
                  查看全部学员
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {quickLinks.map((item) => (
                <Link key={item.href} href={item.href} className="apple-card block p-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-apple-gray-900">{item.title}</h2>
                  <p className="mt-3 leading-7 text-apple-gray-600">{item.description}</p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-apple-gray-900">
                    进入
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}

              <div className="apple-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-apple-gray-700" />
                  <h2 className="font-bold text-apple-gray-900">数据库状态</h2>
                </div>
                <p className="text-sm leading-6 text-apple-gray-600">
                  {liveFeedback.length > 0
                    ? '已读取 Supabase 的真实学员回馈。'
                    : '已切换为真实资料模式；目前等待学员提交第一笔回馈。'}
                </p>
              </div>

              <div className="apple-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <TimerReset className="h-5 w-5 text-apple-gray-700" />
                  <h2 className="font-bold text-apple-gray-900">本周节奏</h2>
                </div>
                <div className="space-y-3 text-sm leading-6 text-apple-gray-600">
                  <p>周一到周三优先处理反馈与补课表。</p>
                  <p>周四检查疲劳趋势，周五确认周末长距离安排。</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
