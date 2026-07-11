'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Globe2,
  HeartPulse,
  MapPin,
  MessageSquareText,
  NotebookPen,
  Plus,
  Route,
  Send,
  ShieldCheck,
  Settings,
  Timer,
  Trash2,
  Trophy,
  UsersRound,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/app/providers'
import { useLanguage } from '@/app/language-context'
import StudentCoachBindingPanel from '@/components/StudentCoachBindingPanel'
import {
  addMyStudentRace,
  getMyStudentRaces,
  getMyStudentAccess,
  getMyTrainingFeedback,
  getMyTrainingPlans,
  removeMyStudentRace,
  supabase,
  submitTrainingFeedback,
  type StudentRace,
  type StudentAccessState,
  type TrainingFeedback,
  type TrainingPlan,
} from '@/lib/supabase'
import {
  formatTodayLabel,
  formatWeekRange,
  getTodayInfo,
  isToday,
} from '@/lib/week-dates'

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
  if (!date) return '日期待確認'
  return new Date(
    date + 'T00:00:00'
  ).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function StudentPage() {
  const { user, isLoggedIn, isLoading, updateUser } = useAuth()
  const { language, t } = useLanguage()
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [recentFeedback, setRecentFeedback] = useState<TrainingFeedback[]>([])
  const [studentRaces, setStudentRaces] = useState<StudentRace[]>([])
  const [studentAccessState, setStudentAccessState] = useState<StudentAccessState>('legacy_open')
  const [canAccessTraining, setCanAccessTraining] = useState(true)
  const [coachBound, setCoachBound] = useState(false)
  const [boundCoachName, setBoundCoachName] = useState('')
  const [dataError, setDataError] = useState('')
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [selectedRaceId, setSelectedRaceId] = useState(worldRaceCatalog[0].id)
  const [raceError, setRaceError] = useState('')
  const [raceMessage, setRaceMessage] = useState('')
  const [isAddingRace, setIsAddingRace] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')
  const [settingsError, setSettingsError] = useState('')
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
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
    sleepQuality: '普通',
    fatigueLevel: '普通',
    painLocation: '',
    completedOriginalPlan: '完成原計畫',
    note: '',
    screenshotName: '',
    feeling: '',
  })
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    pb: '',
  })
  const [now, setNow] = useState(() => new Date())

  const todayInfo = useMemo(() => getTodayInfo(now, language), [language, now])
  const currentWeekPlans = useMemo(
    () => plans.filter((plan) => plan.week_start === todayInfo.weekStart || (plan.workout_date >= todayInfo.weekStart && plan.workout_date <= todayInfo.weekEnd)),
    [plans, todayInfo.weekEnd, todayInfo.weekStart]
  )
  const todayPlan = useMemo(
    () => currentWeekPlans.find((plan) => isToday(plan.workout_date, todayInfo.todayIso)) ?? null,
    [currentWeekPlans, todayInfo.todayIso]
  )
  const latestPlan = todayPlan ?? currentWeekPlans[0]
  const displayName = user?.name || '好運跑者'
  const currentWeek = latestPlan?.week_number
  const currentProgram = user?.role === 'coach' ? '教練帳號' : '好運跑班學員'
  const currentGoal = user?.pb ? `目前 PB：${user.pb}` : '等待教練同步目標'
  const isCoach = user?.role === 'coach' || user?.role === 'admin'
  const coachStatusText = boundCoachName || (coachBound || latestPlan ? '已綁定' : '待綁定')
  const selectedCatalogRace = worldRaceCatalog.find((race) => race.id === selectedRaceId) ?? worldRaceCatalog[0]
  const isCustomRace = selectedRaceId === 'custom'
  const submittedPlanIds = new Set(
    recentFeedback
      .map((item) => item.training_plan_id)
      .filter((id): id is string => Boolean(id))
  )
  const currentWeekPlanIds = new Set(currentWeekPlans.map((plan) => plan.id))
  const completedPlanCount = Array.from(submittedPlanIds).filter((id) => currentWeekPlanIds.has(id)).length
  const completionRate = currentWeekPlans.length > 0 ? Math.min(100, Math.round((completedPlanCount / currentWeekPlans.length) * 100)) : 0
  const totalDistance = recentFeedback.reduce((sum, item) => sum + (item.distance_km ?? 0), 0)
  const feedbackWithRpe = recentFeedback.filter((item) => typeof item.rpe === 'number')
  const averageRpe =
    feedbackWithRpe.length > 0
      ? feedbackWithRpe.reduce((sum, item) => sum + (item.rpe ?? 0), 0) / feedbackWithRpe.length
      : null
  const feedbackWithHeartRate = recentFeedback.filter((item) => typeof item.average_heart_rate === 'number')
  const averageHeartRate =
    feedbackWithHeartRate.length > 0
      ? Math.round(
          feedbackWithHeartRate.reduce((sum, item) => sum + (item.average_heart_rate ?? 0), 0) /
            feedbackWithHeartRate.length
        )
      : null
  const latestFeedback = recentFeedback[0]
  const recentLoadItems = recentFeedback
    .slice(0, 7)
    .reverse()
    .map((item) => ({
      id: item.id,
      label: new Date(item.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      load: Math.round((item.distance_km ?? 0) * (item.rpe ?? 0)),
      distance: item.distance_km ?? 0,
      rpe: item.rpe,
    }))
  const maxRecentLoad = Math.max(...recentLoadItems.map((item) => item.load), 1)
  const trainingLoad = recentLoadItems.reduce((sum, item) => sum + item.load, 0)
  const intensityScore = averageRpe ? Math.min(100, Math.round((averageRpe / 10) * 100)) : 0
  const aerobicShare =
    recentFeedback.length > 0
      ? Math.round((recentFeedback.filter((item) => (item.rpe ?? 0) <= 5).length / recentFeedback.length) * 100)
      : 0
  const tempoShare =
    recentFeedback.length > 0
      ? Math.round((recentFeedback.filter((item) => (item.rpe ?? 0) > 5 && (item.rpe ?? 0) <= 7).length / recentFeedback.length) * 100)
      : 0
  const hardShare = recentFeedback.length > 0 ? Math.max(0, 100 - aerobicShare - tempoShare) : 0
  const trainingStatus =
    recentFeedback.length === 0
      ? '等待首次回饋'
      : averageRpe && averageRpe >= 8
        ? '強度偏高'
        : completionRate >= 75
          ? '穩定推進'
          : '建立節奏'
  const recoveryHint =
    recentFeedback.length === 0
      ? '先提交一次訓練回饋'
      : averageRpe && averageRpe >= 8
        ? '請和教練確認恢復'
        : averageHeartRate && averageHeartRate >= 170
          ? '關注心率與睡眠'
          : '可以按計畫推進'
  const loadZone =
    trainingLoad === 0 ? '完成訓練後提交回饋' : trainingLoad < 180 ? '輕負荷' : trainingLoad < 420 ? '适中負荷' : '高負荷'
  const dashboardNav: Array<
    | { type: 'link'; href: string; icon: React.ElementType; label: string }
    | { type: 'button'; icon: React.ElementType; label: string }
  > = [
    { type: 'link', href: '#training-data', icon: Gauge, label: '訓練資料' },
    { type: 'link', href: '#training-plan', icon: CalendarDays, label: '訓練計畫' },
    { type: 'link', href: '#goals', icon: Trophy, label: '我的目標' },
    { type: 'button', icon: Settings, label: '設定' },
  ]

  const groupedPlans = useMemo(() => {
    if (currentWeekPlans.length === 0) return []

    return [{
      week: currentWeek ?? 0,
      plans: currentWeekPlans,
    }]
  }, [currentWeek, currentWeekPlans])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let isActive = true

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
        const access = await getMyStudentAccess()
        if (!isActive) return

        setStudentAccessState(access.state)
        setCanAccessTraining(access.canAccessTraining)
        setCoachBound(access.coachBound ?? false)
        setBoundCoachName(access.coachName ?? '')

        if (!access.canAccessTraining) {
          setPlans([])
          setRecentFeedback([])
          setStudentRaces([])
          return
        }

        const [planData, feedbackData, raceData] = await Promise.all([
          getMyTrainingPlans(user.id),
          getMyTrainingFeedback(user.id),
          getMyStudentRaces(user.id),
        ])

        if (!isActive) return
        setPlans(planData)
        setRecentFeedback(feedbackData)
        setStudentRaces(raceData)
      } catch (error) {
        console.error('Load student dashboard data error:', error)
        if (isActive) {
          setDataError(error instanceof Error ? error.message : '讀取學員資料失敗。')
        }
      } finally {
        if (isActive) setIsLoadingData(false)
      }
    }

    loadStudentData()

    const realtimeClient = supabase

    if (!user || !realtimeClient) {
      return () => {
        isActive = false
      }
    }

    const channel = realtimeClient
      .channel(`student-training-plans-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'training_plans',
          filter: `student_id=eq.${user.id}`,
        },
        () => {
          loadStudentData()
        }
      )
      .subscribe()

    return () => {
      isActive = false
      realtimeClient.removeChannel(channel)
    }
  }, [todayInfo.weekStart, user])

  useEffect(() => {
    if (!user) return

    setProfileForm({
      name: user.name || '',
      phone: user.phone || '',
      pb: user.pb || '',
    })
  }, [user])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    if (params.get('settings') === '1') {
      setIsSettingsOpen(true)
    }
  }, [])

  useEffect(() => {
    if (!isSettingsOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSettingsOpen])

  const updateField = (field: keyof typeof feedback, value: string | number) => {
    setFeedback((current) => ({ ...current, [field]: value }))
  }

  const scrollPlanTrack = (week: number, direction: 'left' | 'right') => {
    const track = document.getElementById(`week-plan-track-${week}`)
    track?.scrollBy({
      left: direction === 'left' ? -280 : 280,
      behavior: 'smooth',
    })
  }

  const updateProfileField = (field: keyof typeof profileForm, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }))
    setSettingsMessage('')
    setSettingsError('')
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
      setRaceError('請先登入，登入後才能儲存賽事目標。')
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
      setRaceError('請填寫賽事名稱。')
      return
    }

    setIsAddingRace(true)

    try {
      const savedRace = await addMyStudentRace({
        student_id: user.id,
        ...raceInput,
        status: 'accepted',
        notes: '學員已中籤，加入目標賽事面板。',
      })
      setStudentRaces((current) =>
        [...current, savedRace].sort((a, b) =>
          (a.race_date || '9999-12-31').localeCompare(b.race_date || '9999-12-31')
        )
      )
      setRaceMessage('已加入你的目標賽事面板。')
      if (isCustomRace) {
        setCustomRace({ raceName: '', location: '', country: '', raceDate: '', distance: '' })
      }
    } catch (error) {
      setRaceError(error instanceof Error ? error.message : '儲存賽事失敗，請稍後再試。')
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
      setRaceMessage('已從面板移除該賽事。')
    } catch (error) {
      setRaceError(error instanceof Error ? error.message : '移除賽事失敗，請稍後再試。')
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitError('')
    setSubmitted(false)

    if (!isLoggedIn || !user) {
      setSubmitError('請先登入，登入後回饋才會同步到教練端。')
      return
    }

    setIsSubmitting(true)

    try {
      const structuredFeeling = [
        feedback.feeling.trim() ? `訓練感受：${feedback.feeling.trim()}` : '',
        `睡眠質量：${feedback.sleepQuality}`,
        `疲勞程度：${feedback.fatigueLevel}`,
        `是否完成原計畫：${feedback.completedOriginalPlan}`,
        feedback.painLocation.trim() ? `疼痛 / 不適位置：${feedback.painLocation.trim()}` : '疼痛 / 不適位置：無明顯不適',
        feedback.note.trim() ? `備註：${feedback.note.trim()}` : '',
        feedback.screenshotName ? `跑步截圖：${feedback.screenshotName}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      await submitTrainingFeedback({
        training_plan_id: latestPlan?.id ?? null,
        student_id: user.id,
        coach_id: latestPlan?.coach_id ?? null,
        distance_km: parseDistance(feedback.distance),
        duration_text: feedback.duration,
        pace_text: feedback.pace,
        average_heart_rate: parseHeartRate(feedback.heartRate),
        rpe: feedback.rpe,
        feeling: structuredFeeling,
      })

      setSubmitted(true)
      const feedbackData = await getMyTrainingFeedback(user.id)
      setRecentFeedback(feedbackData)
    } catch (error) {
      console.error('Submit training feedback error:', error)
      setSubmitError(error instanceof Error ? error.message : '提交失敗，請稍後再試。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveSettings = async (event: React.FormEvent) => {
    event.preventDefault()
    setSettingsMessage('')
    setSettingsError('')

    if (!isLoggedIn || !user) {
      setSettingsError('請先登入，登入後才能儲存資料。')
      return
    }

    if (!supabase) {
      setSettingsError('Supabase 尚未設定，暫時無法儲存資料。')
      return
    }

    setIsSavingSettings(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('請先重新登入後再儲存資料。')
      }

      const response = await fetch('/api/account/me', {
        method: 'PATCH',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: profileForm.name.trim() || user.name,
          phone: profileForm.phone.trim(),
          pb: profileForm.pb.trim(),
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        profile?: {
          name?: string | null
          phone?: string | null
          pb?: string | null
        }
      }

      if (!response.ok || !payload.profile) {
        throw new Error(payload.error || '儲存失敗，請稍後再試。')
      }

      updateUser({
        name: payload.profile.name || profileForm.name.trim() || user.name,
        phone: payload.profile.phone || '',
        pb: payload.profile.pb || '',
      })
      setSettingsMessage('資料已更新。')
      window.setTimeout(() => setIsSettingsOpen(false), 500)
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : '儲存失敗，請稍後再試。')
    } finally {
      setIsSavingSettings(false)
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
                  {displayName}，這裡改為教練工作視角。
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                  你的帳號已經啟用教練權限，因此不再顯示學員的訓練感受表單。接下來的重點會放在學員狀態、課表同步與回饋處理。
                </p>
              </div>

              <div className="apple-card p-5">
                <p className="text-sm text-apple-gray-500">目前身份</p>
                <p className="mt-1 text-xl font-bold text-apple-gray-900">好運跑班教練</p>
                <p className="mt-1 text-sm text-apple-gray-600">可管理綁定學員與訓練課表</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  href: '/coach',
                  icon: ShieldCheck,
                  title: '教練工作台',
                  description: '集中查看學員回饋、權限狀態與今日待處理事項。',
                },
                {
                  href: '/coach/students',
                  icon: UsersRound,
                  title: '學員狀態',
                  description: '綁定學員後，查看目標、PB、班級與後續回饋狀態。',
                },
                {
                  href: '/coach/planner',
                  icon: NotebookPen,
                  title: '課表面板',
                  description: '進入課表面板，儲存後寫入 training_plans 並同步到學員端。',
                },
              ].map((item) => (
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
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (!isLoggedIn || !user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-4xl">
            <div className="apple-card overflow-hidden p-0">
              <div className="grid gap-0 md:grid-cols-[1fr_0.85fr]">
                <div className="p-8 md:p-10">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                    學員看板
                  </p>
                  <h1 className="text-3xl font-black leading-tight text-apple-gray-900 md:text-5xl">
                    已報名學員請登入後查看課表並提交訓練回饋
                  </h1>
                  <p className="mt-5 text-base leading-8 text-apple-gray-600">
                    訓練課表、訓練資料、目標賽事和個人資料都會綁定到你的報名信箱。登入後，教練同步的課表和你提交的訓練回饋才會正確儲存。
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link href="/?auth=login" className="apple-button-primary inline-flex items-center justify-center gap-2 px-6 py-3">
                      登入學員帳號
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/courses" className="apple-button-outline inline-flex items-center justify-center gap-2 px-6 py-3">
                      查看課程
                    </Link>
                  </div>
                </div>
                <div className="bg-apple-gray-950 p-8 text-white md:p-10">
                  <h2 className="text-xl font-black">登入後開放</h2>
                  <div className="mt-6 space-y-4">
                    {[
                      ['本週課表', '查看教練同步的訓練安排和當日重點。'],
                      ['訓練回饋', '提交里程、配速、RPE、疲勞和身體感受。'],
                      ['目標與資料', '維護比賽目標、聯絡方式和訓練溝通資料。'],
                    ].map(([title, description]) => (
                      <div key={title} className="rounded-2xl bg-white/10 p-4">
                        <h3 className="font-bold">{title}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/70">{description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (!canAccessTraining) {
    const waitingText = studentAccessState === 'rejected'
      ? '你的報名資料需要補充或重新核對，請聯絡好運跑班協助處理。'
      : '你的報名資料正在等待人工核對，課表將在核准後開通，請耐心等待。'

    return (
      <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-4xl">
            <div className="apple-card p-8 md:p-10">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">
                報名審核
              </p>
              <h1 className="text-3xl font-black leading-tight text-apple-gray-900 md:text-5xl">
                課表等待開通
              </h1>
              <p className="mt-5 text-lg leading-8 text-apple-gray-600">
                {waitingText}
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {[
                  ['目前狀態', studentAccessState === 'pending_review' ? '待人工核對' : studentAccessState === 'pending_transfer' ? '待匯款 / 待後五碼' : '需補充資料'],
                  ['課表訪問', '核准後開通'],
                  ['訓練回饋', '核准後可提交'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-apple-gray-100 p-4">
                    <p className="text-xs font-semibold text-apple-gray-500">{label}</p>
                    <p className="mt-2 font-bold text-apple-gray-900">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/payment" className="apple-button-primary inline-flex items-center justify-center gap-2 px-6 py-3">
                  查看付款資料
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://www.instagram.com/nurture.running.team/"
                  target="_blank"
                  rel="noreferrer"
                  className="apple-button-outline inline-flex items-center justify-center gap-2 px-6 py-3"
                >
                  聯絡好運跑班
                </a>
              </div>
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
                學員看板
              </p>
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-5xl">
                {displayName}，今天照顾好這一課。
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-gray-600">
                課表、完成狀態與訓練感受都集中在這裡。回報越清楚，教練越能幫你把下一周調得剛剛好。
              </p>
            </div>
            <div className="apple-card p-5">
              <p className="text-sm text-apple-gray-500">{t.schedule.thisWeeksPlan}</p>
              <p className="mt-1 text-xl font-bold text-apple-gray-900">{currentProgram}</p>
              <p className="mt-1 text-sm text-apple-gray-600">
                {formatWeekRange(todayInfo.weekStart, language)}
              </p>
              <p className="mt-2 text-sm text-apple-gray-600">
                {formatTodayLabel(todayInfo.todayIso, language)}
              </p>
              <p className="mt-2 text-xs font-semibold text-apple-gray-500">
                {currentWeek ? `第 ${currentWeek} 周 · ` : ''}
                {currentGoal}
              </p>
            </div>
          </div>

          {dataError && (
            <div className="mb-6 rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              目前真實資料讀取失敗，請稍後再試。資訊：{dataError}
            </div>
          )}

          <nav className="mb-6 grid gap-3 sm:grid-cols-4" aria-label="學員看板功能">
            {dashboardNav.map((item) => (
              item.type === 'link' ? (
                <a
                  key={item.label}
                  href={item.href}
                  className="group flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-left shadow-sm transition hover:border-black/20 hover:bg-apple-gray-100"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="font-bold text-apple-gray-900">{item.label}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-apple-gray-400 transition group-hover:translate-x-0.5 group-hover:text-apple-gray-800" />
                </a>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="group flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-left shadow-sm transition hover:border-black/20 hover:bg-apple-gray-100"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="font-bold text-apple-gray-900">{item.label}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-apple-gray-400 transition group-hover:translate-x-0.5 group-hover:text-apple-gray-800" />
                </button>
              )
            ))}
          </nav>

          {!isCoach ? (
            <div className="mb-6">
              <StudentCoachBindingPanel
                currentCoachName={boundCoachName}
                onBound={(coachName) => {
                  setCoachBound(true)
                  setBoundCoachName(coachName)
                }}
              />
            </div>
          ) : null}

          <section id="training-data" className="scroll-mt-28">
            <article className="apple-card mb-6 p-6 md:p-8">
              <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="text-sm font-semibold text-apple-blue">Training data</p>
                  <h2 className="mt-1 text-2xl font-black text-apple-gray-900">訓練資料</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-apple-gray-600">
                    用訓練負荷、完成率和體感趨勢，快速判斷這一周該推進、维持還是先恢復。
                  </p>
                </div>
                <a href="#feedback" className="apple-button-secondary gap-2 px-5 py-2.5 text-sm">
                  去回報
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
                <div className="rounded-3xl bg-black p-5 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-white/60">目前訓練狀態</p>
                      <h3 className="mt-2 text-3xl font-black">{trainingStatus}</h3>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-black">
                      {loadZone}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {[
                      { label: '負荷', value: trainingLoad || '-' },
                      { label: '完成率', value: plans.length > 0 ? `${completionRate}%` : '-' },
                      { label: '平均 RPE', value: averageRpe ? averageRpe.toFixed(1) : '-' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl bg-white/10 p-3">
                        <p className="text-xs text-white/55">{item.label}</p>
                        <p className="mt-1 text-xl font-black">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl bg-white/10 p-4">
                    <p className="text-xs text-white/55">目前狀態</p>
                    <p className="mt-1 text-sm font-semibold leading-6">{recoveryHint}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: '近期里程', value: totalDistance > 0 ? `${totalDistance.toFixed(1)} km` : '先提交訓練回饋', note: `最近 ${recentFeedback.length} 次回饋` },
                    { label: '平均心率', value: averageHeartRate ? `${averageHeartRate}` : '回饋時可填寫', note: '來自已填寫記錄' },
                    { label: '課表完成', value: plans.length > 0 ? `${completedPlanCount}/${plans.length}` : '待同步', note: '按訓練回饋匹配課表' },
                    { label: '強度指數', value: intensityScore ? `${intensityScore}` : '提交 RPE 後生成', note: '由 RPE 換算' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-black/10 bg-white p-4">
                      <p className="text-xs font-semibold text-apple-gray-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-black text-apple-gray-900">{item.value}</p>
                      <p className="mt-1 text-xs text-apple-gray-500">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border border-black/10 bg-white p-5">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-apple-gray-900">近 7 次訓練負荷</p>
                      <p className="mt-1 text-xs text-apple-gray-500">里程 × RPE，用来觀察疲勞趨勢</p>
                    </div>
                    <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-bold text-apple-gray-600">
                      {recentLoadItems.length || 0} 次
                    </span>
                  </div>

                  {recentLoadItems.length > 0 ? (
                    <div className="flex h-44 items-end gap-2">
                      {recentLoadItems.map((item) => (
                        <div key={item.id} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                          <div className="flex h-32 w-full items-end rounded-full bg-apple-gray-100 px-1.5 py-1.5">
                            <div
                              className="w-full rounded-full bg-gradient-to-t from-apple-blue to-apple-orange"
                              style={{ height: `${Math.max(10, Math.round((item.load / maxRecentLoad) * 100))}%` }}
                              title={`${item.distance.toFixed(1)} km · RPE ${item.rpe ?? '-'}`}
                            />
                          </div>
                          <p className="truncate text-xs font-semibold text-apple-gray-500">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-black/15 bg-apple-gray-100 p-6 text-center">
                      <p className="font-bold text-apple-gray-900">還沒有負荷趨勢</p>
                      <p className="mt-2 text-sm text-apple-gray-600">提交訓練回饋後，這裡會自動生成趨勢。</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-black/10 bg-white p-5">
                    <p className="text-sm font-bold text-apple-gray-900">強度分布</p>
                    <div className="mt-4 space-y-3">
                      {[
                        { label: '輕鬆 / 恢復', value: aerobicShare, color: 'bg-green-500' },
                        { label: '節奏 / 穩態', value: tempoShare, color: 'bg-apple-blue' },
                        { label: '高強度', value: hardShare, color: 'bg-apple-orange' },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="mb-1 flex justify-between text-xs font-semibold text-apple-gray-600">
                            <span>{item.label}</span>
                            <span>{item.value}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-apple-gray-100">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl bg-apple-gray-100 p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center xl:flex-col xl:items-start">
                      <div>
                        <p className="text-sm font-bold text-apple-gray-900">最近一次回饋</p>
                        <p className="mt-1 text-sm leading-6 text-apple-gray-600">
                          {latestFeedback
                            ? `${new Date(latestFeedback.created_at).toLocaleString('zh-CN', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })} · ${latestFeedback.distance_km ?? '-'} km · RPE ${latestFeedback.rpe ?? '-'}`
                            : '還沒有訓練回饋，完成一次訓練後從下方提交即可。'}
                        </p>
                      </div>
                      <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-apple-gray-700">
                        {latestFeedback?.status === 'reviewed' ? '教練已看' : latestFeedback ? '等待教練查看' : '待開始'}
                      </span>
                    </div>
                    {latestFeedback?.feeling && (
                      <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-apple-gray-700">
                        {latestFeedback.feeling}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </section>

          <div className="grid min-w-0 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="min-w-0 space-y-6">
              <article id="training-plan" className="apple-card scroll-mt-28 p-6 md:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-apple-blue">
                      {t.schedule.dateRange} · {formatWeekRange(todayInfo.weekStart, language)}
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-apple-gray-900">
                      {t.schedule.thisWeeksPlan}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-apple-gray-600">
                      {formatTodayLabel(todayInfo.todayIso, language)}
                    </p>
                  </div>
                  <span className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">
                    {latestPlan ? '已同步' : '待同步'}
                  </span>
                </div>

                {latestPlan ? (
                  <div className={`rounded-3xl p-5 ${todayPlan ? 'bg-black text-white' : 'bg-apple-gray-100 text-apple-gray-900'}`}>
                    {todayPlan && (
                      <span className="mb-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-black">
                        {t.schedule.todaysWorkout}
                      </span>
                    )}
                    <p className="text-sm font-bold opacity-80">{latestPlan.workout_date}</p>
                    <p className="mt-2 text-2xl font-black">{latestPlan.target}</p>
                    <p className={`mt-2 ${todayPlan ? 'text-white/80' : 'text-apple-gray-600'}`}>
                      {latestPlan.pace || '配速由教練視狀態調整'}
                    </p>
                    <p className={`mt-4 rounded-2xl p-4 text-sm leading-6 ${todayPlan ? 'bg-white/10 text-white/85' : 'bg-white text-apple-gray-600'}`}>
                      {latestPlan.note || '完成後請回報 RPE、實際里程、心率與感受。'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-3xl bg-apple-gray-100 p-6">
                    <p className="text-sm font-semibold text-apple-blue">
                      {isLoadingData ? '同步中' : '尚未同步課表'}
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-apple-gray-900">
                      {t.schedule.unsyncedThisWeekPlan}
                    </h2>
                    <p className="mt-3 leading-7 text-apple-gray-600">
                      {coachBound
                        ? '教練已綁定，課表尚未同步。請等待教練派發本週課表，你仍然可以提交自主訓練回饋。'
                        : '如已報名但看不到資料，請用報名信箱登入，並聯絡教練確認帳號綁定。你仍然可以提交自主訓練回饋。'}
                    </p>
                    <a href="#feedback" className="mt-5 inline-flex rounded-full bg-black px-5 py-2 text-sm font-bold text-white">
                      提交自主訓練回饋
                    </a>
                  </div>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: Route, label: '訓練類型', value: todayPlan ? t.schedule.todaysWorkout : latestPlan?.target ? '本週訓練' : '自主回饋' },
                    { icon: Timer, label: t.schedule.dateRange, value: formatWeekRange(todayInfo.weekStart, language) },
                    { icon: CalendarDays, label: '教練', value: coachStatusText },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-black/10 bg-white p-4">
                      <item.icon className="mb-3 h-5 w-5 text-apple-gray-700" />
                      <p className="text-xs text-apple-gray-500">{item.label}</p>
                      <p className="mt-1 font-bold text-apple-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </article>


              <article id="goals" className="apple-card scroll-mt-28 p-6 md:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-apple-blue">Global race goals</p>
                    <h2 className="mt-1 text-2xl font-black text-apple-gray-900">我的目標賽事</h2>
                    <p className="mt-2 text-sm leading-6 text-apple-gray-600">
                      中籤後把賽事加入面板，教練之後可以围绕目標比賽調整訓練節奏。
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
                              <span>{race.distance || '距離待確認'}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRace(race.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-apple-gray-600 transition hover:bg-red-50 hover:text-red-600"
                            aria-label="移除賽事"
                            title="移除賽事"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                          已中籤
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mb-6 rounded-3xl border border-dashed border-black/15 bg-white p-6 text-center">
                    <Globe2 className="mx-auto mb-3 h-8 w-8 text-apple-gray-400" />
                    <p className="font-bold text-apple-gray-900">還沒有目標賽事</p>
                    <p className="mt-2 text-sm leading-6 text-apple-gray-600">選擇一個全球賽事，或手動輸入你已中籤的比賽。</p>
                  </div>
                )}

                <div className="rounded-3xl bg-apple-gray-100 p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-apple-gray-700">選擇賽事</span>
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
                        <option value="custom">自定义其他賽事</option>
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
                      <input value={customRace.raceName} onChange={(event) => updateCustomRace('raceName', event.target.value)} placeholder="賽事名稱" className="apple-input bg-white" />
                      <input value={customRace.distance} onChange={(event) => updateCustomRace('distance', event.target.value)} placeholder="距離" className="apple-input bg-white" />
                      <input value={customRace.location} onChange={(event) => updateCustomRace('location', event.target.value)} placeholder="城市" className="apple-input bg-white" />
                      <input value={customRace.country} onChange={(event) => updateCustomRace('country', event.target.value)} placeholder="國家 / 地區" className="apple-input bg-white" />
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

              <article className="apple-card min-w-0 overflow-hidden p-6 md:p-8">
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-apple-gray-900">{t.schedule.thisWeeksPlan}</h2>
                  <p className="mt-2 text-sm font-semibold text-apple-gray-600">
                    {t.schedule.dateRange} · {formatWeekRange(todayInfo.weekStart, language)}
                  </p>
                  <p className="mt-1 text-sm text-apple-gray-500">
                    {formatTodayLabel(todayInfo.todayIso, language)}
                  </p>
                </div>
                {groupedPlans.length > 0 ? (
                  <div className="space-y-5">
                    {groupedPlans.map((group) => (
                      <div key={group.week} className="min-w-0 rounded-3xl border border-black/10 bg-white p-5">
                        <div className="mb-4 flex items-center justify-end gap-3">
                          <div className="flex items-center gap-2">
                            <p className="hidden text-xs font-semibold text-apple-gray-500 sm:block">橫向滑動查看</p>
                            <button
                              type="button"
                              onClick={() => scrollPlanTrack(group.week, 'left')}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-apple-gray-700 transition hover:bg-apple-gray-100"
                              aria-label={`向左查看第 ${group.week} 週課表`}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => scrollPlanTrack(group.week, 'right')}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-apple-gray-700 transition hover:bg-apple-gray-100"
                              aria-label={`向右查看第 ${group.week} 週課表`}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div
                          id={`week-plan-track-${group.week}`}
                          className="flex max-w-full min-w-0 snap-x gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-2"
                        >
                          {group.plans.map((workout) => (
                            <div
                              key={workout.id}
                              className={`w-[220px] shrink-0 snap-start rounded-2xl p-4 sm:w-[240px] ${
                                isToday(workout.workout_date, todayInfo.todayIso)
                                  ? 'bg-black text-white'
                                  : 'bg-apple-gray-100 text-apple-gray-900'
                              }`}
                            >
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <p className="text-sm font-bold">{workout.workout_date}</p>
                                {isToday(workout.workout_date, todayInfo.todayIso) && (
                                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-black">
                                    {t.schedule.todaysWorkout}
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm leading-6 ${isToday(workout.workout_date, todayInfo.todayIso) ? 'text-white/85' : 'text-apple-gray-700'}`}>
                                {workout.target}
                              </p>
                              {workout.pace && (
                                <p className={`mt-3 rounded-full px-3 py-1 text-xs font-semibold ${isToday(workout.workout_date, todayInfo.todayIso) ? 'bg-white/15 text-white' : 'bg-white text-apple-gray-600'}`}>
                                  {workout.pace}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-black/15 bg-white p-6 text-center">
                    <p className="font-bold text-apple-gray-900">{t.schedule.unsyncedThisWeekPlan}</p>
                    <p className="mt-2 text-sm leading-6 text-apple-gray-600">
                      如果你已經報名，請先確認登入的是報名信箱；仍看不到資料時，請聯絡教練綁定帳號。你仍然可以提交自主訓練回饋。
                    </p>
                  </div>
                )}
              </article>
            </section>

            <section id="feedback" className="apple-card scroll-mt-28 p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                  <MessageSquareText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-apple-gray-500">完成後回報</p>
                  <h2 className="text-2xl font-black text-apple-gray-900">今日訓練感受</h2>
                </div>
              </div>

              {!isLoggedIn && (
                <div className="mb-5 rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  請先登入報名信箱。登入後提交的訓練回饋才會同步給教練。
                </div>
              )}

              <form
                className="space-y-5"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { key: 'distance', label: '實際里程', placeholder: '填寫實際里程', icon: Route },
                    { key: 'duration', label: '完成時間', placeholder: '填寫完成時間', icon: Timer },
                    { key: 'pace', label: '平均配速', placeholder: '填寫平均配速', icon: Activity },
                    { key: 'heartRate', label: '平均心率', placeholder: '填寫平均心率', icon: HeartPulse },
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
                    <span>剛剛好</span>
                    <span>非常吃力</span>
                  </div>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-apple-gray-700">睡眠質量</span>
                    <select
                      value={feedback.sleepQuality}
                      onChange={(event) => updateField('sleepQuality', event.target.value)}
                      className="apple-input"
                    >
                      <option>很好</option>
                      <option>普通</option>
                      <option>偏差</option>
                      <option>很差</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-apple-gray-700">疲勞程度</span>
                    <select
                      value={feedback.fatigueLevel}
                      onChange={(event) => updateField('fatigueLevel', event.target.value)}
                      className="apple-input"
                    >
                      <option>輕鬆</option>
                      <option>普通</option>
                      <option>偏疲勞</option>
                      <option>非常疲勞</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-apple-gray-700">是否完成原計畫</span>
                    <select
                      value={feedback.completedOriginalPlan}
                      onChange={(event) => updateField('completedOriginalPlan', event.target.value)}
                      className="apple-input"
                    >
                      <option>完成原計畫</option>
                      <option>部分完成</option>
                      <option>改為輕鬆跑</option>
                      <option>未完成 / 休息</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-apple-gray-700">疼痛 / 不適位置</span>
                    <input
                      value={feedback.painLocation}
                      onChange={(event) => updateField('painLocation', event.target.value)}
                      placeholder="例如：右小腿、左膝；沒有可留空"
                      className="apple-input"
                    />
                  </label>
                </div>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-apple-gray-700">訓練感受</span>
                  </div>
                  <textarea
                    value={feedback.feeling}
                    onChange={(event) => updateField('feeling', event.target.value)}
                    rows={5}
                    placeholder="填寫訓練感受"
                    className="apple-input resize-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-apple-gray-700">備註</span>
                  <textarea
                    value={feedback.note}
                    onChange={(event) => updateField('note', event.target.value)}
                    rows={3}
                    placeholder="例如：今天臨時加班、天氣很熱、補給不足等"
                    className="apple-input resize-none"
                  />
                </label>

                <label className="block rounded-3xl border border-dashed border-black/20 bg-white p-5">
                  <span className="mb-2 block text-sm font-semibold text-apple-gray-700">上傳跑步截圖</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => updateField('screenshotName', event.target.files?.[0]?.name || '')}
                    className="block w-full text-sm text-apple-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                  <span className="mt-2 block text-xs leading-5 text-apple-gray-500">
                    第一版先記錄截圖檔案名；後續可接圖片上傳與自動識別里程、配速、心率。
                  </span>
                </label>

                {submitted && (
                  <div className="flex items-start gap-3 rounded-3xl bg-green-50 p-4 text-green-800">
                    <CheckCircle2 className="mt-0.5 h-5 w-5" />
                    <p className="text-sm leading-6">
                      已提交。教練端的「今日待處理」會看到這筆回饋，並依照 RPE 與感受調整下一次課表。
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
                  {isSubmitting ? '提交中...' : '提交給教練'}
                </button>
              </form>
            </section>
          </div>

        </div>
      </section>

      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-settings-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsSettingsOpen(false)
            }
          }}
        >
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-apple-blue">Account settings</p>
                <h2 id="student-settings-title" className="mt-1 text-2xl font-black text-apple-gray-900">
                  設定
                </h2>
                <p className="mt-2 text-sm leading-6 text-apple-gray-600">
                  這裡只放影响訓練溝通的資料，儲存後會同步給教練端查看。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-xl leading-none text-apple-gray-500 transition hover:bg-apple-gray-100 hover:text-apple-gray-900"
                aria-label="關闭設定"
              >
                ×
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-apple-gray-100 px-4 py-3 text-sm text-apple-gray-600">
              登入信箱：{user?.email || '-'}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-apple-gray-700">姓名</span>
                  <input
                    value={profileForm.name}
                    onChange={(event) => updateProfileField('name', event.target.value)}
                    className="apple-input"
                    placeholder="你的称呼"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-apple-gray-700">手機 / 聯絡方式</span>
                  <input
                    value={profileForm.phone}
                    onChange={(event) => updateProfileField('phone', event.target.value)}
                    className="apple-input"
                    placeholder="方便教練聯絡"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-apple-gray-700">目前 PB</span>
                  <input
                    value={profileForm.pb}
                    onChange={(event) => updateProfileField('pb', event.target.value)}
                    className="apple-input"
                    placeholder="目前 PB"
                  />
                </label>
              </div>

              {settingsMessage && (
                <p className="rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-800">
                  {settingsMessage}
                </p>
              )}
              {settingsError && (
                <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {settingsError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="apple-button-outline px-6 py-2.5 text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="apple-button-primary gap-2 px-6 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Settings className="h-4 w-4" />
                  {isSavingSettings ? '儲存中...' : '儲存設定'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
