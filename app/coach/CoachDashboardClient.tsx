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
  UsersRound,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import CoachAccessPanel from '@/components/CoachAccessPanel'
import CoachSubNav from '@/components/CoachSubNav'
import { useLanguage } from '@/app/language-context'
import { getStudentDisplayEmail, getStudentDisplayName, hasStudentName } from '@/lib/student-display'

type FeedbackItem = {
  id: string
  student: string
  studentEmail: string
  studentHasName: boolean
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
  risk: RiskAssessment
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

type FeedbackProfile = {
  name: string | null
  email: string | null
  program: string | null
}

type TrainingFeedbackRow = {
  id: string
  created_at: string
  distance_km: number | null
  pace_text: string | null
  average_heart_rate: number | null
  rpe: number | null
  feeling: string | null
  status: FeedbackItem['status']
  profiles: FeedbackProfile | FeedbackProfile[] | null
  training_plans: { target: string | null } | Array<{ target: string | null }> | null
}

type RiskLevel = 'high' | 'medium' | 'low'

type RiskAssessment = {
  level: RiskLevel
  label: string
  tone: string
  score: number
  reasons: string[]
  action: string
}

const riskTone: Record<RiskLevel, string> = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-green-50 text-green-700',
}

const riskRank: Record<RiskLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

const redFlagPattern = /胸痛|胸闷|心悸|头晕|眩晕|呼吸困难|喘不过气|晕厥|昏厥|恶心|冒冷汗|麻木|刺痛|跛|跛行|不能走|无法走|肿|肿胀|红肿|剧痛|锐痛|撕裂|拉伤|扭伤|发热|发烧/i
const fatiguePattern = /疲劳|很累|睡眠差|睡不好|没恢复|恢复差|沉重|乏力|酸痛|压力大|状态差|不舒服|不适/i

function assessFeedbackRisk(rpeValue: number | string, feeling: string, status: FeedbackItem['status']): RiskAssessment {
  const rpe = typeof rpeValue === 'number' ? rpeValue : Number(rpeValue)
  const reasons: string[] = []
  let score = 0

  if (Number.isFinite(rpe)) {
    if (rpe >= 8) {
      score += 3
      reasons.push(`RPE ${rpe}：接近很吃力到最大努力`)
    } else if (rpe >= 6) {
      score += 2
      reasons.push(`RPE ${rpe}：偏高强度`)
    } else if (rpe >= 1) {
      score += 1
      reasons.push(`RPE ${rpe}：可继续观察`)
    }
  }

  if (redFlagPattern.test(feeling)) {
    score += 4
    reasons.push('出现疼痛、肿胀、头晕、胸闷等红旗描述')
  } else if (fatiguePattern.test(feeling)) {
    score += 2
    reasons.push('出现疲劳、恢复差或不适描述')
  }

  if (status === 'flagged') {
    score += 2
    reasons.push('系统已标记为需留意')
  }

  if (score >= 5) {
    return {
      level: 'high',
      label: '高风险',
      tone: riskTone.high,
      score,
      reasons,
      action: '优先联系学员，必要时暂停质量课并建议就医或转介专业人员。',
    }
  }

  if (score >= 3) {
    return {
      level: 'medium',
      label: '中风险',
      tone: riskTone.medium,
      score,
      reasons,
      action: '下次训练先降量或改轻松跑，24-48 小时内复查恢复情况。',
    }
  }

  return {
    level: 'low',
    label: '低风险',
    tone: riskTone.low,
    score,
    reasons: reasons.length > 0 ? reasons : ['未出现高 RPE 或红旗描述'],
    action: '维持计划，继续观察回馈趋势。',
  }
}

