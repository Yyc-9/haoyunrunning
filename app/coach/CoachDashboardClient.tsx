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

const redFlagPattern = /胸痛|胸悶|心悸|頭暈|眩晕|呼吸困難|喘不过气|晕厥|昏厥|恶心|冒冷汗|麻木|刺痛|跛|跛行|不能走|無法走|肿|腫脹|紅肿|剧痛|锐痛|撕裂|拉傷|扭傷|发热|发烧/i
const fatiguePattern = /疲勞|很累|睡眠差|睡不好|没恢復|恢復差|沉重|乏力|酸痛|压力大|狀態差|不舒服|不適/i

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
      reasons.push(`RPE ${rpe}：偏高強度`)
    } else if (rpe >= 1) {
      score += 1
      reasons.push(`RPE ${rpe}：可繼續觀察`)
    }
  }

  if (redFlagPattern.test(feeling)) {
    score += 4
    reasons.push('出現疼痛、腫脹、頭暈、胸悶等紅旗描述')
  } else if (fatiguePattern.test(feeling)) {
    score += 2
    reasons.push('出現疲勞、恢復差或不適描述')
  }

  if (status === 'flagged') {
    score += 2
    reasons.push('系統已標記为需留意')
  }

  if (score >= 5) {
    return {
      level: 'high',
      label: '高風險',
      tone: riskTone.high,
      score,
      reasons,
      action: '優先聯絡學員，必要时暫停質量课並建議就醫或轉介專業人員。',
    }
  }

  if (score >= 3) {
    return {
      level: 'medium',
      label: '中風險',
      tone: riskTone.medium,
      score,
      reasons,
      action: '下次訓練先降量或改輕鬆跑，24-48 小時內複查恢復情況。',
    }
  }

  return {
    level: 'low',
    label: '低風險',
    tone: riskTone.low,
    score,
    reasons: reasons.length > 0 ? reasons : ['未出現高 RPE 或紅旗描述'],
    action: '维持计划，繼續觀察回饋趨勢。',
  }
}

const quickLinks = [
  {
    href: '/coach/planner',
    icon: NotebookPen,
    title: '課表面板',
    description: '編輯週課表並寫入 training_plans，同步到學員端。',
  },
  {
    href: '/coach/signups',
    icon: ClipboardList,
    title: '報名資料',
    description: '查看 4 週年活動與團練報名資料，篩選來源、更新狀態並匯出名單。',
  },
]

const coachNotes = [
  {
    title: '狀態正常',
    body: '这周狀態稳定，先维持目前強度。注意 easy run 不要跑快，长距离後补足碳水和睡眠。',
  },
  {
    title: '疲勞偏高',
    body: '今天反馈顯示疲勞偏高，下一次訓練先下调 20% 量，保留輕鬆跑和拉伸，暂不追配速。',
  },
  {
    title: '疼痛觀察',
    body: '先記錄疼痛位置、程度和出現時機。若熱身後沒有緩解，本週把質量課改成交叉訓練。',
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
    throw new Error('請先登入教練帳號。')
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
    throw new Error(payload.error || '讀取學員失敗，請稍後再試。')
  }

  return payload.students ?? []
}

