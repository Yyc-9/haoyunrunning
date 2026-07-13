'use client'

import { useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from 'lucide-react'
import type { Course } from '@/lib/goodluck-data'
import type { LegacyStudentStatus, MyCourseEnrollment } from '@/lib/course-registration'
import {
  coursePolicyRules,
  invoiceDeliveryOptions,
  registrationAmounts,
  type DirectCourseRegistration,
} from '@/lib/course-registration-form'
import { supabase } from '@/lib/supabase'

type DirectCourseRegistrationFormProps = {
  course: Course
  userEmail: string
  legacyStudent: LegacyStudentStatus
  onSubmitted: (enrollment: MyCourseEnrollment) => void
}

type RegistrationResponse = {
  enrollment?: MyCourseEnrollment
  error?: string
}

const steps = ['課程確認', '規範同意', '報名資料', '付款發票'] as const

const initialForm: DirectCourseRegistration = {
  studentType: 'new',
  studentName: '',
  phone: '',
  lineId: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  referrer: '',
  recentChallenge: '',
  recentGoal: '',
  injuryHistory: '',
  runningStatus: '',
  amount: '',
  transferLastFive: '',
  invoiceDelivery: '',
  invoiceDetail: '',
  notes: '',
  taxInvoiceInfo: '',
  coachSubstituteConsent: false,
  rulesConsent: false,
  finalConsent: false,
}

function FieldLabel({ children, optional = false }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="mb-2 block text-sm font-black text-apple-gray-800">
      {children}
      {optional ? <span className="ml-2 text-xs font-medium text-apple-gray-400">選填</span> : <span className="ml-1 text-red-500">*</span>}
    </span>
  )
}