const quickLinks = [
  {
    href: '/coach/planner',
    icon: NotebookPen,
    title: '课表面板',
    description: '编辑周课表并写入 training_plans，同步到学员端。',
  },
  {
    href: '/coach/signups',
    icon: ClipboardList,
    title: '报名资料',
    description: '查看 4 周年活动与团练报名资料，筛选来源、更新状态并导出名单。',
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
    cache: 'no-store',
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

const formatFeedback = (item: TrainingFeedbackRow): FeedbackItem => {
  const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
  const trainingPlan = Array.isArray(item.training_plans) ? item.training_plans[0] : item.training_plans
  const feeling = item.feeling || '尚未填写感受。'
  const rpe = item.rpe ?? '-'
  const status = item.status as FeedbackItem['status']

  return {
    id: item.id,
    student: getStudentDisplayName(profile) || '已登录学员',
    studentEmail: getStudentDisplayEmail(profile),
    studentHasName: hasStudentName(profile),
    program: profile?.program || '尚未分班',
    workout: trainingPlan?.target || '自主训练回馈',
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
    rpe,
    feeling,
    status,
    risk: assessFeedbackRisk(rpe, feeling, status),
  }
}

export default function CoachDashboardClient() {
  const { t } = useLanguage()
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
          profiles:student_id (name, email, program),
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
  const highRiskCount = displayFeedback.filter((item) => item.risk.level === 'high').length
  const pendingRiskItems = displayFeedback
    .filter((item) => item.risk.level !== 'low' && item.status !== 'reviewed')
    .sort((a, b) => riskRank[b.risk.level] - riskRank[a.risk.level] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  const stats = useMemo(
    () => [
      { label: '今日回馈', value: todayFeedbackCount, icon: MessageSquareText },
      { label: '本周回馈', value: weekFeedbackCount, icon: ClipboardList },
      { label: '高风险', value: highRiskCount, icon: AlertTriangle },
      { label: '管理学员', value: coachStudents.length > 0 ? coachStudents.length : '待绑定', icon: UsersRound },
    ],
    [todayFeedbackCount, weekFeedbackCount, highRiskCount, coachStudents.length]
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
          <CoachSubNav />

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

          <div className="mb-8 grid gap-4 md:grid-cols-3">
              {[
              [t.coach.inviteInfoTitle, t.coach.inviteInfo],
              [t.coach.bindTitle, t.coach.bindFeedback],
              [t.planner.title, t.planner.noSelection],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/10">
                <h2 className="font-bold text-apple-gray-900">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-apple-gray-600">{description}</p>
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
                  <p className="text-sm text-apple-gray-500">Risk queue</p>
                  <h2 className="text-2xl font-black text-apple-gray-900">风险与待处理</h2>
                  <p className="mt-2 text-sm leading-6 text-apple-gray-600">
                    根据 RPE、疼痛/红旗描述、恢复状态和系统标记自动排序；高风险优先处理。
                  </p>
                </div>
                <Link href="/coach/students" className="apple-button-secondary gap-2 px-4 py-2 text-sm">
                  查看学员
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {pendingRiskItems.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {pendingRiskItems.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-black/10 bg-white p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-apple-gray-900">{item.student}</h3>
                          <p className="mt-1 text-sm text-apple-gray-500">
                            {item.studentHasName ? item.studentEmail : '学员尚未设置姓名'} · {item.submittedAt}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${item.risk.tone}`}>
                          {item.risk.label}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-apple-gray-600">{item.risk.reasons.join('；')}</p>
                      <p className="mt-3 rounded-2xl bg-apple-gray-100 p-3 text-sm leading-6 text-apple-gray-700">
                        {item.risk.action}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-black/15 bg-white p-8 text-center">
                  <p className="font-bold text-apple-gray-900">当前没有中高风险回馈</p>
                  <p className="mt-2 text-sm leading-6 text-apple-gray-600">
                    学员提交 RPE 偏高、疼痛、头晕、胸闷或恢复差等信息后，会自动进入这里。
                  </p>
                </div>
              )}
            </section>

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-1">
              <section className="apple-card p-6 md:p-7">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-apple-gray-500">Risk standard</p>
                    <h2 className="text-2xl font-black text-apple-gray-900">风险评判标准</h2>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-apple-gray-600" />
                </div>

                <div className="space-y-3 text-sm leading-6 text-apple-gray-600">
                  {[
                    ['高风险', 'RPE >= 8，或出现胸痛、胸闷、头晕、呼吸困难、明显疼痛/肿胀/跛行等红旗描述。'],
                    ['中风险', 'RPE 6-7，或出现疲劳、睡眠差、恢复差、酸痛和不适等描述。'],
                    ['低风险', 'RPE <= 5，且没有红旗或明显疲劳描述，按趋势继续观察。'],
                  ].map(([title, description]) => (
                    <div key={title} className="rounded-2xl border border-black/10 bg-white p-4">
                      <h3 className="font-bold text-apple-gray-900">{title}</h3>
                      <p className="mt-2">{description}</p>
                    </div>
                  ))}
                  <p className="rounded-2xl bg-apple-gray-100 p-4">
                    依据：Borg CR10/RPE 用于主观强度监控；IOC 共识支持训练负荷、疲劳、疼痛和健康状态监测；ACSM/AHA 将胸痛、头晕、异常呼吸困难等列为运动中需要停止并评估的警示信号。
                  </p>
                  <p className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">
                    {t.coach.disclaimer}
                  </p>
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
                          {item.studentHasName ? item.studentEmail : '学员尚未设置姓名'} · {item.program} · {item.submittedAt}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.risk.tone}`}>
                        {item.risk.label}
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

                    <p className="mt-4 whitespace-pre-line rounded-2xl bg-apple-gray-50 p-4 text-sm leading-6 text-apple-gray-700">
                      {item.feeling}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-apple-gray-600">
                      判断：{item.risk.reasons.join('；')}。建议：{item.risk.action}
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
                                {getStudentDisplayName(student) || student.email}
                              </h3>
                              <p className="mt-1 text-sm text-apple-gray-500">
                                {hasStudentName(student) ? getStudentDisplayEmail(student) : '学员尚未设置姓名'}
                              </p>
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

            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
