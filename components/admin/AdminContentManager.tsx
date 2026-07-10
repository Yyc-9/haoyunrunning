'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, CalendarRange, ImagePlus, Loader2, Megaphone, Plus, Save, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { CourseOverride, HomeActivity, SeasonalUpdate, SiteContent } from '@/lib/site-content'

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
}

type AdminContentManagerProps = {
  content: SiteContent
  courses: CourseSummary[]
  runAction: (id: string, action: Record<string, unknown>) => Promise<boolean>
}

type ContentMode = 'hero' | 'activities' | 'seasonal' | 'courses'

async function uploadHeroImage(file: File) {
  if (!supabase) throw new Error('圖片服務尚未設定。')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('請重新登入管理員帳號。')

  const formData = new FormData()
  formData.set('file', file)
  formData.set('folder', 'hero')
  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: formData,
  })
  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!response.ok || !payload.url) throw new Error(payload.error || '圖片上傳失敗。')
  return payload.url
}

function courseDraft(course: CourseSummary, override?: CourseOverride): CourseOverride {
  return {
    active: override?.active !== false,
    name: override?.name || course.name,
    weekday: override?.weekday || course.weekday,
    location: override?.location || course.location,
    period: override?.period || course.period,
    classTime: override?.classTime || course.classTime,
    meetingPoint: override?.meetingPoint || course.meetingPoint,
    feeNote: override?.feeNote || course.feeNote,
    targetAudience: override?.targetAudience || course.targetAudience,
    focus: override?.focus || course.focus,
  }
}