const formatFeedback = (item: TrainingFeedbackRow): FeedbackItem => {
  const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
  const trainingPlan = Array.isArray(item.training_plans) ? item.training_plans[0] : item.training_plans
  const feeling = item.feeling || '尚未填寫感受。'
  const rpe = item.rpe ?? '-'
  const status = item.status as FeedbackItem['status']

  return {
    id: item.id,
    student: getStudentDisplayName(profile) || '已登入學員',
    studentEmail: getStudentDisplayEmail(profile),
    studentHasName: hasStudentName(profile),
    program: profile?.program || '尚未分班',
    workout: trainingPlan?.target || '自主訓練回饋',
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
      setStudentLoadError(err instanceof Error ? err.message : '讀取學員失敗，請稍後再試。')
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
      { label: '今日回饋', value: todayFeedbackCount, icon: MessageSquareText },
      { label: '本週回饋', value: weekFeedbackCount, icon: ClipboardList },
      { label: '高風險', value: highRiskCount, icon: AlertTriangle },
      { label: '管理學員', value: coachStudents.length > 0 ? coachStudents.length : '待綁定', icon: UsersRound },
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
                教練工作台
              </p>
              <h1 className="text-4xl font-black leading-tight text-apple-gray-900 md:text-6xl">
                今天不用再一個一個等 Line。
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-apple-gray-600">
                教練端會集中訓練回饋、標出風險，並提供清楚的課表入口。這裡會成為每天調整訓練的主畫面。
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
              目前教練端讀取真實資料受權限限制。之後完成教練角色與學員綁定後，這裡會只顯示所屬學員回饋。資訊：{loadError}
            </div>
          )}

          {studentLoadError && (
            <div className="mb-6 rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              目前無法讀取已綁定學員。請確認帳號已啟用教練權限。資訊：{studentLoadError}
            </div>
          )}

          <div className="mb-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="apple-card p-6 md:p-7">
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm text-apple-gray-500">風險佇列</p>
                  <h2 className="text-2xl font-black text-apple-gray-900">風險與待處理</h2>
                  <p className="mt-2 text-sm leading-6 text-apple-gray-600">
                    根據 RPE、疼痛/紅旗描述、恢復狀態和系統標記自動排序；高風險優先處理。
                  </p>
                </div>
                <Link href="/coach/students" className="apple-button-secondary gap-2 px-4 py-2 text-sm">
                  查看學員
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
                            {item.studentHasName ? item.studentEmail : '學員尚未設定姓名'} · {item.submittedAt}
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
                  <p className="font-bold text-apple-gray-900">目前沒有中高風險回饋</p>
                  <p className="mt-2 text-sm leading-6 text-apple-gray-600">
                    學員提交 RPE 偏高、疼痛、頭暈、胸悶或恢復差等資訊後，會自動進入這裡。
                  </p>
                </div>
              )}
            </section>

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-1">
              <section className="apple-card p-6 md:p-7">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-apple-gray-500">風險標準</p>
                    <h2 className="text-2xl font-black text-apple-gray-900">風險評判標准</h2>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-apple-gray-600" />
                </div>

                <div className="space-y-3 text-sm leading-6 text-apple-gray-600">
                  {[
                    ['高風險', 'RPE >= 8，或出現胸痛、胸悶、頭暈、呼吸困難、明顯疼痛/腫脹/跛行等紅旗描述。'],
                    ['中風險', 'RPE 6-7，或出現疲勞、睡眠差、恢復差、酸痛和不適等描述。'],
                    ['低風險', 'RPE <= 5，且沒有紅旗或明顯疲勞描述，按趨勢繼續觀察。'],
                  ].map(([title, description]) => (
                    <div key={title} className="rounded-2xl border border-black/10 bg-white p-4">
                      <h3 className="font-bold text-apple-gray-900">{title}</h3>
                      <p className="mt-2">{description}</p>
                    </div>
                  ))}
                  <p className="rounded-2xl bg-apple-gray-100 p-4">
                    依據：Borg CR10/RPE 用於主觀強度監控；IOC 共識支援訓練負荷、疲勞、疼痛和健康狀態監測；ACSM/AHA 將胸痛、頭暈、異常呼吸困難等列为運動中需要停止並評估的警示訊號。
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
                    <h2 className="text-2xl font-black text-apple-gray-900">教練备注库</h2>
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
                  <h2 className="text-2xl font-black text-apple-gray-900">今日 / 本週訓練回饋</h2>
                </div>
                <Link href="/coach/students" className="apple-button-secondary gap-2 px-4 py-2 text-sm">
                  全部學員
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
                          {item.studentHasName ? item.studentEmail : '學員尚未設定姓名'} · {item.program} · {item.submittedAt}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.risk.tone}`}>
                        {item.risk.label}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      {[
                        ['課表', item.workout],
                        ['實際', item.distance],
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
                      判断：{item.risk.reasons.join('；')}。建議：{item.risk.action}
                    </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-black/15 bg-white p-8 text-center">
                  <p className="text-lg font-bold text-apple-gray-900">還沒有真實學員回饋</p>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-apple-gray-600">
                    學員從 `/student` 提交訓練回饋後，資料會出現在這裡；教練能看到當天或本週訓練狀態。
                  </p>
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <div className="apple-card p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-apple-gray-500">Bound athletes</p>
                    <h2 className="text-xl font-bold text-apple-gray-900">已綁定學員</h2>
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
                                {hasStudentName(student) ? getStudentDisplayEmail(student) : '學員尚未設定姓名'}
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-apple-gray-500" />
                          </div>
                          <p className="mt-3 text-sm leading-6 text-apple-gray-600">
                            {student.program || student.goal || '尚未填寫班級與目標'}
                          </p>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-black/15 bg-white p-5 text-sm leading-6 text-apple-gray-600">
                    綁定成功後，學員會马上出現在這裡。
                  </div>
                )}

                <Link href="/coach/students" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-apple-gray-900">
                  查看全部學員
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
                    進入
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}

              <div className="apple-card p-6">
                <div className="mb-4 flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-apple-gray-700" />
                  <h2 className="font-bold text-apple-gray-900">資料库狀態</h2>
                </div>
                <p className="text-sm leading-6 text-apple-gray-600">
                  {liveFeedback.length > 0
                    ? '已讀取 Supabase 的真實學員回饋。'
                    : '已切换为真實資料模式；目前等待學員提交第一笔回饋。'}
                </p>
              </div>

            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
