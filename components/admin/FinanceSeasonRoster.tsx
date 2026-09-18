'use client'

import { useState } from 'react'

export type FinanceRosterRow = {
  id: string
  name: string
  preferred_course: string
  calculated_amount: number | null
  transfer_last_five: string
  status: string
}
const states = [
  { value: 'approved', label: '已確認繳費' },
  { value: 'pending_transfer', label: '待繳費／未回報' },
  { value: 'pending_review', label: '已回報待核對' },
  { value: 'rejected', label: '異常／重複記錄' },
]

export default function FinanceSeasonRoster({ rows }: { rows: FinanceRosterRow[] }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const filtered = rows.filter(row => (filter === 'all' || row.status === filter)
    && `${row.name} ${row.preferred_course} ${row.transfer_last_five}`.toLowerCase().includes(search.trim().toLowerCase()))
  return <section className="apple-card overflow-hidden">
    <div className="space-y-3 border-b border-black/10 p-5">
      <h3 className="font-black">本季報名繳費一覽</h3>
      <p className="text-xs leading-5 text-apple-gray-500">包含未出現在銀行檔案中的報名。未回報或尚未匹配不代表一定未付款，請核對後再確認；異常與重複記錄另列，不算作已繳費。</p>
      <div className="flex flex-wrap gap-2">
        {[{ value: 'all', label: '全部報名' }, ...states].map(state => <button key={state.value} type="button" onClick={() => setFilter(state.value)} aria-pressed={filter === state.value}
          className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold ${filter === state.value ? 'bg-black text-white' : 'bg-apple-gray-100 text-apple-gray-700'}`}>
          {state.label} {state.value === 'all' ? rows.length : rows.filter(row => row.status === state.value).length}
        </button>)}
      </div>
      <input aria-label="搜尋報名姓名、班級或後五碼" placeholder="搜尋姓名、班級或後五碼" className="apple-input" value={search} onChange={event => setSearch(event.target.value)} />
    </div>
    <div className="max-h-[420px] overflow-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="sticky top-0 bg-apple-gray-50"><tr>{['姓名', '班級', '應繳金額', '匯款後五碼', '繳費狀態'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-black/10">{filtered.map(row => <tr key={row.id}>
          <td className="px-4 py-3 font-bold">{row.name}</td><td className="px-4 py-3">{row.preferred_course}</td>
          <td className="px-4 py-3">{row.calculated_amount === null ? '未定價' : `NT$ ${row.calculated_amount.toLocaleString()}`}</td>
          <td className="px-4 py-3 font-mono">{row.transfer_last_five || '未回報'}</td>
          <td className={`px-4 py-3 font-bold ${row.status === 'approved' ? 'text-emerald-700' : 'text-amber-800'}`}>{states.find(state => state.value === row.status)?.label ?? row.status}</td>
        </tr>)}</tbody>
      </table>
      {!filtered.length && <p className="p-8 text-center text-sm text-apple-gray-500">此篩選沒有報名記錄。</p>}
    </div>
  </section>
}
