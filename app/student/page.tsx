'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Globe2,
  HeartPulse,
  ImageUp,
  Mic,
  MapPin,
  MessageSquareText,
  NotebookPen,
  Plus,
  Route,
  Send,
  ShieldCheck,
  Timer,
  Trash2,
  Trophy,
  UsersRound,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/app/providers'
import {
  addMyStudentRace,
  getMyStudentRaces,
  getMyTrainingFeedback,
  getMyTrainingPlans,
  removeMyStudentRace,
  submitTrainingFeedback,
  type StudentRace,
  type TrainingFeedback,
  type TrainingPlan,
} from '@/lib/supabase'

type RaceCatalogItem = {
  id: string
  raceName: string
  location: string
  country: string
  raceDate: string
  distance: string
}

const worldRaceCatalog: RaceCatalogItem[] = [
  { id: 'tokyo-marathon', raceName: 'Tokyo Marathon', location: 'Tokyo', country: 'Japan', raceDate: '2026-03-01', distance: 'Marathon' },
  { id: 'boston-marathon', raceName: 'Boston Marathon', location: 'Boston', country: 'United States', raceDate: '2026-04-20', distance: 'Marathon' },
  { id: 'london-marathon', raceName: 'London Marathon', location: 'London', country: 'United Kingdom', raceDate: '2026-04-26', distance: 'Marathon' },
  { id: 'berlin-marathon', raceName: 'Berlin Marathon', location: 'Berlin', country: 'Germany', raceDate: '2026-09-27', distance: 'Marathon' },
  { id: 'chicago-marathon', raceName: 'Chicago Marathon', location: 'Chicago', country: 'United States', raceDate: '2026-10-11', distance: 'Marathon' },
  { id: 'new-york-city-marathon', raceName: 'New York City Marathon', location: 'New York', country: 'United States', raceDate: '2026-11-01', distance: 'Marathon' },
  { id: 'paris-marathon', raceName: 'Paris Marathon', location: 'Paris', country: 'France', raceDate: '2026-04-12', distance: 'Marathon' },
  { id: 'gold-coast-marathon', raceName: 'Gold Coast Marathon', location: 'Gold Coast', country: 'Australia', raceDate: '2026-07-05', distance: 'Marathon' },
  { id: 'seoul-marathon', raceName: 'Seoul Marathon', location: 'Seoul', country: 'South Korea', raceDate: '2026-03-15', distance: 'Marathon' },
  { id: 'taipei-marathon', raceName: 'Taipei Marathon', location: 'Taipei', country: 'Taiwan', raceDate: '2026-12-20', distance: 'Marathon / Half Marathon' },
]

