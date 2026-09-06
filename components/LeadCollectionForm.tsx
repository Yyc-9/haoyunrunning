'use client'

import { FormEvent, useState } from 'react'
import { Send } from 'lucide-react'

type LeadFormLabels = {
  contactSection: string
  intentionSection: string
  notesSection: string
  name: string
  phone: string
  email: string
  instagram: string
  runningExperience: string
  goal: string
  notes: string
  submit: string
  submitting: string
  successTitle: string
  successDescription: string
  contactHint: string
  optional: string
}

type SelectField = {
  name: 'preferredCourse' | 'companionCount'
  label: string
  options: readonly string[]
}

type LeadCollectionFormProps = {
  source: 'anniversary_4th' | 'group_class' | 'course_payment'
  labels: LeadFormLabels
  selectField?: SelectField
}

const initialForm = {
  name: '',
  phone: '',
  email: '',
  instagram: '',
  preferredCourse: '',
  runningExperience: '',
  goal: '',
  companionCount: '',
  notes: '',
}

export default function LeadCollectionForm({ source, labels, selectField }: LeadCollectionFormProps) {
  const [form, setForm] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSuccess(false)

    if (!form.name.trim()) {
      setError(labels.name)
      return
    }

    if (!form.phone.trim() && !form.email.trim() && !form.instagram.trim()) {
      setError(labels.contactHint)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/signup-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, ...form }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || labels.contactHint)
      }

      setForm(initialForm)
      setIsSuccess(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : labels.contactHint)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mobile-lead-form apple-card space-y-5 p-6 md:p-8">
      <section className="space-y-4">
        <h2 className="text-lg font-black text-apple-gray-900">{labels.contactSection}</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-apple-gray-700">{labels.name}</span>
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-apple-blue"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-apple-gray-700">{labels.phone}</span>
            <input
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-apple-blue"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-apple-gray-700">{labels.email}</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-apple-blue"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-apple-gray-700">{labels.instagram}</span>
            <input
              value={form.instagram}
              onChange={(event) => updateField('instagram', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-apple-blue"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-black text-apple-gray-900">{labels.intentionSection}</h2>
        {selectField ? (
          <label className="block">
            <span className="text-sm font-bold text-apple-gray-700">{selectField.label}</span>
            <select
              value={form[selectField.name]}
              onChange={(event) => updateField(selectField.name, event.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-apple-gray-800 outline-none transition focus:border-apple-blue"
            >
              <option value="">{labels.optional}</option>
              {selectField.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-apple-gray-700">{labels.runningExperience}</span>
            <textarea
              value={form.runningExperience}
              onChange={(event) => updateField('runningExperience', event.target.value)}
              rows={4}
              className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-apple-blue"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-apple-gray-700">{labels.goal}</span>
            <textarea
              value={form.goal}
              onChange={(event) => updateField('goal', event.target.value)}
              rows={4}
              className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-apple-blue"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-black text-apple-gray-900">{labels.notesSection}</h2>
        <label className="block">
          <span className="text-sm font-bold text-apple-gray-700">{labels.notes}</span>
          <textarea
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            rows={4}
            className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-apple-blue"
          />
        </label>
      </section>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p> : null}
      {isSuccess ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-emerald-700">
          <p className="font-bold">{labels.successTitle}</p>
          <p className="mt-1 text-sm">{labels.successDescription}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="apple-button-primary inline-flex w-full items-center justify-center gap-2 px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {isSubmitting ? labels.submitting : labels.submit}
      </button>
    </form>
  )
}
