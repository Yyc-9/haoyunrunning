'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Instagram, LockKeyhole, Send } from 'lucide-react'
import { useLanguage } from '@/app/language-context'
import { allCourses } from '@/lib/goodluck-data'
import PaymentOptions from '@/components/PaymentOptions'
import PaymentNotice from '@/components/PaymentNotice'
import BankTransferInfo from '@/components/BankTransferInfo'

function localizeText(text: string, language: string) {
  if (language === 'zh-CN') {
    return text
      .replaceAll('好運', '好运')
      .replaceAll('訓練', '训练')
      .replaceAll('課程', '课程')
      .replaceAll('週', '周')
      .replaceAll('節奏', '节奏')
      .replaceAll('費用', '费用')
      .replaceAll('諮詢', '咨询')
  }

  return text
}

export default function PaymentPageClient() {
  const { language, t } = useLanguage()
  const [method, setMethod] = useState(1)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    course: '',
    amount: '',
    transferLastFive: '',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmingTransfer, setIsConfirmingTransfer] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submitTransferDetails() {
    setError('')
    setIsSuccess(false)

    if (!form.name.trim()) {
      setError(t.payment.transferForm.nameError)
      return
    }

    if (!form.email.trim()) {
      setError(t.payment.transferForm.emailError)
      return
    }

    if (!form.course.trim()) {
      setError(t.payment.transferForm.courseError)
      return
    }

    if (!form.amount.trim()) {
      setError(t.payment.transferForm.amountError)
      return
    }

    if (!/^\d{5}$/.test(form.transferLastFive.trim())) {
      setError(t.payment.transferForm.lastFiveError)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/signup-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'course_payment',
          name: form.name,
          email: form.email,
          preferredCourse: form.course,
          amountText: form.amount,
          transferLastFive: form.transferLastFive,
          notes: form.notes,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || t.payment.transferForm.submitError)
      }

      setIsSuccess(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.payment.transferForm.submitError)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function confirmSignupAndShowBankInfo() {
    setError('')
    setIsSuccess(false)

    if (!form.name.trim()) {
      setError(t.payment.transferForm.nameError)
      return
    }

    if (!form.email.trim()) {
      setError(t.payment.transferForm.emailError)
      return
    }

    if (!form.course.trim()) {
      setError(t.payment.transferForm.courseError)
      return
    }

    if (!form.amount.trim()) {
      setError(t.payment.transferForm.amountError)
      return
    }

    setIsConfirmingTransfer(true)

    try {
      const response = await fetch('/api/signup-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'course_payment',
          intent: 'confirm_transfer',
          name: form.name,
          email: form.email,
          preferredCourse: form.course,
          amountText: form.amount,
          notes: form.notes,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || t.payment.transferForm.confirmError)
      }

      setIsConfirmed(true)
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : t.payment.transferForm.confirmError)
    } finally {
      setIsConfirmingTransfer(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-apple-gray-50 to-white pt-24">
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <Link href="/courses" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-apple-gray-700 hover:text-apple-blue">
            <ArrowLeft className="h-4 w-4" />
            {t.courseDetail.backToCourses}
          </Link>

          <div className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-apple-blue">{t.payment.label}</p>
              <h1 className="text-4xl font-black text-apple-gray-900 md:text-6xl">{t.payment.title}</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-apple-gray-600">{t.payment.subtitle}</p>
            </div>
            <a
              href="https://www.instagram.com/nurture.running.team/"
              target="_blank"
              rel="noreferrer"
              className="apple-button-primary inline-flex items-center justify-center gap-2 px-6 py-3"
            >
              <Instagram className="h-5 w-5" />
              {t.payment.instagramCta}
            </a>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="space-y-8">
              <section className="apple-card p-6 md:p-8">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-bold text-apple-gray-700">{t.payment.courseLabel}</span>
                    <select
                      value={form.course}
                      onChange={(event) => updateField('course', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-apple-gray-800 outline-none transition focus:border-apple-blue"
                    >
                      <option value="">{t.payment.coursePlaceholder}</option>
                      {allCourses.map((course) => (
                        <option key={course.slug} value={localizeText(course.title, language)}>
                          {localizeText(course.title, language)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold text-apple-gray-700">{t.payment.nameLabel}</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => updateField('name', event.target.value)}
                      placeholder={t.payment.namePlaceholder}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-apple-blue"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold text-apple-gray-700">{t.payment.emailLabel}</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField('email', event.target.value)}
                      placeholder={t.payment.emailPlaceholder}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-apple-blue"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold text-apple-gray-700">{t.payment.transferForm.amountLabel}</span>
                    <input
                      type="text"
                      value={form.amount}
                      onChange={(event) => updateField('amount', event.target.value)}
                      placeholder={t.payment.transferForm.amountPlaceholder}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-apple-blue"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold text-apple-gray-700">{t.payment.transferForm.lastFiveLabel}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={form.transferLastFive}
                      onChange={(event) => updateField('transferLastFive', event.target.value.replace(/\D/g, '').slice(0, 5))}
                      placeholder={t.payment.transferForm.lastFivePlaceholder}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-apple-blue"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-bold text-apple-gray-700">{t.payment.transferForm.notesLabel}</span>
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateField('notes', event.target.value)}
                      placeholder={t.payment.transferForm.notesPlaceholder}
                      rows={4}
                      className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-apple-blue"
                    />
                  </label>
                </div>

                {error ? <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p> : null}
                {isSuccess ? (
                  <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-4 text-emerald-700">
                    <p className="font-bold">{t.payment.transferForm.successTitle}</p>
                    <p className="mt-1 text-sm">{t.payment.transferForm.successDescription}</p>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={submitTransferDetails}
                  disabled={!isConfirmed || isSubmitting}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-apple-gray-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:bg-apple-gray-200 disabled:text-apple-gray-500"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? t.payment.transferForm.submitting : t.payment.transferForm.submit}
                </button>
              </section>

              <PaymentOptions title={t.payment.optionsTitle} methods={t.payment.methods} />
              {isConfirmed ? <BankTransferInfo labels={t.payment.bankTransfer} /> : null}
              <PaymentNotice title={t.payment.noticeTitle} notices={t.payment.notices} />
            </div>

            <aside className="space-y-6 lg:sticky lg:top-32">
              <section className="apple-card p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-apple-gray-500">{t.payment.amountTitle}</p>
                    <h2 className="text-xl font-black text-apple-gray-900">{t.payment.title}</h2>
                  </div>
                </div>
                <p className="text-sm leading-7 text-apple-gray-600">{t.payment.amountDescription}</p>

                <div className="mt-6 space-y-3">
                  {t.payment.methods.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => setMethod(index)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        method === index
                          ? 'border-apple-blue bg-apple-blue/10 text-apple-blue'
                          : 'border-black/10 bg-white text-apple-gray-700 hover:border-apple-blue/40'
                      }`}
                    >
                      <span className="block text-sm font-bold">{item.title}</span>
                      <span className="mt-1 block text-xs opacity-75">{item.status}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={confirmSignupAndShowBankInfo}
                  disabled={isConfirmingTransfer}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-apple-blue px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {isConfirmingTransfer ? t.payment.transferForm.confirming : isConfirmed ? t.payment.confirmedLabel : t.payment.submitLabel}
                </button>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