function formatRaceDate(date: string | null) {
  if (!date) return '日期待确认'
  return new Date(
    date + 'T00:00:00'
  ).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function StudentPage() {
  const { user, isLoggedIn, isLoading } = useAuth()
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [recentFeedback, setRecentFeedback] = useState<TrainingFeedback[]>([])
  const [studentRaces, setStudentRaces] = useState<StudentRace[]>([])
  const [dataError, setDataError] = useState('')
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [selectedRaceId, setSelectedRaceId] = useState(worldRaceCatalog[0].id)
  const [raceError, setRaceError] = useState('')
  const [raceMessage, setRaceMessage] = useState('')
  const [isAddingRace, setIsAddingRace] = useState(false)
  const [customRace, setCustomRace] = useState({
    raceName: '',
    location: '',
    country: '',
    raceDate: '',
    distance: '',
  })
  const [feedback, setFeedback] = useState({
    distance: '',
    duration: '',
    pace: '',
    heartRate: '',
    rpe: 6,
    feeling: '',
  })

  const latestPlan = plans[0]
  const displayName = user?.name || '好运跑者'
  const currentWeek = latestPlan?.week_number
  const currentProgram = user?.role === 'coach' ? '教练账号' : '好运跑班学员'
  const currentGoal = user?.pb ? `目前 PB：${user.pb}` : '等待教练同步目标'
  const isCoach = user?.role === 'coach' || user?.role === 'admin'
  const selectedCatalogRace = worldRaceCatalog.find((race) => race.id === selectedRaceId) ?? worldRaceCatalog[0]
  const isCustomRace = selectedRaceId === 'custom'

  const groupedPlans = useMemo(() => {
    const byWeek = new Map<number, TrainingPlan[]>()
    plans.forEach((plan) => {
      const weekPlans = byWeek.get(plan.week_number) ?? []
      weekPlans.push(plan)
      byWeek.set(plan.week_number, weekPlans)
    })

    return Array.from(byWeek.entries()).map(([week, weekPlans]) => ({
      week,
      plans: weekPlans,
    }))
  }, [plans])

  useEffect(() => {
    const loadStudentData = async () => {
      if (!user) {
        setPlans([])
        setRecentFeedback([])
        setStudentRaces([])
        return
      }

      setIsLoadingData(true)
      setDataError('')

      try {
        const [planData, feedbackData, raceData] = await Promise.all([
          getMyTrainingPlans(user.id),
          getMyTrainingFeedback(user.id),
          getMyStudentRaces(user.id),
        ])

        setPlans(planData)
        setRecentFeedback(feedbackData)
        setStudentRaces(raceData)
      } catch (error) {
        console.error('Load student dashboard data error:', error)
        setDataError(error instanceof Error ? error.message : '读取学员资料失败。')
      } finally {
        setIsLoadingData(false)
      }
    }

    loadStudentData()
  }, [user])

  const updateField = (field: keyof typeof feedback, value: string | number) => {
    setFeedback((current) => ({ ...current, [field]: value }))
  }

  const parseDistance = (value: string) => {
    const match = value.replace(',', '.').match(/\d+(\.\d+)?/)
    return match ? Number(match[0]) : null
  }

  const parseHeartRate = (value: string) => {
    const match = value.match(/\d+/)
    return match ? Number(match[0]) : null
  }


  const updateCustomRace = (field: keyof typeof customRace, value: string) => {
    setCustomRace((current) => ({ ...current, [field]: value }))
    setRaceMessage('')
    setRaceError('')
  }

  const handleAddRace = async () => {
    setRaceError('')
    setRaceMessage('')

    if (!isLoggedIn || !user) {
      setRaceError('请先登录，登录后才能保存赛事目标。')
      return
    }

    const raceInput = isCustomRace
      ? {
          race_name: customRace.raceName.trim(),
          location: customRace.location.trim(),
          country: customRace.country.trim(),
          race_date: customRace.raceDate || null,
          distance: customRace.distance.trim(),
          source: 'custom' as const,
        }
      : {
          race_name: selectedCatalogRace.raceName,
          location: selectedCatalogRace.location,
          country: selectedCatalogRace.country,
          race_date: selectedCatalogRace.raceDate,
          distance: selectedCatalogRace.distance,
          source: 'catalog' as const,
        }

    if (!raceInput.race_name) {
      setRaceError('请填写赛事名称。')
      return
    }

    setIsAddingRace(true)

    try {
      const savedRace = await addMyStudentRace({
        student_id: user.id,
        ...raceInput,
        status: 'accepted',
        notes: '学员已中签，加入目标赛事面板。',
      })
      setStudentRaces((current) =>
        [...current, savedRace].sort((a, b) =>
          (a.race_date || '9999-12-31').localeCompare(b.race_date || '9999-12-31')
        )
      )
      setRaceMessage('已加入你的目标赛事面板。')
      if (isCustomRace) {
        setCustomRace({ raceName: '', location: '', country: '', raceDate: '', distance: '' })
      }
    } catch (error) {
      setRaceError(error instanceof Error ? error.message : '保存赛事失败，请稍后再试。')
    } finally {
      setIsAddingRace(false)
    }
  }

  const handleRemoveRace = async (raceId: string) => {
    if (!user) return

    setRaceError('')
    setRaceMessage('')

    try {
      await removeMyStudentRace(raceId, user.id)
      setStudentRaces((current) => current.filter((race) => race.id !== raceId))
      setRaceMessage('已从面板移除该赛事。')
    } catch (error) {
      setRaceError(error instanceof Error ? error.message : '移除赛事失败，请稍后再试。')
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitError('')
    setSubmitted(false)

    if (!isLoggedIn || !user) {
      setSubmitError('请先登入，登入后回馈才会同步到教练端。')
      return
    }

    setIsSubmitting(true)

    try {
      await submitTrainingFeedback({
        training_plan_id: latestPlan?.id ?? null,
        student_id: user.id,
        coach_id: latestPlan?.coach_id ?? null,
        distance_km: parseDistance(feedback.distance),
        duration_text: feedback.duration,
        pace_text: feedback.pace,
        average_heart_rate: parseHeartRate(feedback.heartRate),
        rpe: feedback.rpe,
        feeling: feedback.feeling,
      })

      setSubmitted(true)
      const feedbackData = await getMyTrainingFeedback(user.id)
      setRecentFeedback(feedbackData)
    } catch (error) {
      console.error('Submit training feedback error:', error)
      setSubmitError(error instanceof Error ? error.message : '提交失败，请稍后再试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCoach) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-7xl">
            <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                  Coach dashboard
                </p>
                <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">
                  {displayName}，这里改为教练工作视角。
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                  你的账号已經启用教练权限，因此不再显示学员的训练感受表单。接下來的重點会放在学员状态、课表同步与回馈处理。
                </p>
              </div>

              <div className="apple-card p-5">
                <p className="text-sm text-apple-gray-500">目前身份</p>
                <p className="mt-1 text-xl font-bold text-apple-gray-900">好运跑班教练</p>
                <p className="mt-1 text-sm text-apple-gray-600">可管理绑定学员与训练课表</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  href: '/coach',
                  icon: ShieldCheck,
                  title: '教练工作台',
                  description: '集中查看学员回馈、权限状态与今日待处理事項。',
                },
                {
                  href: '/coach/students',
                  icon: UsersRound,
                  title: '学员状态',
                  description: '绑定学员后，查看目标、PB、班级与后续回馈状态。',
                },
                {
                  href: '/coach/planner',
                  icon: NotebookPen,
                  title: '课表面板',
                  description: '进入课表面板，保存后写入 training_plans 并同步到学员端。',
                },
              ].map((item) => (
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
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                Student dashboard
              </p>
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">
                {displayName}，今天照顾好这一课。
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                课表、完成状态与训练感受都集中在这里。回报越清楚，教练越能帮你把下一周調得刚刚好。
              </p>
            </div>
            <div className="apple-card p-5">
              <p className="text-sm text-apple-gray-500">目前計畫</p>
              <p className="mt-1 text-xl font-bold text-apple-gray-900">{currentProgram}</p>
              <p className="mt-1 text-sm text-apple-gray-600">
                {currentWeek ? `第 ${currentWeek} 周 · ` : ''}
                {currentGoal}
              </p>
            </div>
          </div>

          {dataError && (
            <div className="mb-6 rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              目前真实资料读取失败，请稍后再试。信息：{dataError}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="space-y-6">
              <article className="apple-card p-6 md:p-8">
                {latestPlan ? (
                  <>
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-apple-blue">
                          {latestPlan.workout_date}
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-apple-gray-900">
                          最新训练：{latestPlan.title}
                        </h2>
                      </div>
                      <span className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">
                        已同步
                      </span>
                    </div>

                    <div className="rounded-3xl bg-apple-gray-100 p-5">
                      <p className="text-2xl font-black text-apple-gray-900">{latestPlan.target}</p>
                      <p className="mt-2 text-apple-gray-600">{latestPlan.pace || '配速由教练視状态调整'}</p>
                      <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-apple-gray-600">
                        {latestPlan.note || '完成后请回报 RPE、实际里程、心率与感受。'}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-3xl bg-apple-gray-100 p-6">
                    <p className="text-sm font-semibold text-apple-blue">
                      {isLoadingData ? '同步中' : '尚未同步课表'}
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-apple-gray-900">
                      等待教练建立你的第一份课表。
                    </h2>
                    <p className="mt-3 leading-7 text-apple-gray-600">
                      你仍然可以先提交自主训练回馈；教练完成绑定与课表面板后，这里会显示你的真实训练内容。
                    </p>
                  </div>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: Route, label: '训练类型', value: latestPlan?.title || '自主回馈' },
                    { icon: Timer, label: '周数', value: currentWeek ? `第 ${currentWeek} 周` : '待同步' },
                    { icon: CalendarDays, label: '教练', value: latestPlan ? '已绑定' : '待绑定' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-black/10 bg-white p-4">
                      <item.icon className="mb-3 h-5 w-5 text-apple-gray-700" />
                      <p className="text-xs text-apple-gray-500">{item.label}</p>
                      <p className="mt-1 font-bold text-apple-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </article>


              <article className="apple-card p-6 md:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-apple-blue">Global race goals</p>
                    <h2 className="mt-1 text-2xl font-black text-apple-gray-900">我的目标赛事</h2>
                    <p className="mt-2 text-sm leading-6 text-apple-gray-600">
                      中签后把赛事加入面板，教练之后可以围绕目标比赛调整训练节奏。
                    </p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-white">
                    <Trophy className="h-6 w-6" />
                  </div>
                </div>

                {studentRaces.length > 0 ? (
                  <div className="mb-6 space-y-3">
                    {studentRaces.map((race) => (
                      <div key={race.id} className="rounded-2xl border border-black/10 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-apple-gray-900">{race.race_name}</h3>
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-apple-gray-600">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {race.location}{race.country ? ', ' + race.country : ''}
                              </span>
                              <span>{formatRaceDate(race.race_date)}</span>
                              <span>{race.distance || '距离待确认'}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRace(race.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-apple-gray-600 transition hover:bg-red-50 hover:text-red-600"
                            aria-label="移除赛事"
                            title="移除赛事"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                          已中签
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mb-6 rounded-3xl border border-dashed border-black/15 bg-white p-6 text-center">
                    <Globe2 className="mx-auto mb-3 h-8 w-8 text-apple-gray-400" />
                    <p className="font-bold text-apple-gray-900">还没有目标赛事</p>
                    <p className="mt-2 text-sm leading-6 text-apple-gray-600">选择一个全球赛事，或手动输入你已中签的比赛。</p>
                  </div>
                )}

                <div className="rounded-3xl bg-apple-gray-100 p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-apple-gray-700">选择赛事</span>
                      <select
                        value={selectedRaceId}
                        onChange={(event) => {
                          setSelectedRaceId(event.target.value)
                          setRaceError('')
                          setRaceMessage('')
                        }}
                        className="apple-input bg-white"
                      >
                        {worldRaceCatalog.map((race) => (
                          <option key={race.id} value={race.id}>
                            {race.raceName} · {race.location}
                          </option>
                        ))}
                        <option value="custom">自定义其他赛事</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={handleAddRace}
                      disabled={isAddingRace}
                      className="apple-button-primary gap-2 px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus className="h-4 w-4" />
                      {isAddingRace ? '添加中...' : '加入面板'}
                    </button>
                  </div>

                  {isCustomRace ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input value={customRace.raceName} onChange={(event) => updateCustomRace('raceName', event.target.value)} placeholder="赛事名称" className="apple-input bg-white" />
                      <input value={customRace.distance} onChange={(event) => updateCustomRace('distance', event.target.value)} placeholder="距离，例如 Marathon / 10K" className="apple-input bg-white" />
                      <input value={customRace.location} onChange={(event) => updateCustomRace('location', event.target.value)} placeholder="城市" className="apple-input bg-white" />
                      <input value={customRace.country} onChange={(event) => updateCustomRace('country', event.target.value)} placeholder="国家 / 地区" className="apple-input bg-white" />
                      <input type="date" value={customRace.raceDate} onChange={(event) => updateCustomRace('raceDate', event.target.value)} className="apple-input bg-white sm:col-span-2" />
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-apple-gray-600">
                      {selectedCatalogRace.location}, {selectedCatalogRace.country} · {formatRaceDate(selectedCatalogRace.raceDate)} · {selectedCatalogRace.distance}
                    </div>
                  )}

                  {raceMessage && <p className="mt-4 rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-800">{raceMessage}</p>}
                  {raceError && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{raceError}</p>}
                </div>
              </article>

              <article className="apple-card p-6 md:p-8">
                <h2 className="mb-5 text-xl font-bold text-apple-gray-900">本周课表</h2>
                {groupedPlans.length > 0 ? (
                  <div className="space-y-4">
                    {groupedPlans.map((group) => (
                      <div key={group.week} className="rounded-3xl border border-black/10 bg-white p-5">
                        <h3 className="mb-4 font-bold text-apple-gray-900">第 {group.week} 周</h3>
                        <div className="space-y-3">
                          {group.plans.map((workout) => (
                            <div
                              key={workout.id}
                              className="grid gap-4 rounded-2xl bg-apple-gray-100 p-4 md:grid-cols-[120px_1fr]"
                            >
                              <div>
                                <p className="text-sm font-bold text-apple-gray-900">{workout.day_label}</p>
                                <p className="text-xs text-apple-gray-500">{workout.workout_date}</p>
                              </div>
                              <div>
                                <h4 className="font-bold text-apple-gray-900">{workout.title}</h4>
                                <p className="mt-2 text-sm text-apple-gray-600">{workout.target}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-black/15 bg-white p-6 text-center">
                    <p className="font-bold text-apple-gray-900">目前没有已同步课表</p>
                    <p className="mt-2 text-sm leading-6 text-apple-gray-600">
                      教练端完成学员绑定与课表面板后，这里会自动显示你的周课表。
                    </p>
                  </div>
                )}
              </article>

              <article className="apple-card p-6 md:p-8">
                <h2 className="mb-5 text-xl font-bold text-apple-gray-900">最近回馈</h2>
                {recentFeedback.length > 0 ? (
                  <div className="space-y-3">
                    {recentFeedback.map((item) => (
                      <div key={item.id} className="rounded-3xl border border-black/10 bg-white p-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="font-bold text-apple-gray-900">
                            {new Date(item.created_at).toLocaleString('zh-TW', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-semibold text-apple-gray-600">
                            RPE {item.rpe ?? '-'}
                          </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <p className="text-sm text-apple-gray-600">里程：{item.distance_km ?? '-'} km</p>
                          <p className="text-sm text-apple-gray-600">配速：{item.pace_text || '-'}</p>
                          <p className="text-sm text-apple-gray-600">心率：{item.average_heart_rate ?? '-'}</p>
                        </div>
                        {item.feeling && (
                          <p className="mt-3 rounded-2xl bg-apple-gray-100 p-3 text-sm leading-6 text-apple-gray-700">
                            {item.feeling}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-black/15 bg-white p-6 text-center">
                    <p className="font-bold text-apple-gray-900">还没有回馈记录</p>
                    <p className="mt-2 text-sm text-apple-gray-600">完成一次训练后，从右侧表单提交即可留下记录。</p>
                  </div>
                )}
              </article>
            </section>

            <section className="apple-card p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                  <MessageSquareText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-apple-gray-500">完成后回报</p>
                  <h2 className="text-2xl font-black text-apple-gray-900">今日训练感受</h2>
                </div>
              </div>

              <form
                className="space-y-5"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { key: 'distance', label: '实际里程', placeholder: '例如 8.2 km', icon: Route },
                    { key: 'duration', label: '完成時間', placeholder: '例如 42:10', icon: Timer },
                    { key: 'pace', label: '平均配速', placeholder: '例如 5:03/km', icon: Activity },
                    { key: 'heartRate', label: '平均心率', placeholder: '例如 158', icon: HeartPulse },
                  ].map((field) => (
                    <label key={field.key} className="block">
                      <span className="mb-2 block text-sm font-semibold text-apple-gray-700">
                        {field.label}
                      </span>
                      <div className="relative">
                        <field.icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
                        <input
                          value={feedback[field.key as keyof typeof feedback] as string}
                          onChange={(event) =>
                            updateField(field.key as keyof typeof feedback, event.target.value)
                          }
                          placeholder={field.placeholder}
                          className="apple-input pl-11"
                        />
                      </div>
                    </label>
                  ))}
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-apple-gray-700">
                    RPE 體感強度：{feedback.rpe}
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={feedback.rpe}
                    onChange={(event) => updateField('rpe', Number(event.target.value))}
                    className="w-full"
                  />
                  <div className="mt-1 flex justify-between text-xs text-apple-gray-500">
                    <span>很輕鬆</span>
                    <span>刚刚好</span>
                    <span>非常吃力</span>
                  </div>
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-apple-gray-700">文字或語音感受</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-apple-gray-700"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      語音輸入開發中
                    </button>
                  </div>
                  <textarea
                    value={feedback.feeling}
                    onChange={(event) => updateField('feeling', event.target.value)}
                    rows={5}
                    placeholder="例如：今天 T 段最后一公里偏硬，右小腿有一点紧，但没有痛。"
                    className="apple-input resize-none"
                  />
                </label>

                <div className="rounded-3xl border border-dashed border-black/20 bg-white p-6 text-center">
                  <ImageUp className="mx-auto mb-3 h-8 w-8 text-apple-gray-400" />
                  <p className="font-semibold text-apple-gray-800">上傳跑步 App 截圖</p>
                  <p className="mt-1 text-sm text-apple-gray-500">
                    第一版先做保存图片；自动辨識里程、心率与配速可放到后端階段。
                  </p>
                </div>

                {submitted && (
                  <div className="flex items-start gap-3 rounded-3xl bg-green-50 p-4 text-green-800">
                    <CheckCircle2 className="mt-0.5 h-5 w-5" />
                    <p className="text-sm leading-6">
                      已提交。教练端的「今日待处理」会看到這筆回馈，並依照 RPE 与感受调整下一次课表。
                    </p>
                  </div>
                )}

                {submitError && (
                  <div className="rounded-3xl bg-red-50 p-4 text-sm leading-6 text-red-700">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="apple-button-primary w-full gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? '提交中...' : '提交給教练'}
                </button>
              </form>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}