export default function DirectCourseRegistrationForm({ course, userEmail, legacyStudent, onSubmitted }: DirectCourseRegistrationFormProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<DirectCourseRegistration>(() => ({
    ...initialForm,
    studentType: legacyStudent.matched ? 'returning' : 'new',
    studentName: legacyStudent.name,
    amount: legacyStudent.matched ? registrationAmounts[0] : registrationAmounts[1],
  }))
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  const coaches = useMemo(() => course.coaches ?? (course.coach ? [course.coach] : []), [course])
  const availableAmounts = legacyStudent.matched
    ? [registrationAmounts[0], registrationAmounts[2]]
    : [registrationAmounts[1], registrationAmounts[2]]
  const progress = ((step + 1) / steps.length) * 100

  function update<K extends keyof DirectCourseRegistration>(key: K, value: DirectCourseRegistration[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function showError(message: string) {
    setError(message)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function validateStep(currentStep: number) {
    if (currentStep === 1 && (!form.coachSubstituteConsent || !form.rulesConsent)) {
      showError('請完成兩項課程規範同意後再繼續。')
      return false
    }

    if (currentStep === 2) {
      if (!form.studentName || !form.emergencyContactName || !form.emergencyContactPhone) {
        showError('請填寫學員姓名與緊急聯絡人資料。')
        return false
      }
      if (form.studentType === 'new' && (!form.phone || !form.lineId || !form.recentChallenge || !form.recentGoal || !form.injuryHistory || !form.runningStatus)) {
        showError('請完成所有新生必填資料。沒有成績或傷病時可填寫「無」。')
        return false
      }
    }

    if (currentStep === 3) {
      if (!form.amount || !/^\d{5}$/.test(form.transferLastFive)) {
        showError('請選擇匯款金額，並填寫付款帳號後五碼。')
        return false
      }
      if (!form.invoiceDelivery || !form.invoiceDetail || !form.finalConsent) {
        showError('請完成電子發票資料並確認參與本期訓練營。')
        return false
      }
    }

    setError('')
    return true
  }

  function nextStep() {
    if (!validateStep(step)) return
    setStep((current) => Math.min(current + 1, steps.length - 1))
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function previousStep() {
    setError('')
    setStep((current) => Math.max(0, current - 1))
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function submitRegistration() {
    if (!validateStep(3)) return
    setIsSubmitting(true)
    setError('')

    try {
      const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
      if (!session?.access_token) throw new Error('登入狀態已失效，請重新登入後再送出。')

      const response = await fetch('/api/course-enrollments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'direct_site_registration',
          courseSlug: course.slug,
          registration: form,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as RegistrationResponse
      if (!response.ok || !payload.enrollment) throw new Error(payload.error || '報名資料送出失敗。')

      onSubmitted(payload.enrollment)
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (submitError) {
      showError(submitError instanceof Error ? submitError.message : '報名資料送出失敗。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div ref={topRef} className="scroll-mt-28">
      <div className="border-b border-black/10 px-5 py-5 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-apple-blue">網站報名表</p>
            <h2 className="mt-1 text-xl font-black text-apple-gray-950">{steps[step]}</h2>
          </div>
          <span className="text-sm font-black text-apple-gray-500">{step + 1} / {steps.length}</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-apple-gray-100">
          <div className="h-full rounded-full bg-apple-blue transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[11px] font-bold text-apple-gray-400">
          {steps.map((label, index) => <span key={label} className={index === step ? 'text-apple-blue' : ''}>{label}</span>)}
        </div>
      </div>

      <div className="px-5 py-6 sm:px-8 sm:py-8">
        {error ? <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">{error}</div> : null}

        {step === 0 ? (
          <div>
            <div className="rounded-lg border border-black/10 bg-apple-gray-50 p-5">
              <p className="text-xs font-bold text-apple-gray-500">本次報名課程</p>
              <h3 className="mt-2 text-xl font-black leading-7 text-apple-gray-950">{course.name}</h3>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-apple-gray-500">日期</dt><dd className="mt-1 font-bold">{course.period}</dd></div>
                <div><dt className="text-apple-gray-500">地點</dt><dd className="mt-1 font-bold">{course.location}{course.meetingPoint ? ` · ${course.meetingPoint}` : ''}</dd></div>
                <div><dt className="text-apple-gray-500">上課日</dt><dd className="mt-1 font-bold">{course.weekday}</dd></div>
                <div><dt className="text-apple-gray-500">訓練重點</dt><dd className="mt-1 font-bold">{course.focus}</dd></div>
              </dl>
            </div>

            <div className="mt-7">
              <div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-apple-blue" /><h3 className="font-black">認識教練陣容</h3></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {coaches.map((coach) => (
                  <div key={coach.name} className="flex min-w-0 items-center gap-3 rounded-lg border border-black/10 p-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-apple-gray-100">
                      {coach.imageUrl ? (
                        <Image
                          src={coach.imageUrl}
                          alt={coach.name}
                          fill
                          sizes="64px"
                          className={/zheng-yi-qun|luo-pei-ci/.test(coach.imageUrl)
                            ? 'origin-top scale-[2.45] object-contain object-top'
                            : 'object-cover object-[center_15%]'}
                        />
                      ) : <UserRound className="m-5 h-6 w-6 text-apple-gray-400" />}
                    </div>
                    <div className="min-w-0"><p className="truncate font-black text-apple-gray-950">{coach.name}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-apple-gray-500">{coach.role}</p></div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-apple-blue" /><div><h3 className="text-lg font-black">學員權益及課程規範</h3><p className="mt-1 text-sm leading-6 text-apple-gray-500">請務必仔細閱讀，以免影響權益。</p></div></div>
            <div className="mt-5 max-h-[420px] space-y-4 overflow-y-auto rounded-lg border border-black/10 bg-apple-gray-50 p-4 pr-3 text-sm leading-6 text-apple-gray-700 sm:p-5">
              {coursePolicyRules.map((rule, index) => (
                <p key={rule} className="whitespace-pre-line"><span className="mr-2 font-black text-apple-gray-950">（{index + 1}）</span>{rule}</p>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="font-black text-blue-950">報名相關疑問</p>
              <p className="mt-1 text-sm leading-6 text-blue-800">可直接私訊以下任一聯絡窗口，我們會協助確認課程與報名資訊。</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href="https://www.instagram.com/nurture.running.team/" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-300 bg-white px-3 text-sm font-black text-blue-900">好運官方 IG<ExternalLink className="h-3.5 w-3.5" /></a>
                <a href="https://www.facebook.com/77Coach.tw/" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-300 bg-white px-3 text-sm font-black text-blue-900">陳盛琦 Facebook<ExternalLink className="h-3.5 w-3.5" /></a>
                <a href="https://www.instagram.com/chichi_moment/" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-300 bg-white px-3 text-sm font-black text-blue-900">chichi_moment IG<ExternalLink className="h-3.5 w-3.5" /></a>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/10 p-4">
                <input type="checkbox" checked={form.coachSubstituteConsent} onChange={(event) => update('coachSubstituteConsent', event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-black" />
                <span className="text-sm font-bold leading-6">我了解教練若因家庭、比賽或活動因素請假，將提前告知，並視實際情況安排代課或完成課程執行。</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/10 p-4">
                <input type="checkbox" checked={form.rulesConsent} onChange={(event) => update('rulesConsent', event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-black" />
                <span className="text-sm font-bold leading-6">本人已詳細閱讀上述說明，同意課程規範及學員權益，並以網路同意確認代替紙本。</span>
              </label>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-apple-blue" /><h3 className="text-lg font-black">學員身份</h3></div>
            <div className={`mt-4 rounded-lg border p-4 ${legacyStudent.matched ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-black">{legacyStudent.matched ? '已辨識為好運舊生' : '本次將以新生身份報名'}</p>
                  <p className="mt-1 text-sm leading-6 opacity-80">系統依登入信箱 {userEmail} 自動核對，身份與對應價格無需手動選擇。</p>
                </div>
              </div>
            </div>

            <p className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">資料僅供好運跑班進行課程聯絡、付款核對與安全照護使用。</p>

            <div className="mt-6 space-y-5">
              <label className="block"><FieldLabel>學員姓名</FieldLabel><input autoComplete="name" value={form.studentName} onChange={(event) => update('studentName', event.target.value)} className="apple-input min-h-12" /></label>

              {form.studentType === 'new' ? (
                <>
                  <label className="block"><FieldLabel>手機電話</FieldLabel><input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} className="apple-input min-h-12" /></label>
                  <label className="block"><FieldLabel>LINE ID</FieldLabel><input autoCapitalize="none" value={form.lineId} onChange={(event) => update('lineId', event.target.value)} className="apple-input min-h-12" /><span className="mt-2 block text-xs leading-5 text-apple-gray-500">請留意陌生訊息，教練會將您加入 LINE 群組。</span></label>
                </>
              ) : null}

              <label className="block"><FieldLabel>緊急聯絡人姓名</FieldLabel><input autoComplete="off" value={form.emergencyContactName} onChange={(event) => update('emergencyContactName', event.target.value)} className="apple-input min-h-12" /></label>
              <label className="block"><FieldLabel>緊急聯絡人聯絡電話</FieldLabel><input type="tel" inputMode="tel" autoComplete="off" value={form.emergencyContactPhone} onChange={(event) => update('emergencyContactPhone', event.target.value)} className="apple-input min-h-12" /></label>

              {form.studentType === 'new' ? (
                <>
                  <label className="block"><FieldLabel optional>推薦人</FieldLabel><input value={form.referrer} onChange={(event) => update('referrer', event.target.value)} className="apple-input min-h-12" placeholder="跑班舊生姓名；若無可留白" /></label>
                  <label className="block"><FieldLabel>近期挑戰</FieldLabel><textarea value={form.recentChallenge} onChange={(event) => update('recentChallenge', event.target.value)} className="apple-input min-h-24 resize-y" placeholder="半年內 5K、10K、半馬或全馬成績；沒有可填「無」" /></label>
                  <label className="block"><FieldLabel>近期目標</FieldLabel><textarea value={form.recentGoal} onChange={(event) => update('recentGoal', event.target.value)} className="apple-input min-h-24 resize-y" placeholder="目標賽事、距離或完賽時間" /></label>
                  <label className="block"><FieldLabel>過去到現在是否有病史或運動傷害？</FieldLabel><textarea value={form.injuryHistory} onChange={(event) => update('injuryHistory', event.target.value)} className="apple-input min-h-24 resize-y" placeholder="沒有請填「無」" /></label>
                  <label className="block"><FieldLabel>跑步近況</FieldLabel><textarea value={form.runningStatus} onChange={(event) => update('runningStatus', event.target.value)} className="apple-input min-h-24 resize-y" placeholder="簡單分享現在的跑步感覺" /></label>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-apple-blue" /><h3 className="text-lg font-black">匯款資訊</h3></div>
            <div className="mt-4 overflow-hidden rounded-lg border border-black/10 bg-[#f5f1eb] p-2">
              <Image src="/course-registration/payment-info.jpg" alt="好運跑班匯款資料" width={958} height={472} className="h-auto w-full rounded-md" priority unoptimized />
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-black/10 bg-apple-gray-50 px-4 py-3 text-xs leading-5 text-apple-gray-600"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />網站只記錄匯款帳號後五碼，不會要求信用卡號、網銀密碼或完整付款帳號。</div>

            <fieldset className="mt-6">
              <legend><FieldLabel>您的匯款總金額</FieldLabel></legend>
              <div className="space-y-2">
                {availableAmounts.map((amount) => (
                  <label key={amount} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold ${form.amount === amount ? 'border-black bg-apple-gray-950 text-white' : 'border-black/10 bg-white'}`}>
                    <input type="radio" name="amount" checked={form.amount === amount} onChange={() => update('amount', amount)} className="h-4 w-4 accent-black" />{amount}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs leading-5 text-apple-gray-500">插班堂數與費用請先透過好運 Instagram 洽詢小編計算。</p>
            </fieldset>

            <label className="mt-6 block"><FieldLabel>匯款後五碼</FieldLabel><input inputMode="numeric" maxLength={5} value={form.transferLastFive} onChange={(event) => update('transferLastFive', event.target.value.replace(/\D/g, '').slice(0, 5))} className="apple-input min-h-12 text-lg tracking-[0.25em]" placeholder="12345" /><span className="mt-2 block text-xs leading-5 text-apple-gray-500">匯款備註請保持空白，並保留轉帳截圖以利後續查詢。</span></label>

            <div className="my-8 border-t border-black/10" />
            <div className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-apple-blue" /><h3 className="text-lg font-black">電子發票</h3></div>
            <fieldset className="mt-4">
              <legend><FieldLabel>電子發票開立方式</FieldLabel></legend>
              <div className="space-y-2">
                {invoiceDeliveryOptions.map((option) => (
                  <label key={option} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm font-bold leading-6 ${form.invoiceDelivery === option ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-black/10'}`}>
                    <input type="radio" name="invoiceDelivery" checked={form.invoiceDelivery === option} onChange={() => {
                      update('invoiceDelivery', option)
                      if (option === '寄至本次報名的 Gmail 信箱') update('invoiceDetail', userEmail)
                      else if (form.invoiceDetail === userEmail) update('invoiceDetail', '')
                    }} className="mt-1 h-4 w-4 accent-blue-600" />{option}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-5 block"><FieldLabel>載具條碼或電子信箱</FieldLabel><input autoCapitalize="characters" value={form.invoiceDetail} onChange={(event) => update('invoiceDetail', event.target.value)} className="apple-input min-h-12" placeholder="例如 /HI77HI 或 runner@example.com" /><span className="mt-2 block text-xs leading-5 text-apple-gray-500">手機載具由「/」開頭，後接 6 碼英文大寫與數字組合。</span></label>
            <label className="mt-5 block"><FieldLabel optional>備註</FieldLabel><textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} className="apple-input min-h-24 resize-y" placeholder="想跟小編說什麼呢？請勿填寫完整付款帳號或信用卡資料" /></label>
            <label className="mt-5 block"><FieldLabel optional>統一編號與發票抬頭</FieldLabel><input value={form.taxInvoiceInfo} onChange={(event) => update('taxInvoiceInfo', event.target.value)} className="apple-input min-h-12" placeholder="若無可留白" /></label>

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <input type="checkbox" checked={form.finalConsent} onChange={(event) => update('finalConsent', event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-emerald-700" />
              <span className="text-sm font-black leading-6 text-emerald-900">我願意參與 {course.period} 好運訓練營 X {course.weekday}{course.location}課程，並確認以上資料正確。</span>
            </label>
          </div>
        ) : null}

        <div className="mt-8 flex gap-3 border-t border-black/10 pt-5">
          {step > 0 ? <button type="button" onClick={previousStep} className="apple-button-outline min-h-12 flex-1 gap-2"><ArrowLeft className="h-4 w-4" />上一步</button> : null}
          {step < steps.length - 1 ? (
            <button type="button" onClick={nextStep} className="apple-button-primary min-h-12 flex-1 gap-2">下一步<ArrowRight className="h-4 w-4" /></button>
          ) : (
            <button type="button" disabled={isSubmitting} onClick={submitRegistration} className="apple-button-primary min-h-12 flex-1 gap-2 disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              送出報名與付款資料
            </button>
          )}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-apple-gray-400"><LockKeyhole className="h-3.5 w-3.5" />資料經加密連線送出，僅供報名管理使用</div>
      </div>
    </div>
  )
}
