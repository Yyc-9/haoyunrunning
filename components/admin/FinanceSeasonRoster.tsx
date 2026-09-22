'use client'

import { Fragment, useEffect, useState } from 'react'
import FinanceEnrollmentActions from './FinanceEnrollmentActions'

export type FinanceRosterRow = {
  id: string
  name: string
  preferred_course: string
  calculated_amount: number | null
  transfer_last_five: string
  status: string
  email?: string
  phone?: string
  notes?: string
  review_note?: string | null
  reviewed_at?: string | null
  transfer_date?: string | null
  payment_submitted_at?: string | null
  invoiceDelivery?: string
  invoiceDetail?: string
  taxInvoiceInfo?: string
}
const states = [
  { value: 'approved', label: '已確認繳費' },
  { value: 'pending_transfer', label: '待繳費／未回報' },
  { value: 'pending_review', label: '已回報待核對' },
  { value: 'rejected', label: '資料待補充' },
]

export default function FinanceSeasonRoster({ rows, readOnly = false, busy = false, onConfirm, onChanged }: {
  rows: FinanceRosterRow[]; readOnly?: boolean; busy?: boolean
  onConfirm: (id: string, reason: string) => Promise<boolean>
  onChanged: () => Promise<void>
}) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState('')
  const [reason, setReason] = useState('')
  const [receiptChecked, setReceiptChecked] = useState(false)
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('enrollment')
    if (requested) setExpanded(requested)
  }, [])
  const filtered = rows.filter(row => (filter === 'all' || row.status === filter)
    && `${row.name} ${row.email || ''} ${row.preferred_course} ${row.transfer_last_five}`.toLowerCase().includes(search.trim().toLowerCase()))
  return <section id="finance-roster" className="apple-card scroll-mt-28 overflow-hidden">
    <div className="space-y-3 border-b border-black/10 p-5">
      <h3 className="font-black">本季報名繳費一覽</h3>
      <p className="text-xs leading-5 text-apple-gray-500">包含未出現在銀行檔案中的報名。展開報名可查看開票資料、確認入帳或通知補件；未回報或尚未匹配不代表一定未付款，請先核對銀行記錄。</p>
      <div className="flex flex-wrap gap-2">
        {[{ value: 'all', label: '全部報名' }, ...states].map(state => <button key={state.value} type="button" onClick={() => setFilter(state.value)} aria-pressed={filter === state.value}
          className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold ${filter === state.value ? 'bg-black text-white' : 'bg-apple-gray-100 text-apple-gray-700'}`}>
          {state.label} {state.value === 'all' ? rows.length : rows.filter(row => row.status === state.value).length}
        </button>)}
      </div>
      <input aria-label="搜尋報名姓名、信箱、班級或後五碼" placeholder="搜尋姓名、信箱、班級或後五碼" className="apple-input" value={search} onChange={event => setSearch(event.target.value)} />
    </div>
    <div className="overflow-x-auto">
      <table className="block w-full text-left text-sm md:table md:min-w-[760px]">
        <thead className="hidden bg-apple-gray-50 md:table-header-group"><tr>{['姓名／信箱', '班級', '應繳金額', '匯款後五碼', '繳費狀態', '操作'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="block divide-y divide-black/10 md:table-row-group">{filtered.map(row => <Fragment key={row.id}><tr className="grid grid-cols-2 items-start py-2 md:table-row md:align-top [&>td]:min-w-0">
          <td className="px-4 py-3"><p className="font-bold" translate="no">{row.name}</p><p className="mt-1 max-w-56 break-all text-xs text-apple-gray-600" translate="no">{row.email || '未填寫'}</p></td><td className="px-4 py-3">{row.preferred_course}</td>
          <td className="px-4 py-3">{row.calculated_amount === null ? '未定價' : `NT$ ${row.calculated_amount.toLocaleString()}`}</td>
          <td className="px-4 py-3 font-mono">{row.transfer_last_five || '未回報'}</td>
          <td className={`px-4 py-3 font-bold ${row.status === 'approved' ? 'text-emerald-700' : 'text-amber-800'}`}>{states.find(state => state.value === row.status)?.label ?? row.status}</td>
          <td className="px-4 py-3"><button type="button" disabled={busy} aria-expanded={expanded === row.id} aria-controls={`finance-detail-${row.id}`} className="min-h-11 whitespace-nowrap font-bold underline disabled:opacity-50" onClick={() => { setExpanded(expanded === row.id ? '' : row.id); setReason(''); setReceiptChecked(false) }}>{expanded === row.id ? '收起資料' : '查看／處理'}</button></td>
        </tr>{expanded === row.id && <tr className="block md:table-row"><td colSpan={6} className="block bg-apple-gray-50 p-5 md:table-cell"><div id={`finance-detail-${row.id}`} className="max-w-4xl space-y-5">
          <h4 className="font-bold">報名與開票資料</h4>
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ['電子信箱', row.email], ['聯絡電話', row.phone], ['發票方式', row.invoiceDelivery],
              ['載具或發票信箱', row.invoiceDetail], ['統編與抬頭', row.taxInvoiceInfo], ['匯款日期', row.transfer_date],
              ['匯款回報時間', row.payment_submitted_at ? new Date(row.payment_submitted_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : ''],
              ['最近核對時間', row.reviewed_at ? new Date(row.reviewed_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : ''],
              ['報名備註', row.notes], ['核對備註', row.review_note],
            ].map(([label, value]) => <div key={label}><dt className="text-xs text-apple-gray-600">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6" translate="no">{value || '未填寫'}</dd></div>)}
          </dl>
          {readOnly ? <p className="text-sm text-apple-gray-600">此季度或帳號僅供查閱，無法修改。</p> : row.status !== 'approved' && <form className="space-y-3 border-t border-black/10 pt-5" onSubmit={async event => { event.preventDefault(); if (receiptChecked && await onConfirm(row.id, reason)) { setReason(''); setReceiptChecked(false) } }}>
            <h4 className="font-bold">人工確認入帳</h4>
            <p className="leading-6">請核對 {row.name} 的「{row.preferred_course}」，應繳 {row.calculated_amount === null ? '未定價' : `NT$ ${row.calculated_amount.toLocaleString()}`}。確認後將正式關聯班級與任課教練。</p>
            <label className="block font-bold">核對依據<textarea aria-label="核對依據" required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} className="apple-input mt-2 min-h-24" placeholder="例如：已於銀行記錄核對匯款日期、金額及後五碼。勿填完整銀行帳號。" /></label>
            <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={receiptChecked} onChange={event => setReceiptChecked(event.target.checked)} />我已核實款項實際入帳，確認學員、班級與金額正確。</label>
            <button type="submit" disabled={busy || !receiptChecked || !reason.trim()} className="apple-button-primary disabled:opacity-50">{busy ? '正在處理…' : '確認入帳'}</button>
          </form>}
          <FinanceEnrollmentActions key={`${row.id}:${row.status}`} id={row.id} readOnly={readOnly} onChanged={onChanged} />
        </div></td></tr>}</Fragment>)}</tbody>
      </table>
      {!filtered.length && <p className="p-8 text-center text-sm text-apple-gray-500">此篩選沒有報名記錄。</p>}
    </div>
  </section>
}
