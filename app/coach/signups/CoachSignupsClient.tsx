'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Inbox, RefreshCw, Search } from 'lucide-react'
import { useLanguage } from '@/app/language-context'
import CoachSubNav from '@/components/CoachSubNav'
import { coachEmergencyContact, emergencyContactColumns, emergencyContactTable, type CoachEmergencyContact } from '@/lib/coach-emergency-contacts'
import { rosterCsv } from '@/lib/enrollment-export'
import { supabase } from '@/lib/supabase'

export default function CoachSignupsClient() {
  const { language } = useLanguage()
  const en = language === 'en'
  const [contacts, setContacts] = useState<CoachEmergencyContact[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null
      if (!session) throw new Error('Missing session')
      const response = await fetch('/api/signup-leads?source=course_payment&view=emergency_contacts', {
        headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok || !Array.isArray(payload.leads)) throw new Error('Unable to load contacts')
      setContacts(payload.leads.map(coachEmergencyContact))
    } catch {
      setContacts([])
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return contacts.filter(contact => emergencyContactColumns.some(([key]) => contact[key].toLocaleLowerCase().includes(term)))
  }, [contacts, query])

  function download() {
    const table = emergencyContactTable(filtered, en)
    const url = URL.createObjectURL(new Blob([rosterCsv(table.headers, table.rows)], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `haoyun-emergency-contacts-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <CoachSubNav />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-apple-gray-900 sm:text-3xl">{en ? 'Emergency contacts' : '緊急聯絡人'}</h1>
          <p className="mt-2 text-base text-apple-gray-600">{en ? 'Student contact details, emergency contacts and LINE IDs.' : '查看學員聯絡方式、緊急聯絡人及 LINE ID。'}</p>
        </div>
        <button onClick={download} disabled={loading || failed || !filtered.length} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
          <Download className="h-4 w-4" />{en ? 'Export CSV' : '匯出 CSV'}
        </button>
      </div>
      <div className="mb-6 flex gap-3">
        <label className="relative flex-1">
          <span className="sr-only">{en ? 'Search contacts' : '搜尋聯絡人'}</span>
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-apple-gray-500" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder={en ? 'Search name, phone, email or LINE ID' : '搜尋姓名、電話、信箱或 LINE ID'} className="min-h-12 w-full rounded-lg border border-apple-gray-200 bg-white py-3 pl-10 pr-3 text-base" />
        </label>
        <button onClick={() => void load()} disabled={loading} aria-label={en ? 'Refresh contacts' : '重新整理聯絡人'} className="flex min-h-12 min-w-12 items-center justify-center rounded-lg border border-apple-gray-200 bg-white disabled:opacity-40"><RefreshCw className="h-5 w-5" /></button>
      </div>
      {failed ? <p role="alert" className="rounded-lg bg-red-50 p-4 text-base text-red-700">{en ? 'Unable to load contacts. Check your sign-in and refresh to retry.' : '讀取聯絡資料失敗，請確認登入狀態並重新整理。'}</p>
        : loading ? <p role="status" className="py-12 text-center text-base text-apple-gray-600">{en ? 'Loading emergency contacts…' : '讀取緊急聯絡資料中…'}</p>
        : !filtered.length ? <div className="rounded-xl bg-white p-12 text-center text-apple-gray-600"><Inbox className="mx-auto mb-3 h-8 w-8" /><p>{en ? 'No matching contacts' : '沒有符合條件的聯絡人'}</p></div>
        : <div className="space-y-4">{filtered.map(contact => (
          <article key={contact.id} className="rounded-xl border border-apple-gray-200 bg-white p-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {emergencyContactColumns.map(([key, zh, english]) => (
                <div key={key} className="min-w-0">
                  <dt className="mb-1 text-sm font-medium text-apple-gray-500">{en ? english : zh}</dt>
                  <dd className="break-words text-base font-medium text-apple-gray-900">
                    {!contact[key] ? <span className="font-normal text-apple-gray-500">{en ? 'Not provided' : '未填寫'}</span>
                      : <span translate="no">{key === 'phone' || key === 'emergency_contact_phone'
                        ? <a href={`tel:${contact[key]}`} className="underline underline-offset-4">{contact[key]}</a>
                        : key === 'email' ? <a href={`mailto:${contact[key]}`} className="break-all underline underline-offset-4">{contact[key]}</a>
                          : contact[key]}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}</div>}
    </div>
  )
}
