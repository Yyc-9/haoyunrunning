'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { shopFinanceStates, type FinanceShopOrder, type FinanceShopAudit } from '@/lib/finance-shop'
import { shopInvoiceDisplay, shopInvoiceDetails } from '@/lib/shop-invoice'
import './finance-shop.css'

type Fetcher = (url: string, init?: RequestInit) => Promise<Record<string, unknown>>
const money = (cents: number) => `NT$ ${(cents / 100).toLocaleString('zh-TW', { maximumFractionDigits: 2 })}`
const date = (value: string | null) => value ? new Date(value).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '未回報'

export default function FinanceShopReconciliation({ authorizedFetch, readOnly = false }: { authorizedFetch: Fetcher; readOnly?: boolean }) {
  const [orders, setOrders] = useState<FinanceShopOrder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<FinanceShopOrder | null>(null)
  const [audit, setAudit] = useState<FinanceShopAudit[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [action, setAction] = useState<'approved' | 'rejected' | 'note'>('approved')
  const [reason, setReason] = useState('')
  const [receipt, setReceipt] = useState(false)
  const [saving, setSaving] = useState(false)
  const requestId = useRef(0)
  const detailId = useRef(0)
  const savingRef = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const lastTrigger = useRef<HTMLElement | null>(null)
  const load = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ page: String(page), status, search, month })
      const result = await authorizedFetch(`/api/finance/shop?${params}`)
      if (id !== requestId.current) return
      setOrders(result.orders as FinanceShopOrder[]); setTotal(result.total as number)
    } catch (e) { if (id === requestId.current) setError(e instanceof Error ? e.message : '讀取失敗。') }
    finally { if (id === requestId.current) setLoading(false) }
  }, [authorizedFetch, page, status, search, month])
  useEffect(() => {
    // Invalidate in-flight responses immediately, before the search debounce.
    const requests = requestId
    requests.current++; setLoading(true)
    const timer = setTimeout(() => void load(), 250)
    return () => { clearTimeout(timer); requests.current++ }
  }, [load])
  useEffect(() => () => { detailId.current++ }, [])
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal()
  }, [selected])
  function close() {
    if (savingRef.current) return
    detailId.current++; dialog.current?.close(); setSelected(null)
    lastTrigger.current?.focus()
  }
  async function open(order: FinanceShopOrder, refresh = false) {
    if (!refresh) lastTrigger.current = document.activeElement as HTMLElement
    const id = ++detailId.current
    setSelected(order); setAudit([]); setDetailLoading(true); setDetailError(''); setReceipt(false)
    if (!refresh) { setAction(order.status === 'approved' ? 'note' : 'approved'); setReason('') }
    try {
      const result = await authorizedFetch(`/api/finance/shop?orderId=${order.id}`)
      if (id !== detailId.current) return
      setSelected(result.order as FinanceShopOrder); setAudit(result.audit as FinanceShopAudit[])
      if ((result.order as FinanceShopOrder).status === 'approved') setAction('note')
    } catch (e) { if (id === detailId.current) setDetailError(e instanceof Error ? e.message : '讀取訂單失敗。') }
    finally { if (id === detailId.current) setDetailLoading(false) }
  }
  async function review() {
    if (!selected || savingRef.current || !reason.trim() || (action === 'approved' && !receipt) || detailLoading || detailError) return
    savingRef.current = true; setSaving(true); setDetailError('')
    try {
      const result = await authorizedFetch('/api/finance/shop', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: selected.id, status: action, reason, confirmReceipt: receipt, updatedAt: selected.updated_at }),
      })
      setMessage(String(result.message)); savingRef.current = false; close(); await load()
    } catch (e) { setReceipt(false); setDetailError(e instanceof Error ? e.message : '核帳失敗，請重新載入確認狀態。') }
    finally { savingRef.current = false; setSaving(false) }
  }
  const badge = (order: FinanceShopOrder) => <span className={`fs-badge fs-${order.status}`}>{shopFinanceStates[order.status]}</span>
  const editable = selected && !readOnly
  const invoice = selected ? selected.invoice ?? shopInvoiceDisplay(selected) : null
  return <section className="finance-shop">
    <div className="fs-panel">
      <header className="fs-heading"><div><h2>商城匯款紀錄</h2><p>查看商品訂單，核對買家的匯款資料。</p></div><label>訂單月份<input aria-label="訂單月份" type="month" value={month} onChange={e => { setMonth(e.target.value); setPage(1) }} /><button className="fs-text" onClick={() => { setMonth(''); setPage(1) }}>全部月份</button></label></header>
      <div className="fs-tools"><div className="fs-chips">{Object.entries({ all: '全部', ...shopFinanceStates }).map(([value, label]) => <button key={value} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1) }}>{label}</button>)}</div><input type="search" aria-label="搜尋姓名、信箱、訂單或後五碼" placeholder="搜尋姓名、訂單或後五碼" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} maxLength={100} /></div>
      {message && <p className="fs-message" role="status">{message}</p>}
      {error ? <div className="fs-error" role="alert">{error} <button onClick={() => void load()}>重新讀取</button></div> : loading ? <p className="fs-empty" role="status">正在讀取匯款紀錄…</p> : <>
        <div className="fs-table"><table><thead><tr>{['姓名／訂單', '商品', '應收金額', '匯款後五碼', '載具／發票信箱', '回報時間', '狀態', '操作'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{orders.map(order => <tr key={order.id}><td><strong>{order.customer_name}</strong><small>{order.order_number}</small></td><td>{order.shop_order_items[0]?.name || '商品訂單'}<small>共 {order.shop_order_items.reduce((sum, item) => sum + item.quantity, 0)} 件</small></td><td className="fs-amount">{money(order.total_amount)}</td><td className="fs-code">{order.transfer_last_five || '—'}</td><td style={{ maxWidth: 220, whiteSpace: 'normal', overflowWrap: 'anywhere' }}><span translate="no">{order.invoice_detail || ''}</span>{!order.invoice_detail && <small>開啟訂單確認</small>}</td><td>{date(order.payment_submitted_at)}</td><td>{badge(order)}</td><td><button className="fs-row-button" onClick={() => void open(order)}>{order.status === 'approved' ? '查看紀錄' : '查看／核對'}</button></td></tr>)}</tbody></table></div>
        <div className="fs-mobile">{orders.map(order => <article key={order.id}><div className="fs-card-head"><strong>{order.customer_name}</strong>{badge(order)}</div><p>{order.order_number} · {order.shop_order_items[0]?.name || '商品訂單'}</p><div className="fs-card-numbers"><div><small>應收金額</small><strong>{money(order.total_amount)}</strong></div><div><small>匯款後五碼</small><strong className="fs-code">{order.transfer_last_five || '未回報'}</strong></div></div><p className="break-all">載具／發票信箱：{order.invoice_detail ? <span translate="no">{order.invoice_detail}</span> : '開啟訂單確認'}</p><div className="fs-card-foot"><small>{date(order.payment_submitted_at)}</small><button className="fs-row-button" onClick={() => void open(order)}>{order.status === 'approved' ? '查看紀錄' : '查看／核對'}</button></div></article>)}</div>
        {!orders.length && <p className="fs-empty">沒有符合條件的紀錄。</p>}
      </>}
      <footer className="fs-pagination"><span>共 {total} 筆 · 第 {page} 頁</span><div><button disabled={loading || page === 1} onClick={() => setPage(p => p - 1)}>上一頁</button><button disabled={loading || page * 25 >= total} onClick={() => setPage(p => p + 1)}>下一頁</button><button disabled={loading} onClick={() => void load()}>重新整理</button></div></footer>
      <p className="fs-note">匯款回報不等於款項已入帳。請核對銀行紀錄後再確認；未回報也不代表一定未付款。</p>
    </div>
    <dialog ref={dialog} className="fs-dialog" aria-labelledby="fs-order-title" onCancel={e => { e.preventDefault(); close() }}>
      {selected && <div className="fs-dialog-inner"><header><div><small>{selected.order_number}</small><h2 id="fs-order-title">{selected.customer_name}</h2>{badge(selected)}</div><button disabled={saving} onClick={close} aria-label="關閉訂單">×</button></header><div className="fs-dialog-body">
        <div className="fs-money"><div><small>應收金額</small><strong>{money(selected.total_amount)}</strong></div><div><small>匯款後五碼</small><strong className="fs-code">{selected.transfer_last_five || '未回報'}</strong></div></div>
        <dl className="fs-details">{[['回報時間', date(selected.payment_submitted_at)], ['取貨班級', selected.pickup_class_name || '待確認班級'], ['收款帳戶', selected.payment_account_label || '未記錄收款帳戶'], ['聯絡信箱', selected.email], ['聯絡方式', selected.contact], ['最近核對時間', selected.reviewed_at ? date(selected.reviewed_at) : '尚未核對']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '未填寫'}</dd></div>)}</dl>
        <h3>發票留檔資料</h3>
        {detailLoading ? <p role="status">正在讀取發票資料…</p> : invoice && <dl className="fs-details">{shopInvoiceDetails(invoice).map(({ label, value }) => <div key={label}><dt>{label}</dt><dd translate={label === '載具號碼／發票信箱' || label === '統編與抬頭' ? 'no' : undefined}>{value}</dd></div>)}</dl>}
        {invoice?.source === 'registration' && <p className="fs-note">參考報名時間：{date(invoice.referenceDate)}。請確認是否適用於本次購買；核對結果可儲存在財務備註。</p>}
        <h3>購買商品</h3><ul className="fs-items">{selected.shop_order_items.map(item => <li key={item.id}><div>{item.name}{item.is_preorder && !item.name.includes('預購') ? '（預購）' : ''}<small>{[item.size, item.variant_id, ...(item.selected_specifications || []).map(spec => [spec.label, spec.value].filter(Boolean).join('：'))].filter(Boolean).join(' · ')} · {item.quantity} 件</small></div><strong>{money(item.price * item.quantity)}</strong></li>)}</ul>
        {selected.review_note && <p className="fs-note">最近核帳備註：{selected.review_note}</p>}
        {audit.find(entry => entry.action === 'note') && <p className="fs-note">最近財務內部備註：{audit.find(entry => entry.action === 'note')?.reason}</p>}
        {detailError && <div className="fs-error" role="alert">{detailError}<p>已保留你填寫的備註，請重新載入訂單後再確認。</p><button disabled={saving || detailLoading} onClick={() => void open(selected, true)}>重新載入訂單</button></div>}
        {detailLoading ? <p role="status">正在確認最新訂單…</p> : editable ? <>
          <div className="fs-action-tabs">{selected.status !== 'approved' && <><button disabled={saving} aria-pressed={action === 'approved'} onClick={() => { setAction('approved'); setReceipt(false) }}>確認入帳</button><button disabled={saving} aria-pressed={action === 'rejected'} onClick={() => setAction('rejected')}>標記待補資料</button></>}<button disabled={saving} aria-pressed={action === 'note'} onClick={() => setAction('note')}>只存備註</button></div>
          <label className="fs-field">{action === 'note' ? '財務備註' : action === 'approved' ? '核對依據' : '需要補充的資料'}<textarea disabled={saving} value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} placeholder={action === 'approved' ? '已核對入帳日期、金額及後五碼。勿填完整銀行帳號。' : '請填寫需補充或再次確認的資料。'} /></label>
          {action === 'approved' && <label className="fs-checkbox"><input type="checkbox" disabled={saving} checked={receipt} onChange={e => setReceipt(e.target.checked)} />我已核實款項實際入帳，且姓名、訂單與金額正確。</label>}
          {action === 'approved' && (!selected.inventory_reserved || selected.total_amount <= 0) && <p className="fs-error">此訂單金額或庫存保留狀態需由管理員檢查，目前不能確認入帳。</p>}
          <p className="fs-note">{action === 'note' ? '備註僅供內部查閱，儲存不會變更入帳或取貨狀態。' : action === 'approved' ? '確認入帳不會更改配貨或領取狀態。' : '儲存後請聯絡學員補充資料；系統不會自動寄送通知。'}</p>
        </> : <p className="fs-message">{selected.status === 'approved' ? '此筆已確認入帳，僅供查閱。' : '此帳號僅供查閱。'}</p>}
        <details className="fs-audit"><summary>核帳紀錄（最近 100 筆）</summary>{audit.length ? <ul>{audit.map(entry => <li key={entry.id}>{date(entry.created_at)} · {entry.action === 'note' ? '儲存備註' : shopFinanceStates[entry.action]}<p>{entry.reason}</p><small>操作人 ID：{entry.actor_id || '帳號已移除'}</small></li>)}</ul> : <p>尚無新核帳紀錄；歷史核對資訊請參考上方備註。</p>}</details>
      </div><footer><span>{saving ? '正在儲存…' : '操作將記錄核帳依據'}</span>{editable && <button className="fs-primary" onClick={() => void review()} disabled={saving || detailLoading || Boolean(detailError) || !reason.trim() || (action === 'approved' && (!receipt || !selected.inventory_reserved || selected.total_amount <= 0))}>{saving ? '處理中…' : action === 'note' ? '儲存備註' : action === 'approved' ? '確認入帳' : '標記待補資料'}</button>}</footer></div>}
    </dialog>
  </section>
}
