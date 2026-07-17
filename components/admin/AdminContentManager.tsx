'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  BadgeInfo,
  CalendarRange,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  GalleryHorizontalEnd,
  Home,
  ImageIcon,
  ImagePlus,
  LayoutGrid,
  Loader2,
  Megaphone,
  Plus,
  Save,
  ShoppingBag,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { courseSeasonStatusLabels, type CourseSeason, type CourseSeasonStatus } from '@/lib/course-seasons'
import { orderedWeekdays } from '@/lib/course-sort'
import { defaultCourseBillingConfig, type CourseBillingConfig } from '@/lib/course-pricing'
import type {
  AboutContent,
  BrandContent,
  CourseOverride,
  HomeActivity,
  HomeContent,
  PageMedia,
  SeasonalUpdate,
  SiteContent,
  TestimonialsContent,
} from '@/lib/site-content'

type CourseSummary = {
  slug: string
  name: string
  weekday: string
  location: string
  period: string
  classTime: string
  meetingPoint: string
  feeNote: string
  targetAudience: string
  focus: string
  signupUrl: string
  coachKeys: string[]
}

type AdminContentManagerProps = {
  content: SiteContent
  courses: CourseSummary[]
  seasons: CourseSeason[]
  scope?: 'content' | 'seasons'
  runAction: (id: string, action: Record<string, unknown>) => Promise<boolean>
}

type ContentMode = 'overview' | 'hero' | 'home' | 'activities' | 'seasonal' | 'seasons' | 'brand' | 'media' | 'about' | 'testimonials' | 'courses'

async function uploadSiteImage(file: File, folder: 'hero' | 'brand' | 'pages') {
  if (!supabase) throw new Error('圖片服務尚未設定。')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('請重新登入管理員帳號。')
  const formData = new FormData()
  formData.set('file', file)
  formData.set('folder', folder)
  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: formData,
  })
  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!response.ok || !payload.url) throw new Error(payload.error || '圖片上傳失敗。')
  return payload.url
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={wide ? 'md:col-span-2' : ''}><span className="mb-2 block text-xs font-bold text-apple-gray-500">{label}</span>{children}</label>
}

function ImageField({ label, value, folder, onChange, onError }: { label: string; value: string; folder: 'brand' | 'pages'; onChange: (url: string) => void; onError: (message: string) => void }) {
  const [uploading, setUploading] = useState(false)
  async function upload(file?: File) {
    if (!file) return
    setUploading(true)
    onError('')
    try {
      onChange(await uploadSiteImage(file, folder))
    } catch (error) {
      onError(error instanceof Error ? error.message : '圖片上傳失敗。')
    } finally {
      setUploading(false)
    }
  }
  return (
    <div className="border-b border-black/10 py-5 first:pt-0 last:border-0 last:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg bg-apple-gray-100 sm:w-44">
          {value ? <Image src={value} alt={`${label}預覽`} fill sizes="176px" className="object-cover" /> : <ImageIcon className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-apple-gray-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-apple-gray-900">{label}</p>
          <p className="mt-1 truncate text-xs text-apple-gray-500">{value || '尚未設定圖片'}</p>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-bold hover:bg-apple-gray-100">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            更換圖片
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(event) => upload(event.target.files?.[0])} />
          </label>
        </div>
      </div>
    </div>
  )
}

function courseDraft(course: CourseSummary, override?: CourseOverride): CourseOverride {
  return {
    active: override?.active !== false,
    templateSlug: override?.templateSlug || course.slug,
    name: override?.name || course.name,
    weekday: override?.weekday || course.weekday,
    location: override?.location || course.location,
    period: override?.period || course.period,
    classTime: override?.classTime || course.classTime,
    meetingPoint: override?.meetingPoint || course.meetingPoint,
    feeNote: override?.feeNote || course.feeNote,
    targetAudience: override?.targetAudience || course.targetAudience,
    focus: override?.focus || course.focus,
    signupUrl: override?.signupUrl || course.signupUrl,
    coachKeys: override?.coachKeys?.length ? override.coachKeys : course.coachKeys,
  }
}

