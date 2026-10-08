'use client'

import { useRef, useState } from 'react'
import { useLanguage } from '@/app/language-context'

export default function AdminCoachCreator({ runAction }: {
  runAction: (id: string, action: Record<string, unknown>) => Promise<boolean>
}) {
  const { language } = useLanguage()
  const en = language === 'en'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [kind, setKind] = useState('assistant')
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  return <form className="rounded-2xl border border-black/10 bg-white p-5" onSubmit={async event => {
    event.preventDefault()
    if (busy.current) return
    busy.current = true
    setSaving(true)
    try {
      if (await runAction('create-coach-account', { action: 'create_coach_account', name: name.trim(), kind, verificationEmail: email.trim() })) {
        setName(''); setEmail('')
      }
    } finally { busy.current = false; setSaving(false) }
  }}>
    <h2 className="text-xl font-black">{en ? 'Add a coach or assistant' : '新增教練／助教'}</h2>
    <p className="mt-2 text-sm leading-6 text-apple-gray-600">{en ? 'Register the name and sign-in email first. Access activates after email verification. Assign classes in season settings. The public biography remains unpublished.' : '先登記姓名與登入信箱，完成信箱驗證後啟用。新增後可到季度課程分配班級，公開介紹暫不發布。'}</p>
    <fieldset disabled={saving} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_140px_1.4fr_auto] disabled:opacity-60">
      <label className="grid gap-2 text-sm font-bold">{en ? 'Name' : '姓名'}<input required maxLength={80} value={name} onChange={event => setName(event.target.value)} className="apple-input" /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? 'Role' : '身份'}<select value={kind} onChange={event => setKind(event.target.value)} className="apple-input"><option value="assistant">{en ? 'Assistant' : '助教'}</option><option value="coach">{en ? 'Coach' : '教練'}</option></select></label>
      <label className="grid gap-2 text-sm font-bold">{en ? 'Sign-in email' : '登入信箱'}<input required type="email" value={email} onChange={event => setEmail(event.target.value)} className="apple-input" /></label>
      <button type="submit" disabled={!name.trim() || !email.trim()} className="apple-button-primary self-end disabled:opacity-50">{saving ? (en ? 'Adding…' : '新增中…') : (en ? 'Add account' : '新增帳號')}</button>
    </fieldset>
  </form>
}