export default function AdminContentManager({ content, courses, runAction }: AdminContentManagerProps) {
  const [mode, setMode] = useState<ContentMode>('hero')
  const [slides, setSlides] = useState(content.heroSlides)
  const [activities, setActivities] = useState<HomeActivity[]>(content.activities)
  const [seasonal, setSeasonal] = useState<SeasonalUpdate>(content.seasonalUpdate)
  const [courseOverrides, setCourseOverrides] = useState(content.courseOverrides)
  const [selectedSlug, setSelectedSlug] = useState(courses[0]?.slug || '')
  const [draft, setDraft] = useState<CourseOverride>(() => courses[0] ? courseDraft(courses[0], content.courseOverrides[courses[0].slug]) : {})
  const [isUploading, setIsUploading] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    setSlides(content.heroSlides)
    setActivities(content.activities)
    setSeasonal(content.seasonalUpdate)
    setCourseOverrides(content.courseOverrides)
  }, [content])

  const selectedCourse = useMemo(() => courses.find((course) => course.slug === selectedSlug), [courses, selectedSlug])

  useEffect(() => {
    if (selectedCourse) setDraft(courseDraft(selectedCourse, courseOverrides[selectedCourse.slug]))
  }, [courseOverrides, selectedCourse])

  async function addHeroImage(file?: File) {
    if (!file) return
    setIsUploading(true)
    setLocalError('')
    try {
      const url = await uploadHeroImage(file)
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
    if (!selectedCourse) return
    const nextOverrides = { ...courseOverrides, [selectedCourse.slug]: draft }
    setCourseOverrides(nextOverrides)
    await runAction(`course-${selectedCourse.slug}`, {
      action: 'save_site_content',
      section: 'course_overrides',
      value: nextOverrides,
    })
  }

  const modes: Array<{ id: ContentMode; label: string }> = [
    { id: 'hero', label: '首頁輪播' },
    { id: 'activities', label: '活動入口' },
    { id: 'seasonal', label: '季度資訊' },
    { id: 'courses', label: '課程資料' },
  ]

  return (
    <section>
      <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 ring-1 ring-black/10">
        {modes.map((item) => (
          <button key={item.id} type="button" onClick={() => setMode(item.id)} className={`min-w-max rounded-xl px-4 py-2.5 text-sm font-bold ${mode === item.id ? 'bg-black text-white' : 'text-apple-gray-600 hover:bg-apple-gray-100'}`}>
            {item.label}
          </button>
        ))}
      </div>

      {localError ? <p className="mb-5 rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">{localError}</p> : null}

      {mode === 'hero' ? (
        <div className="apple-card overflow-hidden">
          <div className="flex flex-col justify-between gap-3 border-b border-black/10 p-5 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black text-apple-gray-900">首頁輪播圖片</h2>
              <p className="mt-1 text-sm text-apple-gray-600">最多 8 張，可調整順序或刪除；儲存後首頁立即使用。</p>
            </div>
            <label title="新增首頁輪播圖片" className="apple-button-outline inline-flex cursor-pointer items-center justify-center gap-2 px-5 py-3">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              新增圖片
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isUploading || slides.length >= 8} onChange={(event) => addHeroImage(event.target.files?.[0])} />
            </label>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {slides.map((slide, index) => (
              <article key={`${slide}-${index}`} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                <div className="relative aspect-video bg-apple-gray-100">
                  <Image src={slide} alt={`首頁輪播 ${index + 1}`} fill sizes="(min-width: 1280px) 30vw, 50vw" className="object-cover" />
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <span className="text-xs font-bold text-apple-gray-500">第 {index + 1} 張</span>
                  <div className="flex gap-1">
                    <button title="向前移動" type="button" disabled={index === 0} onClick={() => moveSlide(index, -1)} className="rounded-lg p-2 hover:bg-apple-gray-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button title="向後移動" type="button" disabled={index === slides.length - 1} onClick={() => moveSlide(index, 1)} className="rounded-lg p-2 hover:bg-apple-gray-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    <button title="刪除圖片" type="button" disabled={slides.length <= 1} onClick={() => setSlides((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="border-t border-black/10 p-5 text-right">
            <button type="button" onClick={() => runAction('save-hero', { action: 'save_site_content', section: 'hero_slides', value: slides })} className="apple-button-primary gap-2 px-6 py-3"><Save className="h-4 w-4" />儲存輪播</button>
          </div>
        </div>
      ) : null}

      {mode === 'activities' ? (
        <div className="apple-card overflow-hidden">
          <div className="flex flex-col justify-between gap-3 border-b border-black/10 p-5 md:flex-row md:items-center">
            <div><h2 className="text-xl font-black text-apple-gray-900">首頁活動入口</h2><p className="mt-1 text-sm text-apple-gray-600">新增活動、報名頁或外部連結，首頁會依順序顯示。</p></div>
            <button type="button" disabled={activities.length >= 8} onClick={() => setActivities((current) => [...current, { title: '', description: '', action: '立即查看', href: '/' }])} className="apple-button-outline gap-2 px-5 py-3 disabled:opacity-40"><Plus className="h-4 w-4" />新增活動</button>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {activities.map((activity, index) => (
              <article key={index} className="rounded-2xl border border-black/10 p-4">
                <div className="mb-3 flex items-center justify-between"><Megaphone className="h-5 w-5 text-apple-blue" /><button title="刪除活動" type="button" onClick={() => setActivities((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div>
                <div className="grid gap-3">
                  <input value={activity.title} onChange={(event) => setActivities((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} placeholder="活動名稱" className="apple-input" />
                  <textarea value={activity.description} onChange={(event) => setActivities((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} placeholder="活動說明" rows={3} className="apple-input resize-y" />
                  <input value={activity.action} onChange={(event) => setActivities((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, action: event.target.value } : item))} placeholder="按鈕文字" className="apple-input" />
                  <input value={activity.href} onChange={(event) => setActivities((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, href: event.target.value } : item))} placeholder="網站路徑或完整網址" className="apple-input" />
                </div>
              </article>
            ))}
          </div>
          <div className="border-t border-black/10 p-5 text-right"><button type="button" onClick={() => runAction('save-activities', { action: 'save_site_content', section: 'home_activities', value: activities })} className="apple-button-primary gap-2 px-6 py-3"><Save className="h-4 w-4" />發布活動入口</button></div>
        </div>
      ) : null}

      {mode === 'seasonal' ? (
        <div className="apple-card overflow-hidden">
          <div className="border-b border-black/10 p-5"><div className="flex items-center gap-3"><CalendarRange className="h-5 w-5 text-apple-blue" /><h2 className="text-xl font-black text-apple-gray-900">季度資訊</h2></div><p className="mt-2 text-sm text-apple-gray-600">發布訓練季度、招生週期或重要公告；開啟後會出現在首頁。</p></div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <input value={seasonal.period} onChange={(event) => setSeasonal((current) => ({ ...current, period: event.target.value }))} placeholder="季度，例如 2026 夏季" className="apple-input" />
            <input value={seasonal.title} onChange={(event) => setSeasonal((current) => ({ ...current, title: event.target.value }))} placeholder="標題" className="apple-input" />
            <textarea value={seasonal.summary} onChange={(event) => setSeasonal((current) => ({ ...current, summary: event.target.value }))} placeholder="摘要" rows={3} className="apple-input resize-y md:col-span-2" />
            <textarea value={seasonal.body} onChange={(event) => setSeasonal((current) => ({ ...current, body: event.target.value }))} placeholder="完整內容，可分段撰寫" rows={6} className="apple-input resize-y md:col-span-2" />
            <input value={seasonal.href} onChange={(event) => setSeasonal((current) => ({ ...current, href: event.target.value }))} placeholder="延伸連結，可留空" className="apple-input" />
            <input value={seasonal.linkLabel} onChange={(event) => setSeasonal((current) => ({ ...current, linkLabel: event.target.value }))} placeholder="連結文字" className="apple-input" />
            <label className="flex items-center gap-3 text-sm font-bold text-apple-gray-700"><input type="checkbox" checked={seasonal.active} onChange={(event) => setSeasonal((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4" />在首頁顯示這則資訊</label>
            <button type="button" onClick={() => runAction('save-seasonal', { action: 'save_site_content', section: 'seasonal_update', value: seasonal })} className="apple-button-primary gap-2"><Save className="h-4 w-4" />儲存季度資訊</button>
          </div>
        </div>
      ) : null}

      {mode === 'courses' && selectedCourse ? (
        <div className="apple-card overflow-hidden">
          <div className="border-b border-black/10 p-5"><h2 className="text-xl font-black text-apple-gray-900">課程資料管理</h2><p className="mt-1 text-sm text-apple-gray-600">修改會同步到首頁課程預覽、課程列表與課程詳情頁。</p></div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <label className="md:col-span-2"><span className="mb-2 block text-xs font-bold text-apple-gray-500">選擇課程</span><select value={selectedSlug} onChange={(event) => setSelectedSlug(event.target.value)} className="apple-input">{courses.map((course) => <option key={course.slug} value={course.slug}>{course.name}</option>)}</select></label>
            {[
              ['name', '課程名稱'], ['weekday', '星期'], ['location', '城市 / 地點'], ['period', '課程週期'], ['classTime', '上課時間'], ['meetingPoint', '集合地點'], ['feeNote', '費用說明'], ['targetAudience', '適合對象'], ['focus', '訓練方向'],
            ].map(([field, label]) => (
              <label key={field} className={['meetingPoint', 'targetAudience', 'focus'].includes(field) ? 'md:col-span-2' : ''}><span className="mb-2 block text-xs font-bold text-apple-gray-500">{label}</span><input value={String(draft[field as keyof CourseOverride] ?? '')} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} className="apple-input" /></label>
            ))}
            <label className="flex items-center gap-3 text-sm font-bold text-apple-gray-700"><input type="checkbox" checked={draft.active !== false} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4" />這門課程對外顯示</label>
            <button type="button" onClick={saveCourse} className="apple-button-primary gap-2"><Save className="h-4 w-4" />儲存課程資料</button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