export default function AdminContentManager({ content, courses, seasons, scope = 'content', runAction }: AdminContentManagerProps) {
  const [mode, setMode] = useState<ContentMode>(scope === 'seasons' ? 'seasons' : 'overview')
  const [slides, setSlides] = useState(content.heroSlides)
  const [activities, setActivities] = useState<HomeActivity[]>(content.activities)
  const [seasonal, setSeasonal] = useState<SeasonalUpdate>(content.seasonalUpdate)
  const [brand, setBrand] = useState<BrandContent>(content.brand)
  const [home, setHome] = useState<HomeContent>(content.home)
  const [about, setAbout] = useState<AboutContent>(content.about)
  const [testimonials, setTestimonials] = useState<TestimonialsContent>(content.testimonials)
  const [pageMedia, setPageMedia] = useState<PageMedia>(content.pageMedia)
  const currentSeason = seasons.find((season) => season.isCurrent) ?? seasons[0] ?? null
  const [selectedSeasonId, setSelectedSeasonId] = useState(currentSeason?.id ?? '')
  const [seasonOverrides, setSeasonOverrides] = useState<Record<string, Record<string, CourseOverride>>>(() =>
    Object.fromEntries(seasons.map((season) => [season.id, season.courseOverrides]))
  )
  const [seasonCapacities, setSeasonCapacities] = useState<Record<string, Record<string, number>>>(() =>
    Object.fromEntries(seasons.map((season) => [season.id, season.courseCapacities]))
  )
  const [seasonBillingConfigs, setSeasonBillingConfigs] = useState<Record<string, Record<string, CourseBillingConfig>>>(() =>
    Object.fromEntries(seasons.map((season) => [season.id, season.courseBillingConfigs]))
  )
  const initialSlug = currentSeason ? Object.keys(currentSeason.courseOverrides)[0] ?? '' : courses[0]?.slug ?? ''
  const initialTemplate = courses.find((course) => course.slug === initialSlug)
    ?? courses.find((course) => course.slug === currentSeason?.courseOverrides[initialSlug]?.templateSlug)
    ?? courses[0]
  const [selectedSlug, setSelectedSlug] = useState(initialSlug)
  const [draft, setDraft] = useState<CourseOverride>(() => initialTemplate ? courseDraft(initialTemplate, currentSeason?.courseOverrides[initialSlug] ?? content.courseOverrides[initialSlug]) : {})
  const [draftCapacity, setDraftCapacity] = useState(40)
  const [draftBilling, setDraftBilling] = useState<CourseBillingConfig>(() => currentSeason?.courseBillingConfigs[initialSlug] ?? defaultCourseBillingConfig())
  const [isUploading, setIsUploading] = useState(false)
  const [localError, setLocalError] = useState('')
  const [courseMessage, setCourseMessage] = useState('')
  const [showNewCourse, setShowNewCourse] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseTemplateSlug, setNewCourseTemplateSlug] = useState(courses[0]?.slug ?? '')

  useEffect(() => {
    setSlides(content.heroSlides)
    setActivities(content.activities)
    setSeasonal(content.seasonalUpdate)
    setBrand(content.brand)
    setHome(content.home)
    setAbout(content.about)
    setTestimonials(content.testimonials)
    setPageMedia(content.pageMedia)
  }, [content])

  useEffect(() => {
    setSeasonOverrides(Object.fromEntries(seasons.map((season) => [season.id, season.courseOverrides])))
    setSeasonCapacities(Object.fromEntries(seasons.map((season) => [season.id, season.courseCapacities])))
    setSeasonBillingConfigs(Object.fromEntries(seasons.map((season) => [season.id, season.courseBillingConfigs])))
    if (!seasons.some((season) => season.id === selectedSeasonId)) {
      setSelectedSeasonId(seasons.find((season) => season.isCurrent)?.id ?? seasons[0]?.id ?? '')
    }
  }, [seasons, selectedSeasonId])

  const selectedSeason = useMemo(() => seasons.find((season) => season.id === selectedSeasonId) ?? null, [seasons, selectedSeasonId])
  const courseOverrides = selectedSeason ? seasonOverrides[selectedSeason.id] ?? selectedSeason.courseOverrides : content.courseOverrides
  const seasonCourses = useMemo(() => Object.entries(courseOverrides).flatMap(([slug, override]) => {
    const base = courses.find((course) => course.slug === slug)
      ?? courses.find((course) => course.slug === override.templateSlug)
      ?? courses[0]
    if (!base) return []
    return [{
      ...base,
      slug,
      name: override.name || base.name,
      weekday: override.weekday || base.weekday,
      location: override.location || base.location,
      period: override.period || base.period,
      classTime: override.classTime || base.classTime,
      meetingPoint: override.meetingPoint || base.meetingPoint,
      feeNote: override.feeNote || base.feeNote,
      targetAudience: override.targetAudience || base.targetAudience,
      focus: override.focus || base.focus,
      signupUrl: override.signupUrl || `/courses/${slug}/register`,
      coachKeys: override.coachKeys?.length ? override.coachKeys : base.coachKeys,
    }]
  }), [courseOverrides, courses])
  const selectedCourse = useMemo(() => seasonCourses.find((course) => course.slug === selectedSlug), [seasonCourses, selectedSlug])
  useEffect(() => {
    if (selectedCourse || seasonCourses.length === 0) return
    setSelectedSlug(seasonCourses[0].slug)
  }, [seasonCourses, selectedCourse])
  useEffect(() => {
    if (!selectedCourse) return
    setDraft(courseDraft(selectedCourse, courseOverrides[selectedCourse.slug]))
    setDraftCapacity(selectedSeason ? seasonCapacities[selectedSeason.id]?.[selectedCourse.slug] ?? 40 : 40)
    setDraftBilling(selectedSeason
      ? seasonBillingConfigs[selectedSeason.id]?.[selectedCourse.slug] ?? defaultCourseBillingConfig(selectedCourse, selectedSeason.code)
      : defaultCourseBillingConfig(selectedCourse))
  }, [courseOverrides, seasonBillingConfigs, seasonCapacities, selectedCourse, selectedSeason])

  const allModes = [
    { id: 'overview' as const, label: '內容總覽', description: '查看可管理區域', destination: '全站', icon: LayoutGrid },
    { id: 'hero' as const, label: '首頁輪播', description: '圖片與排序', destination: '首頁首屏輪播', icon: GalleryHorizontalEnd },
    { id: 'home' as const, label: '首頁文案', description: '區塊標題與重點', destination: '首頁活動、特色與課程預覽', icon: Home },
    { id: 'activities' as const, label: '活動入口', description: '報名與活動連結', destination: '首頁近期報名入口', icon: Megaphone },
    { id: 'seasonal' as const, label: '首頁招生公告', description: '對外公告', destination: '首頁招生公告區', icon: Megaphone },
    { id: 'seasons' as const, label: '季度設定', description: '切換、複製與歷史資料', destination: '課程、日程表、報名與歷史報表', icon: CalendarRange },
    { id: 'brand' as const, label: '品牌與聯絡', description: 'Logo、社群與頁尾', destination: '頂部導覽、頁尾與聯絡入口', icon: BadgeInfo },
    { id: 'media' as const, label: '各頁主視覺', description: '商店、關於與見證', destination: '商店、關於我們、學員見證與週年頁', icon: ImageIcon },
    { id: 'about' as const, label: '關於我們', description: '品牌故事與對象', destination: '關於我們完整頁面', icon: Sparkles },
    { id: 'testimonials' as const, label: '學員見證', description: '見證頁文案', destination: '學員見證完整頁面', icon: FileText },
    { id: 'courses' as const, label: '課程資料', description: '班級日期與內容', destination: '首頁、日程表、課程詳情與網站報名表', icon: ShoppingBag },
  ]
  const modes = allModes.filter((item) => scope === 'seasons'
    ? item.id === 'seasons' || item.id === 'courses'
    : item.id !== 'seasons' && item.id !== 'courses')

  async function addHeroImage(file?: File) {
    if (!file) return
    setIsUploading(true)
    setLocalError('')
    try {
      const url = await uploadSiteImage(file, 'hero')
      setSlides((current) => [...current, url].slice(0, 8))
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : '圖片上傳失敗。')
    } finally {
      setIsUploading(false)
    }
  }

  function moveSlide(index: number, direction: -1 | 1) {
    setSlides((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  async function saveCourse() {
    if (!selectedCourse || !selectedSeason) return
    setLocalError('')
    setCourseMessage('')
    if (!/^週[一二三四五六日]$/.test(String(draft.weekday ?? '').replace('周', '週'))) {
      setLocalError('請選擇正確的上課星期。')
      return
    }
    if (!/(?:[01]\d|2[0-3]):[0-5]\d/.test(String(draft.classTime ?? ''))) {
      setLocalError('上課時間請包含 24 小時制時間，例如 19:27（1.5-2 小時）。')
      return
    }
    if (!Number.isInteger(draftCapacity) || draftCapacity < 1 || draftCapacity > 500) {
      setLocalError('班級名額請設定為 1 至 500 之間。')
      return
    }
    if (!draft.coachKeys?.length) {
      setLocalError('請至少選擇一位本課程教練。')
      return
    }
    if (selectedSeason.isCurrent && (!draftBilling.scheduleReady || draftBilling.sessionDates.length === 0)) {
      setLocalError('前台招生季度必須先完成實際收費課次設定。')
      return
    }
    const nextOverrides = { ...courseOverrides, [selectedCourse.slug]: draft }
    const saved = await runAction(`course-${selectedSeason.id}-${selectedCourse.slug}`, {
      action: 'save_season_course',
      seasonId: selectedSeason.id,
      courseSlug: selectedCourse.slug,
      value: draft,
      capacity: draftCapacity,
      billingConfig: draftBilling,
    })
    if (!saved) return
    setSeasonOverrides((current) => ({ ...current, [selectedSeason.id]: nextOverrides }))
    setSeasonCapacities((current) => ({
      ...current,
      [selectedSeason.id]: { ...(current[selectedSeason.id] ?? {}), [selectedCourse.slug]: draftCapacity },
    }))
    setSeasonBillingConfigs((current) => ({
      ...current,
      [selectedSeason.id]: { ...(current[selectedSeason.id] ?? {}), [selectedCourse.slug]: draftBilling },
    }))
    setCourseMessage(selectedSeason.isCurrent
      ? '已發布至訓練課程、訓練日程表、課程詳情與報名頁。'
      : `已儲存至 ${selectedSeason.name}，目前仍是草稿，不會影響前台。`)
  }

  async function createNextSeason() {
    if (!selectedSeason) return
    await runAction(`create-season-${selectedSeason.id}`, {
      action: 'create_next_course_season',
      sourceSeasonId: selectedSeason.id,
    })
  }

  async function createSeasonCourse() {
    if (!selectedSeason || !newCourseName.trim() || !newCourseTemplateSlug) {
      setLocalError('請填寫新課程名稱並選擇介紹版型。')
      return
    }
    const created = await runAction(`create-course-${selectedSeason.id}`, {
      action: 'create_season_course',
      seasonId: selectedSeason.id,
      templateSlug: newCourseTemplateSlug,
      name: newCourseName.trim(),
    })
    if (!created) return
    setNewCourseName('')
    setShowNewCourse(false)
  }

  async function duplicateSeasonCourse() {
    if (!selectedSeason || !selectedCourse) return
    await runAction(`duplicate-course-${selectedSeason.id}-${selectedCourse.slug}`, {
      action: 'duplicate_season_course',
      seasonId: selectedSeason.id,
      courseSlug: selectedCourse.slug,
    })
  }

  async function deleteSeasonCourse() {
    if (!selectedSeason || !selectedCourse) return
    if (!window.confirm(`確定移除「${selectedCourse.name}」？只有完全沒有報名、點名、停課或補課資料的課程可以刪除。`)) return
    const deleted = await runAction(`delete-course-${selectedSeason.id}-${selectedCourse.slug}`, {
      action: 'delete_season_course',
      seasonId: selectedSeason.id,
      courseSlug: selectedCourse.slug,
    })
    if (deleted) setSelectedSlug('')
  }

  function rebuildBillingDates() {
    if (!selectedSeason) return
    const generated = defaultCourseBillingConfig({ period: String(draft.period ?? ''), weekday: String(draft.weekday ?? '') }, selectedSeason.code)
    setDraftBilling((current) => ({
      ...current,
      scheduleReady: generated.sessionDates.length > 0,
      sessionDates: generated.sessionDates,
      returningFullPrice: generated.sessionDates.length * current.returningLateRate,
      newFullPrice: generated.sessionDates.length * current.standardLateRate,
    }))
  }

  async function activateSeason(season: CourseSeason) {
    if (!window.confirm(`確定將 ${season.name} 設為前台招生季度？課程、日程表與報名頁會一起切換。`)) return
    await runAction(`activate-season-${season.id}`, { action: 'activate_course_season', seasonId: season.id })
  }

  async function updateSeasonStatus(season: CourseSeason, status: CourseSeasonStatus) {
    await runAction(`season-status-${season.id}`, { action: 'update_course_season_status', seasonId: season.id, status })
  }

  const saveButton = (id: string, section: string, value: unknown, label = '儲存並發布') => (
    <button type="button" onClick={() => runAction(id, { action: 'save_site_content', section, value })} className="apple-button-primary gap-2 px-6 py-3">
      <Save className="h-4 w-4" />{label}
    </button>
  )

  const panelHeader = (title: string, description: string, previewPath?: string) => (
    <div className="flex flex-col justify-between gap-4 border-b border-black/10 px-5 py-5 sm:px-6 md:flex-row md:items-center">
      <div><h2 className="text-xl font-black text-apple-gray-900">{title}</h2><p className="mt-1 text-sm leading-6 text-apple-gray-600">{description}</p></div>
      {previewPath ? <a href={previewPath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-apple-blue">查看前台<ExternalLink className="h-4 w-4" /></a> : null}
    </div>
  )

  return (
    <section className="grid min-w-0 max-w-full gap-5 overflow-hidden lg:min-h-[720px] lg:grid-cols-[232px_minmax(0,1fr)] lg:items-start">
      <aside className="min-w-0 max-w-full lg:sticky lg:top-28 lg:w-[232px]">
        <div className="flex w-full max-w-full gap-2 overflow-x-auto border-b border-black/10 pb-3 lg:flex-col lg:overflow-visible lg:border-b-0 lg:pb-0">
          {modes.map((item) => {
            const Icon = item.icon
            return <button key={item.id} type="button" onClick={() => setMode(item.id)} className={`flex min-w-max items-center gap-3 rounded-lg px-3 py-3 text-left ring-1 ring-inset transition-colors lg:min-h-[68px] lg:w-full lg:min-w-0 ${mode === item.id ? 'bg-black text-white ring-black' : 'bg-white text-apple-gray-700 ring-black/10 hover:bg-apple-gray-100'}`}><Icon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{item.label}</span><span className={`hidden text-xs lg:block lg:h-8 lg:overflow-hidden ${mode === item.id ? 'text-white/60' : 'text-apple-gray-500'}`}>{item.description}</span></span></button>
          })}
        </div>
      </aside>

      <div className="min-w-0 lg:min-h-[720px]">
        {localError ? <p className="mb-5 rounded-lg bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">{localError}</p> : null}

        {mode === 'overview' ? (
          <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
            {panelHeader('網站內容中心', '所有日常可替換的圖片與文案集中在這裡。商品本身請到「商城商品」管理。')}
            <div className="grid md:grid-cols-2">
              {modes.filter((item) => item.id !== 'overview').map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setMode(item.id)} className="flex items-start gap-4 border-b border-black/10 p-5 text-left transition hover:bg-apple-gray-50 md:odd:border-r"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-apple-gray-100"><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="block font-black text-apple-gray-900">{item.label}</span><span className="mt-1 block text-sm text-apple-gray-500">{item.description}</span><span className="mt-2 block text-xs font-bold text-apple-blue">發布位置：{item.destination}</span></span></button> })}
            </div>
          </div>
        ) : null}

        {mode === 'hero' ? (
          <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
            {panelHeader('首頁輪播圖片', '最多 8 張，可調整順序或刪除。建議使用橫式高解析度照片。', '/')}
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              {slides.map((slide, index) => <article key={`${slide}-${index}`} className="overflow-hidden rounded-lg border border-black/10"><div className="relative aspect-video bg-apple-gray-100"><Image src={slide} alt={`首頁輪播 ${index + 1}`} fill sizes="360px" className="object-cover" /></div><div className="flex items-center justify-between p-3"><span className="text-xs font-bold text-apple-gray-500">第 {index + 1} 張</span><div className="flex gap-1"><button title="向前移動" type="button" disabled={index === 0} onClick={() => moveSlide(index, -1)} className="p-2 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button title="向後移動" type="button" disabled={index === slides.length - 1} onClick={() => moveSlide(index, 1)} className="p-2 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button><button title="刪除圖片" type="button" disabled={slides.length <= 1} onClick={() => setSlides((current) => current.filter((_, i) => i !== index))} className="p-2 text-red-500 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div></div></article>)}
              <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-black/20 bg-apple-gray-50 text-sm font-bold text-apple-gray-600"><ImagePlus className="mb-3 h-6 w-6" />{isUploading ? '圖片上傳中...' : '新增輪播圖片'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isUploading || slides.length >= 8} onChange={(event) => addHeroImage(event.target.files?.[0])} /></label>
            </div>
            <div className="border-t border-black/10 p-5 text-right">{saveButton('save-hero', 'hero_slides', slides, '儲存輪播')}</div>
          </div>
        ) : null}

        {mode === 'home' ? (
          <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
            {panelHeader('首頁文案', '管理活動區、特色區與首頁課程預覽的標題及說明。', '/')}
            <div className="grid gap-4 p-5 md:grid-cols-2">
              {([['activitiesLabel','活動區小標'],['activitiesTitle','活動區標題'],['activitiesDescription','活動區說明'],['featuresTitle','特色區標題'],['featuresSubtitle','特色區說明'],['coursesLabel','課程區小標'],['coursesTitle','課程區標題'],['coursesDescription','課程區說明']] as const).map(([key,label]) => <Field key={key} label={label} wide={key.endsWith('Description') || key.endsWith('Subtitle')}><input value={home[key]} onChange={(e)=>setHome((c)=>({...c,[key]:e.target.value}))} className="apple-input" /></Field>)}
              <div className="md:col-span-2"><h3 className="mb-3 font-black">六項特色</h3><div className="divide-y divide-black/10 border-y border-black/10">{home.features.map((item,index)=><div key={index} className="grid gap-3 py-4 md:grid-cols-2"><input value={item.title} onChange={(e)=>setHome((c)=>({...c,features:c.features.map((x,i)=>i===index?{...x,title:e.target.value}:x)}))} className="apple-input" /><input value={item.description} onChange={(e)=>setHome((c)=>({...c,features:c.features.map((x,i)=>i===index?{...x,description:e.target.value}:x)}))} className="apple-input" /></div>)}</div></div>
              <div className="md:col-span-2"><h3 className="mb-3 font-black">首頁數字</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{home.stats.map((item,index)=><div key={index} className="grid gap-2"><input value={item.value} onChange={(e)=>setHome((c)=>({...c,stats:c.stats.map((x,i)=>i===index?{...x,value:e.target.value}:x)}))} className="apple-input" /><input value={item.label} onChange={(e)=>setHome((c)=>({...c,stats:c.stats.map((x,i)=>i===index?{...x,label:e.target.value}:x)}))} className="apple-input" /></div>)}</div></div>
            </div><div className="border-t border-black/10 p-5 text-right">{saveButton('save-home', 'home_content', home)}</div>
          </div>
        ) : null}

        {mode === 'activities' ? (
          <div className="overflow-hidden rounded-lg border border-black/10 bg-white">{panelHeader('首頁活動入口', '新增活動、報名頁或外部連結，首頁會依順序顯示。', '/')}
            <div className="divide-y divide-black/10">{activities.map((activity,index)=><div key={index} className="grid gap-3 p-5 md:grid-cols-2"><Field label="活動名稱"><input value={activity.title} onChange={(e)=>setActivities((c)=>c.map((x,i)=>i===index?{...x,title:e.target.value}:x))} className="apple-input" /></Field><Field label="按鈕文字"><input value={activity.action} onChange={(e)=>setActivities((c)=>c.map((x,i)=>i===index?{...x,action:e.target.value}:x))} className="apple-input" /></Field><Field label="活動說明" wide><textarea rows={3} value={activity.description} onChange={(e)=>setActivities((c)=>c.map((x,i)=>i===index?{...x,description:e.target.value}:x))} className="apple-input resize-y" /></Field><Field label="連結"><input value={activity.href} onChange={(e)=>setActivities((c)=>c.map((x,i)=>i===index?{...x,href:e.target.value}:x))} className="apple-input" /></Field><button title="刪除活動" type="button" onClick={()=>setActivities((c)=>c.filter((_,i)=>i!==index))} className="self-end justify-self-start rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"><Trash2 className="mr-2 inline h-4 w-4" />刪除</button></div>)}</div>
            <div className="flex flex-col justify-between gap-3 border-t border-black/10 p-5 sm:flex-row"><button type="button" disabled={activities.length>=8} onClick={()=>setActivities((c)=>[...c,{title:'',description:'',action:'立即查看',href:'/'}])} className="apple-button-outline gap-2 px-5 py-3"><Plus className="h-4 w-4" />新增活動</button>{saveButton('save-activities','home_activities',activities,'發布活動入口')}</div>
          </div>
        ) : null}

        {mode === 'seasonal' ? <div className="overflow-hidden rounded-lg border border-black/10 bg-white">{panelHeader('季度資訊','發布招生週期或重要公告；開啟後會出現在首頁。','/')}<div className="grid gap-4 p-5 md:grid-cols-2"><Field label="季度"><input value={seasonal.period} onChange={(e)=>setSeasonal((c)=>({...c,period:e.target.value}))} className="apple-input" /></Field><Field label="標題"><input value={seasonal.title} onChange={(e)=>setSeasonal((c)=>({...c,title:e.target.value}))} className="apple-input" /></Field><Field label="摘要" wide><textarea rows={3} value={seasonal.summary} onChange={(e)=>setSeasonal((c)=>({...c,summary:e.target.value}))} className="apple-input resize-y" /></Field><Field label="完整內容" wide><textarea rows={6} value={seasonal.body} onChange={(e)=>setSeasonal((c)=>({...c,body:e.target.value}))} className="apple-input resize-y" /></Field><Field label="延伸連結"><input value={seasonal.href} onChange={(e)=>setSeasonal((c)=>({...c,href:e.target.value}))} className="apple-input" /></Field><Field label="連結文字"><input value={seasonal.linkLabel} onChange={(e)=>setSeasonal((c)=>({...c,linkLabel:e.target.value}))} className="apple-input" /></Field><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={seasonal.active} onChange={(e)=>setSeasonal((c)=>({...c,active:e.target.checked}))} className="h-4 w-4" />在首頁顯示</label><div className="text-right">{saveButton('save-seasonal','seasonal_update',seasonal)}</div></div></div> : null}

        {mode === 'brand' ? <div className="overflow-hidden rounded-lg border border-black/10 bg-white">{panelHeader('品牌與聯絡','Logo 與聯絡資料會同步到導覽列及頁尾。','/')}<div className="p-5"><ImageField label="品牌 Logo" value={brand.logoUrl} folder="brand" onChange={(logoUrl)=>setBrand((c)=>({...c,logoUrl}))} onError={setLocalError}/><div className="mt-5 grid gap-4 md:grid-cols-2">{([['brandName','品牌名稱'],['tagline','品牌標語'],['instagramUrl','Instagram 網址'],['instagramHandle','Instagram 帳號'],['contactText','聯絡說明'],['address','服務地區']] as const).map(([key,label])=><Field key={key} label={label}><input value={brand[key]} onChange={(e)=>setBrand((c)=>({...c,[key]:e.target.value}))} className="apple-input" /></Field>)}<Field label="頁尾品牌介紹" wide><textarea rows={4} value={brand.footerDescription} onChange={(e)=>setBrand((c)=>({...c,footerDescription:e.target.value}))} className="apple-input resize-y" /></Field></div></div><div className="border-t border-black/10 p-5 text-right">{saveButton('save-brand','brand_content',brand)}</div></div> : null}

        {mode === 'media' ? <div className="overflow-hidden rounded-lg border border-black/10 bg-white">{panelHeader('各頁主視覺','更換關於、學員見證、商店與週年活動頁的主要圖片。')}<div className="p-5"><ImageField label="關於我們主圖" value={pageMedia.aboutHero} folder="pages" onChange={(aboutHero)=>setPageMedia((c)=>({...c,aboutHero}))} onError={setLocalError}/><ImageField label="學員見證主圖" value={pageMedia.testimonialsHero} folder="pages" onChange={(testimonialsHero)=>setPageMedia((c)=>({...c,testimonialsHero}))} onError={setLocalError}/><ImageField label="商店主視覺" value={pageMedia.shopHero} folder="pages" onChange={(shopHero)=>setPageMedia((c)=>({...c,shopHero}))} onError={setLocalError}/><ImageField label="週年活動主圖" value={pageMedia.anniversaryHero} folder="pages" onChange={(anniversaryHero)=>setPageMedia((c)=>({...c,anniversaryHero}))} onError={setLocalError}/><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="商店標題"><input value={pageMedia.shopTitle} onChange={(e)=>setPageMedia((c)=>({...c,shopTitle:e.target.value}))} className="apple-input" /></Field><Field label="商店說明"><input value={pageMedia.shopSubtitle} onChange={(e)=>setPageMedia((c)=>({...c,shopSubtitle:e.target.value}))} className="apple-input" /></Field></div></div><div className="border-t border-black/10 p-5 text-right">{saveButton('save-media','page_media',pageMedia)}</div></div> : null}

        {mode === 'about' ? <div className="overflow-hidden rounded-lg border border-black/10 bg-white">{panelHeader('關於我們','管理品牌故事、理念、適合對象與頁尾行動文字。','/about')}<div className="grid gap-4 p-5 md:grid-cols-2">{([['eyebrow','頁面小標'],['title','主標題'],['titleHighlight','主標題重點'],['description','品牌介紹'],['beliefsLabel','理念小標'],['beliefsTitle','理念標題'],['audienceLabel','對象小標'],['audienceTitle','對象標題'],['audienceDescription','對象說明'],['ctaTitle','頁尾標題'],['ctaDescription','頁尾說明']] as const).map(([key,label])=><Field key={key} label={label} wide={['description','beliefsTitle','audienceTitle','audienceDescription','ctaTitle','ctaDescription'].includes(key)}>{['description','audienceDescription','ctaDescription'].includes(key)?<textarea rows={4} value={about[key]} onChange={(e)=>setAbout((c)=>({...c,[key]:e.target.value}))} className="apple-input resize-y" />:<input value={about[key]} onChange={(e)=>setAbout((c)=>({...c,[key]:e.target.value}))} className="apple-input" />}</Field>)}<Field label="對象標籤（以逗號分隔）" wide><input value={about.audienceTags.join(', ')} onChange={(e)=>setAbout((c)=>({...c,audienceTags:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)}))} className="apple-input" /></Field><div className="md:col-span-2"><h3 className="mb-3 font-black">三項品牌理念</h3>{about.beliefs.map((item,index)=><div key={index} className="grid gap-3 border-t border-black/10 py-4 md:grid-cols-2"><input value={item.title} onChange={(e)=>setAbout((c)=>({...c,beliefs:c.beliefs.map((x,i)=>i===index?{...x,title:e.target.value}:x)}))} className="apple-input" /><input value={item.description} onChange={(e)=>setAbout((c)=>({...c,beliefs:c.beliefs.map((x,i)=>i===index?{...x,description:e.target.value}:x)}))} className="apple-input" /></div>)}</div><div className="md:col-span-2"><h3 className="mb-3 font-black">三項服務重點</h3>{about.facts.map((item,index)=><div key={index} className="grid gap-3 border-t border-black/10 py-4 md:grid-cols-2"><input value={item.title} onChange={(e)=>setAbout((c)=>({...c,facts:c.facts.map((x,i)=>i===index?{...x,title:e.target.value}:x)}))} className="apple-input" /><input value={item.description} onChange={(e)=>setAbout((c)=>({...c,facts:c.facts.map((x,i)=>i===index?{...x,description:e.target.value}:x)}))} className="apple-input" /></div>)}</div></div><div className="border-t border-black/10 p-5 text-right">{saveButton('save-about','about_content',about)}</div></div> : null}

        {mode === 'testimonials' ? <div className="overflow-hidden rounded-lg border border-black/10 bg-white">{panelHeader('學員見證','管理見證頁首屏、成長路徑與 Instagram 引導文案。','/testimonials')}<div className="grid gap-4 p-5 md:grid-cols-2">{([['eyebrow','首屏小標'],['title','首屏標題'],['description','首屏說明'],['pathLabel','成長路徑小標'],['pathTitle','成長路徑標題'],['pathDescription','成長路徑說明'],['ctaLabel','結尾小標'],['ctaTitle','結尾標題'],['ctaDescription','結尾說明']] as const).map(([key,label])=><Field key={key} label={label} wide={['description','pathTitle','pathDescription','ctaTitle','ctaDescription'].includes(key)}>{['description','pathDescription','ctaDescription'].includes(key)?<textarea rows={4} value={testimonials[key]} onChange={(e)=>setTestimonials((c)=>({...c,[key]:e.target.value}))} className="apple-input resize-y" />:<input value={testimonials[key]} onChange={(e)=>setTestimonials((c)=>({...c,[key]:e.target.value}))} className="apple-input" />}</Field>)}<div className="md:col-span-2"><h3 className="mb-3 font-black">三段成長路徑</h3>{testimonials.themes.map((item,index)=><div key={index} className="grid gap-3 border-t border-black/10 py-4 md:grid-cols-2"><input value={item.title} onChange={(e)=>setTestimonials((c)=>({...c,themes:c.themes.map((x,i)=>i===index?{...x,title:e.target.value}:x)}))} className="apple-input" /><input value={item.description} onChange={(e)=>setTestimonials((c)=>({...c,themes:c.themes.map((x,i)=>i===index?{...x,description:e.target.value}:x)}))} className="apple-input" /></div>)}</div></div><div className="border-t border-black/10 p-5 text-right">{saveButton('save-testimonials','testimonials_content',testimonials)}</div></div> : null}

        {mode === 'seasons' ? (
          <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
            {panelHeader('季度設定', '每一季獨立保留課程與報名資料。複製下一季後可先編輯草稿，確認後再切換前台。', '/courses')}
            <div className="flex flex-col gap-3 border-b border-black/10 bg-apple-gray-50 p-5 sm:flex-row sm:items-end sm:justify-between">
              <Field label="作為複製來源的季度">
                <select value={selectedSeasonId} onChange={(event) => setSelectedSeasonId(event.target.value)} className="apple-input min-w-56">
                  {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
                </select>
              </Field>
              <button type="button" disabled={!selectedSeason} onClick={createNextSeason} className="apple-button-primary gap-2 px-5 py-3 disabled:opacity-40"><Copy className="h-4 w-4" />複製建立下一季</button>
            </div>
            <div className="divide-y divide-black/10">
              {seasons.map((season) => (
                <article key={season.id} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black text-apple-gray-900">{season.name}</h3>
                      <span className="rounded-full bg-apple-gray-100 px-3 py-1 text-xs font-bold text-apple-gray-700">{season.code}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${season.isCurrent ? 'bg-emerald-100 text-emerald-800' : 'bg-violet-50 text-violet-700'}`}>{season.isCurrent ? '前台招生季度' : courseSeasonStatusLabels[season.status]}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div><p className="text-xs font-bold text-apple-gray-500">報名記錄</p><p className="mt-1 text-lg font-black">{season.registrationCount}</p></div>
                      <div><p className="text-xs font-bold text-apple-gray-500">已確認</p><p className="mt-1 text-lg font-black text-emerald-700">{season.approvedCount}</p></div>
                      <div><p className="text-xs font-bold text-apple-gray-500">待對帳</p><p className="mt-1 text-lg font-black text-blue-700">{season.pendingReviewCount}</p></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                    <select value={season.status} onChange={(event) => updateSeasonStatus(season, event.target.value as CourseSeasonStatus)} className="apple-input min-w-32" aria-label={`更新 ${season.name} 狀態`}>
                      {Object.entries(courseSeasonStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <button type="button" onClick={() => { setSelectedSeasonId(season.id); setMode('courses') }} className="apple-button-outline px-4 py-2.5">管理這季課程</button>
                    {!season.isCurrent ? <button type="button" onClick={() => activateSeason(season)} className="apple-button-primary gap-2 px-4 py-2.5"><CheckCircle2 className="h-4 w-4" />設為前台招生</button> : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {mode === 'courses' && selectedSeason ? (
          <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
            {panelHeader(`${selectedSeason.name}課程資料`, selectedSeason.isCurrent ? '儲存後會同步發布到首頁、訓練課程、日程表、課程詳情與報名頁。' : '這是非當前季度，儲存只會更新草稿或歷史資料，不影響前台。', '/courses')}
            <div className="border-b border-black/10 bg-apple-gray-50 p-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(180px,.7fr)_minmax(280px,1.3fr)_auto] lg:items-end">
                <Field label="管理季度"><select value={selectedSeasonId} onChange={(e) => { setSelectedSeasonId(e.target.value); setCourseMessage('') }} className="apple-input">{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}{season.isCurrent ? '（前台招生）' : ''}</option>)}</select></Field>
                <Field label="這一季的課程"><select value={selectedSlug} onChange={(e) => { setSelectedSlug(e.target.value); setCourseMessage('') }} className="apple-input" disabled={!seasonCourses.length}>{seasonCourses.length ? seasonCourses.map((course) => <option key={course.slug} value={course.slug}>{course.name}</option>) : <option value="">尚未建立課程</option>}</select></Field>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setShowNewCourse((current) => !current)} className="apple-button-primary gap-1 px-3 py-3 text-sm"><Plus className="h-4 w-4" />新增</button>
                  <button type="button" onClick={duplicateSeasonCourse} disabled={!selectedCourse} className="apple-button-outline gap-1 px-3 py-3 text-sm disabled:opacity-40"><Copy className="h-4 w-4" />複製</button>
                  <button type="button" onClick={deleteSeasonCourse} disabled={!selectedCourse} className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-3 text-sm font-bold text-red-700 disabled:opacity-40"><Trash2 className="h-4 w-4" />刪除</button>
                </div>
              </div>
              {showNewCourse ? (
                <div className="mt-4 grid gap-3 rounded-lg border border-black/10 bg-white p-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,.7fr)_auto] md:items-end">
                  <Field label="新課程名稱"><input value={newCourseName} onChange={(event) => setNewCourseName(event.target.value)} className="apple-input" maxLength={180} placeholder="例如 2026 好運跑步訓練營 X 週一台北夜跑班" /></Field>
                  <Field label="介紹版型"><select value={newCourseTemplateSlug} onChange={(event) => setNewCourseTemplateSlug(event.target.value)} className="apple-input">{courses.map((course) => <option key={course.slug} value={course.slug}>{course.name}</option>)}</select></Field>
                  <button type="button" onClick={createSeasonCourse} className="apple-button-primary gap-2 px-5 py-3"><Plus className="h-4 w-4" />建立課程</button>
                  <p className="text-xs font-semibold leading-5 text-apple-gray-500 md:col-span-3">版型只繼承課程介紹架構；名稱、星期、城市、日期、教練、名額與價格都可獨立修改。新課程完成設定前預設不對外顯示。</p>
                </div>
              ) : null}
            </div>
            {selectedCourse ? (
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="課程名稱"><input value={String(draft.name ?? '')} onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))} className="apple-input" /></Field>
              <Field label="星期"><select value={String(draft.weekday ?? '').replace('周', '週')} onChange={(e) => setDraft((current) => ({ ...current, weekday: e.target.value }))} className="apple-input"><option value="">請選擇星期</option>{orderedWeekdays.map((weekday) => <option key={weekday} value={weekday}>{weekday}</option>)}</select></Field>
              <Field label="城市 / 地點"><input value={String(draft.location ?? '')} onChange={(e) => setDraft((current) => ({ ...current, location: e.target.value }))} className="apple-input" /></Field>
              <Field label="課程週期"><input value={String(draft.period ?? '')} onChange={(e) => setDraft((current) => ({ ...current, period: e.target.value }))} className="apple-input" placeholder="例如 7/14 - 9/29" /></Field>
              <Field label="上課時間"><input value={String(draft.classTime ?? '')} onChange={(e) => setDraft((current) => ({ ...current, classTime: e.target.value }))} className="apple-input" placeholder="例如 19:27（1.5-2 小時）" /></Field>
              <Field label="集合地點" wide><input value={String(draft.meetingPoint ?? '')} onChange={(e) => setDraft((current) => ({ ...current, meetingPoint: e.target.value }))} className="apple-input" /></Field>
              <Field label="費用說明"><input value={String(draft.feeNote ?? '')} onChange={(e) => setDraft((current) => ({ ...current, feeNote: e.target.value }))} className="apple-input" /></Field>
              <Field label="班級名額"><input type="number" min={1} max={500} value={draftCapacity} onChange={(e) => setDraftCapacity(Number(e.target.value))} className="apple-input" /></Field>
              <Field label="適合對象" wide><input value={String(draft.targetAudience ?? '')} onChange={(e) => setDraft((current) => ({ ...current, targetAudience: e.target.value }))} className="apple-input" /></Field>
              <Field label="訓練方向" wide><input value={String(draft.focus ?? '')} onChange={(e) => setDraft((current) => ({ ...current, focus: e.target.value }))} className="apple-input" /></Field>
              <div className="border-y border-black/10 py-5 md:col-span-2">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div><h3 className="font-black text-apple-gray-900">報名計價設定</h3><p className="mt-1 text-sm leading-6 text-apple-gray-500">實際收費課次會直接決定插班堂數；課程開始後，學員必須選擇本期計費起始課次。</p></div>
                  <button type="button" onClick={rebuildBillingDates} className="apple-button-outline shrink-0 gap-2 px-4 py-2.5"><CalendarRange className="h-4 w-4" />依課程週期重建日期</button>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="實際收費課次日期（每行一個 YYYY-MM-DD）" wide><textarea rows={7} value={draftBilling.sessionDates.join('\n')} onChange={(e) => setDraftBilling((current) => ({ ...current, scheduleReady: true, sessionDates: [...new Set(e.target.value.split(/[\s,，]+/).map((date) => date.trim()).filter(Boolean))].sort() }))} className="apple-input resize-y font-mono text-sm" /></Field>
                  <Field label="舊生整季價格"><input type="number" min={0} step={50} value={draftBilling.returningFullPrice} onChange={(e) => setDraftBilling((current) => ({ ...current, returningFullPrice: Number(e.target.value) }))} className="apple-input" /></Field>
                  <Field label="新生整季價格"><input type="number" min={0} step={50} value={draftBilling.newFullPrice} onChange={(e) => setDraftBilling((current) => ({ ...current, newFullPrice: Number(e.target.value) }))} className="apple-input" /></Field>
                  <Field label="舊生插班每堂"><input type="number" min={0} step={50} value={draftBilling.returningLateRate} onChange={(e) => setDraftBilling((current) => ({ ...current, returningLateRate: Number(e.target.value) }))} className="apple-input" /></Field>
                  <Field label="有推薦人插班每堂"><input type="number" min={0} step={50} value={draftBilling.referredLateRate} onChange={(e) => setDraftBilling((current) => ({ ...current, referredLateRate: Number(e.target.value) }))} className="apple-input" /></Field>
                  <Field label="無推薦人插班每堂"><input type="number" min={0} step={50} value={draftBilling.standardLateRate} onChange={(e) => setDraftBilling((current) => ({ ...current, standardLateRate: Number(e.target.value) }))} className="apple-input" /></Field>
                  <Field label="報價保留時數"><input type="number" min={1} max={168} value={draftBilling.priceLockHours} onChange={(e) => setDraftBilling((current) => ({ ...current, priceLockHours: Number(e.target.value) }))} className="apple-input" /></Field>
                  <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={draftBilling.scheduleReady} onChange={(e) => setDraftBilling((current) => ({ ...current, scheduleReady: e.target.checked }))} className="h-4 w-4" />啟用本班自動計價</label>
                </div>
              </div>
              <fieldset className="md:col-span-2">
                <legend className="mb-2 text-xs font-bold text-apple-gray-500">本課程教練</legend>
                <div className="grid gap-2 border-y border-black/10 py-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Object.values(content.coachProfiles).map((coach) => {
                    const checked = draft.coachKeys?.includes(coach.coachKey) ?? false
                    return (
                      <label key={coach.coachKey} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm font-bold transition ${checked ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-apple-gray-700 hover:bg-apple-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => setDraft((current) => ({
                            ...current,
                            coachKeys: event.target.checked
                              ? [...(current.coachKeys ?? []), coach.coachKey]
                              : (current.coachKeys ?? []).filter((coachKey) => coachKey !== coach.coachKey),
                          }))}
                          className="h-4 w-4"
                        />
                        <span className="min-w-0 truncate">{coach.displayName}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs leading-5 text-apple-gray-500">只在這裡設定課程歸屬；教練端僅開放更換頭像，姓名、經歷與課程介紹由超級管理員統一維護。</p>
              </fieldset>
              <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"><p className="text-sm font-black text-emerald-900">報名方式：網站內建報名表</p><p className="mt-1 text-sm leading-6 text-emerald-800">發布後，「立即報名」會進入本課程的網站報名頁，不再使用 Google 表單。</p></div>
              <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={draft.active !== false} onChange={(e) => setDraft((current) => ({ ...current, active: e.target.checked }))} className="h-4 w-4" />這門課程對外顯示</label>
              <div className="flex flex-wrap gap-2"><button type="button" onClick={saveCourse} className="apple-button-primary gap-2"><Save className="h-4 w-4" />{selectedSeason.isCurrent ? '儲存並發布至課程與日程表' : '儲存這季課程'}</button></div>
              {courseMessage ? <p className="md:col-span-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{courseMessage}</p> : null}
            </div>
            ) : (
              <div className="p-10 text-center"><h3 className="text-lg font-black text-apple-gray-900">這一季尚未建立課程</h3><p className="mt-2 text-sm text-apple-gray-500">點擊上方「新增」，即可從介紹版型建立全新的班級。</p></div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
