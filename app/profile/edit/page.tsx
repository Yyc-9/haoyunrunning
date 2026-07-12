'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, Save, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import {
  cityOptions, countryCodes, emptyProfile, favoriteDistanceOptions, formatPb, formatPhone,
  getRaceCountdown, getRaceEvent, getUpcomingRaceEvents, goalOptions, parsePb, parsePhone,
  pbCategoryOptions, raceRegionOptions, runningExperienceOptions, type AccountProfile,
} from '@/lib/runner-profile'
import { supabase } from '@/lib/supabase'

type AccountPayload = { profile?: AccountProfile; error?: string }

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return <span className="mb-2 block text-sm font-black text-black">{children}{required ? <span className="ml-1 text-red-500">*</span> : <span className="ml-2 text-xs font-medium text-apple-gray-400">選填</span>}</span>
}

export default function EditProfilePage() {
  const router = useRouter()
  const { isLoggedIn, isLoading, refreshUser } = useAuth()
  const [profile, setProfile] = useState<AccountProfile>(emptyProfile)
  const [phoneCode, setPhoneCode] = useState('+886')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [cityChoice, setCityChoice] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [pbCategory, setPbCategory] = useState('')
  const [pbResult, setPbResult] = useState('')
  const [goalChoice, setGoalChoice] = useState('')
  const [customGoal, setCustomGoal] = useState('')
  const [raceChoice, setRaceChoice] = useState('')
  const [customRace, setCustomRace] = useState('')
  const [isAccountLoading, setIsAccountLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const upcomingRaces = useMemo(() => getUpcomingRaceEvents(), [])
  const selectedRace = getRaceEvent(raceChoice)

  const loadAccount = useCallback(async () => {
    if (!supabase || !isLoggedIn) return
    setIsAccountLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('請重新登入後再修改資料。')
      const response = await fetch('/api/account/me', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' })
      const payload = (await response.json().catch(() => ({}))) as AccountPayload
      if (!response.ok || !payload.profile) throw new Error(payload.error || '讀取帳戶資料失敗。')
      const loaded = { ...emptyProfile, ...payload.profile }
      setProfile(loaded)

      const phone = parsePhone(loaded.phone)
      setPhoneCode(phone.code)
      setPhoneNumber(phone.number)

      if (cityOptions.includes(loaded.city as typeof cityOptions[number]) || !loaded.city) setCityChoice(loaded.city)
      else { setCityChoice('other'); setCustomCity(loaded.city) }

      const pb = parsePb(loaded.pb)
      setPbCategory(pb.category)
      setPbResult(pb.result)

      if (goalOptions.includes(loaded.goal as typeof goalOptions[number]) || !loaded.goal) setGoalChoice(loaded.goal)
      else { setGoalChoice('other'); setCustomGoal(loaded.goal) }

      if (loaded.target_event.startsWith('race:') && getRaceEvent(loaded.target_event)) setRaceChoice(loaded.target_event)
      else if (loaded.target_event) { setRaceChoice('custom'); setCustomRace(loaded.target_event.replace(/^custom:/, '')) }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '讀取帳戶資料失敗。')
    } finally {
      setIsAccountLoading(false)
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoading && isLoggedIn) loadAccount()
  }, [isLoading, isLoggedIn, loadAccount])

  function updateField<K extends keyof AccountProfile>(key: K, value: AccountProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  async function saveProfile() {
    if (!profile.name.trim()) { setError('請填寫真實姓名。'); return }
    if (!supabase) return

    const city = cityChoice === 'other' ? customCity.trim() : cityChoice
    const goal = goalChoice === 'other' ? customGoal.trim() : goalChoice
    const targetEvent = raceChoice === 'custom' ? `custom:${customRace.trim()}` : raceChoice

    setIsSaving(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('登入狀態已失效，請重新登入。')
      const response = await fetch('/api/account/me', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          nickname: profile.nickname,
          phone: formatPhone(phoneCode, phoneNumber),
          city,
          runningSince: profile.running_since,
          favoriteDistance: profile.favorite_distance,
          pb: formatPb(pbCategory, pbResult),
          targetEvent,
          goal,
          instagram: profile.instagram,
          facebook: profile.facebook,
          invoiceType: profile.invoice_type,
          invoiceCarrier: profile.invoice_carrier,
          taxId: profile.tax_id,
          bio: profile.bio,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as AccountPayload
      if (!response.ok || !payload.profile) throw new Error(payload.error || '儲存帳戶資料失敗。')
      await refreshUser()
      router.push('/profile')
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '儲存帳戶資料失敗。')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || isAccountLoading) return <main className="flex min-h-screen items-center justify-center bg-apple-gray-50 pt-24"><Loader2 className="h-9 w-9 animate-spin text-black" /></main>

  if (!isLoggedIn) return <main className="min-h-screen bg-apple-gray-50 px-4 pt-32 text-center"><h1 className="text-2xl font-black">請先登入</h1><Link href="/?auth=login" className="apple-button-primary mt-6">登入帳戶</Link></main>

  return (
    <main className="min-h-screen bg-apple-gray-50 pt-20 sm:pt-24">
      <div className="container mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-12">
        <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-black text-apple-gray-600"><ArrowLeft className="h-4 w-4" />返回跑者名片</Link>
        <header className="mt-5 border-b border-black/10 pb-5 sm:pb-8"><p className="text-xs font-bold text-apple-blue sm:text-sm">EDIT RUNNER PROFILE</p><h1 className="mt-2 text-3xl font-black text-black sm:text-5xl">修改跑者資料</h1><p className="mt-3 text-sm leading-6 text-apple-gray-600 sm:text-base">完成後會返回跑者名片展示頁。</p></header>

        {error ? <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}

        <section className="mt-6 rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-7">
          <div className="grid gap-5 md:grid-cols-2">
            <label><FieldLabel required>真實姓名</FieldLabel><input autoComplete="name" value={profile.name} onChange={(event) => updateField('name', event.target.value)} className="apple-input min-h-12" /></label>
            <label><FieldLabel>暱稱</FieldLabel><input value={profile.nickname} onChange={(event) => updateField('nickname', event.target.value)} className="apple-input min-h-12" placeholder="跑友怎麼稱呼你？" /></label>

            <div className="md:col-span-2"><FieldLabel>手機電話</FieldLabel><div className="grid grid-cols-[135px_1fr] gap-2"><select value={phoneCode} onChange={(event) => setPhoneCode(event.target.value)} className="apple-input min-h-12 px-3">{countryCodes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><input type="tel" inputMode="numeric" autoComplete="tel-national" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, ''))} className="apple-input min-h-12" placeholder="912345678" /></div></div>

            <div><FieldLabel>所在城市</FieldLabel><select value={cityChoice} onChange={(event) => setCityChoice(event.target.value)} className="apple-input min-h-12"><option value="">請選擇</option>{cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}<option value="other">其他城市</option></select>{cityChoice === 'other' ? <input value={customCity} onChange={(event) => setCustomCity(event.target.value)} className="apple-input mt-2 min-h-12" placeholder="輸入城市" /> : null}</div>
            <label><FieldLabel>跑步年限</FieldLabel><select value={profile.running_since} onChange={(event) => updateField('running_since', event.target.value)} className="apple-input min-h-12"><option value="">請選擇</option>{runningExperienceOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><FieldLabel>偏好距離</FieldLabel><select value={profile.favorite_distance} onChange={(event) => updateField('favorite_distance', event.target.value)} className="apple-input min-h-12"><option value="">請選擇</option>{favoriteDistanceOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>

            <div><FieldLabel>個人最佳 PB</FieldLabel><select value={pbCategory} onChange={(event) => setPbCategory(event.target.value)} className="apple-input min-h-12"><option value="">請選擇項目</option>{pbCategoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>{pbCategory && pbCategory !== '尚未有正式 PB' ? <input value={pbResult} onChange={(event) => setPbResult(event.target.value)} className="apple-input mt-2 min-h-12" placeholder="例如 1:45:00" /> : null}</div>

            <div className="md:col-span-2"><FieldLabel>近期跑步目標</FieldLabel><select value={goalChoice} onChange={(event) => setGoalChoice(event.target.value)} className="apple-input min-h-12"><option value="">請選擇</option>{goalOptions.map((item) => <option key={item} value={item}>{item}</option>)}<option value="other">其他目標</option></select>{goalChoice === 'other' ? <input value={customGoal} onChange={(event) => setCustomGoal(event.target.value)} className="apple-input mt-2 min-h-12" placeholder="輸入你的目標" /> : null}</div>

            <div className="md:col-span-2"><FieldLabel>目標賽事</FieldLabel><div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" /><select value={raceChoice} onChange={(event) => setRaceChoice(event.target.value)} className="apple-input min-h-12 pl-11"><option value="">尚未決定</option>{raceRegionOptions.map((region) => <optgroup key={region} label={region}>{upcomingRaces.filter((race) => race.region === region).map((race) => <option key={race.id} value={`race:${race.id}`}>{race.date.replaceAll('-', '/')} · {race.name}</option>)}</optgroup>)}<option value="custom">其他賽事</option></select></div>{raceChoice === 'custom' ? <input value={customRace} onChange={(event) => setCustomRace(event.target.value)} className="apple-input mt-2 min-h-12" placeholder="輸入賽事名稱與日期" /> : null}{selectedRace ? <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-950"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">{selectedRace.name}</p><span className="rounded-full bg-black px-3 py-1 text-xs font-black text-white">{getRaceCountdown(selectedRace).label}</span></div><p className="mt-1 leading-6">{selectedRace.date} · {selectedRace.city} · {selectedRace.distances}</p><a href={selectedRace.officialUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-black">官方資訊<ExternalLink className="h-3.5 w-3.5" /></a></div> : null}<p className="mt-2 text-xs leading-5 text-apple-gray-400">依地區整理全球賽事，只顯示尚未結束的項目；目錄最後核對於 2026/07/13。</p></div>

            <label><FieldLabel>Instagram</FieldLabel><div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-apple-gray-400">@</span><input autoCapitalize="none" value={profile.instagram} onChange={(event) => updateField('instagram', event.target.value.replace(/^@/, ''))} className="apple-input min-h-12 pl-9" /></div></label>
            <label><FieldLabel>Facebook</FieldLabel><input autoCapitalize="none" value={profile.facebook} onChange={(event) => updateField('facebook', event.target.value)} className="apple-input min-h-12" placeholder="名稱或個人頁連結" /></label>

            <div className="md:col-span-2"><FieldLabel>發票資訊</FieldLabel><select value={profile.invoice_type} onChange={(event) => updateField('invoice_type', event.target.value as AccountProfile['invoice_type'])} className="apple-input min-h-12"><option value="none">暫不設定</option><option value="carrier">手機條碼載具</option><option value="tax_id">統一編號</option></select>{profile.invoice_type === 'carrier' ? <input value={profile.invoice_carrier} onChange={(event) => updateField('invoice_carrier', event.target.value.toUpperCase().slice(0, 8))} className="apple-input mt-2 min-h-12 font-mono" placeholder="/ABC1234" /> : null}{profile.invoice_type === 'tax_id' ? <input inputMode="numeric" value={profile.tax_id} onChange={(event) => updateField('tax_id', event.target.value.replace(/\D/g, '').slice(0, 8))} className="apple-input mt-2 min-h-12" placeholder="8 位統一編號" /> : null}<p className="mt-2 text-xs leading-5 text-apple-gray-400">這些帳務資料只會在你的登入帳戶與結帳流程中使用，不會顯示給教練或其他會員。</p></div>
            <label className="md:col-span-2"><FieldLabel>跑者自我介紹</FieldLabel><textarea maxLength={600} value={profile.bio} onChange={(event) => updateField('bio', event.target.value)} className="apple-input min-h-28 resize-y" placeholder="分享你的跑步故事" /><span className="mt-2 block text-right text-xs text-apple-gray-400">{profile.bio.length} / 600</span></label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link href="/profile" className="apple-button-secondary min-h-12 px-5">取消</Link>
            <button type="button" disabled={isSaving} onClick={saveProfile} className="apple-button-primary min-h-12 gap-2 px-6 disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isSaving ? '正在儲存' : '儲存並展示'}</button>
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-apple-gray-400"><CheckCircle2 className="h-3.5 w-3.5" />儲存後會同步更新跑者名片與勳章條件。</p>
        </section>
      </div>
    </main>
  )
}
