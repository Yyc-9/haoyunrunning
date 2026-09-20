import assert from 'node:assert/strict'
import { adminActionEnglishCopy } from '../lib/english-admin-action-copy.ts'
import { financeEnglishCopy } from '../lib/english-finance-copy.ts'
import { adminDutyActions } from './audit-english-admin-duty-actions.mjs'

export function prepareAccountFixture(data) {
  const base = data.coachAccounts[0]
  for (const [id, name, status, registered, emailConfirmed, role] of [
    ['qa-waiting', 'Waiting Coach QA', 'pending', false, false, 'student'],
    ['qa-unverified', 'Unverified Coach QA', 'pending', true, false, 'student'],
    ['qa-ready', 'Ready Coach QA', 'pending', true, true, 'coach'],
    ['qa-admin', 'Admin Coach QA', 'enabled', true, true, 'admin'],
    ['legacy:qa', 'Legacy Coach QA', 'enabled', null, false, 'coach'],
  ]) data.coachAccounts.push({ ...base, id, name, status, registered, emailConfirmed, role, profileId: id, email: `${id.replace(':', '-')}@example.invalid`, publicCoachKey: '', boundStudentCount: 0, courses: '' })
  const info = { bankName: 'QA Bank', bankCode: '000', accountNumber: '00000000', qrCodeUrl: 'https://example.invalid/old-qr.png', useLegacyQr: false }
  data.qaPayment = { info, config: info, version: 'qa-original' }
}

export function applyAdminAccountAction(data, body) {
  if (body.action === 'register_coach_account') {
    assert.equal(body.coachKey, 'qa-new')
    assert.equal(body.verificationEmail, 'newcoach@example.invalid')
    data.coachAccounts.push({ ...data.coachAccounts[0], id: 'qa-new-account', name: 'New Coach QA', coachKey: body.coachKey, email: body.verificationEmail, status: 'pending', registered: false, emailConfirmed: false, profileId: null, publicCoachKey: '', boundStudentCount: 0, courses: '' })
  } else if (body.action === 'set_coach_account_status') {
    const account = data.coachAccounts.find(a => a.id === body.allowlistId)
    assert.ok(account)
    account.status = body.enabled ? 'enabled' : 'disabled'
  } else if (body.action === 'link_coach_public_profile') {
    const account = data.coachAccounts.find(a => a.profileId === body.userId)
    assert.ok(account)
    account.publicCoachKey = body.coachKey
  } else if (body.action === 'create_payment_account') {
    assert.equal(body.accountNumber, '000012345678')
    assert.equal(body.bankCode, '007')
    assert.equal(body.weight, 2)
    data.paymentAccounts.push({ id: 'qa-new-payment', label: body.label, account_name: body.accountName, bank_name: body.bankName, bank_code: body.bankCode, account_number: body.accountNumber, weight: body.weight, active: true, created_at: new Date().toISOString(), last_assigned_at: null })
  } else if (body.action === 'toggle_payment_account') {
    const account = data.paymentAccounts.find(a => a.id === body.accountId)
    assert.ok(account)
    account.active = body.active
  } else throw Error('Unexpected account action: ' + body.action)
}

export async function adminAccountActions({ page, width, data, record }) {
  const mobile = width < 768
  const nav = page.getByRole('navigation', { name: 'Main administrator navigation' })
  const snapshot = name => record(page, `${width}-account-${name}`)
  const section = name => page.locator('article').filter({ has: page.getByRole('heading', { name, exact: true }) }).filter({ visible: true })
  const visibleText = text => page.getByText(text, { exact: true }).filter({ visible: true }).first()
  async function act(trigger, source, success, name) {
    data.qaAccountResponse = { [success ? 'message' : 'error']: source }
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/admin' && r.request().method() === 'PATCH')
    await trigger()
    assert.equal((await response).status(), success ? 200 : 409)
    await visibleText(adminActionEnglishCopy[source]).waitFor()
    await snapshot(name)
  }
  if (mobile) await nav.getByRole('button', { name: 'Coach', exact: true }).click()
  else await page.locator('#admin-tab-coaches').click()
  await visibleText('Coach account registration').waitFor()
  await adminDutyActions({ page, width, data, record })
  await snapshot('coach-states')
  const register = page.getByRole('button', { name: 'Register coach account', exact: true }).filter({ visible: true })
  const profile = mobile ? page.locator('.admin-mobile-form select').first() : page.getByLabel('Choose a public coach profile to register', { exact: true })
  const email = page.getByPlaceholder('Coach sign-in email', { exact: true }).filter({ visible: true })
  await profile.selectOption('qa-new')
  await email.fill('newcoach@example.invalid')
  await act(() => register.click(), '教練信箱或公開身份已連結其他帳號，未套用這次變更。', false, 'register-conflict')
  assert.equal(await email.inputValue(), 'newcoach@example.invalid')
  await act(() => register.click(), '已登記教練信箱；待教練首次登入並完成信箱驗證後啟用。', true, 'register-pending')
  assert.equal(await email.inputValue(), '')
  await section('New Coach QA').waitFor()
  await act(() => section('Coach QA').getByRole('button', { name: 'Disable coach account', exact: true }).click(), '教練帳號操作失敗。', false, 'disable-error')
  assert.equal(data.coachAccounts[0].status, 'enabled')
  await act(() => section('Coach QA').getByRole('button', { name: 'Disable coach account', exact: true }).click(), '教練帳號已停用，之後登入不會自動恢復。', true, 'disabled')
  await act(() => section('Coach QA').getByRole('button', { name: 'Re-enable', exact: true }).click(), '此信箱尚未完成驗證，完成驗證後才能啟用教練帳號。', false, 'enable-error')
  await act(() => section('Coach QA').getByRole('button', { name: 'Re-enable', exact: true }).click(), '教練帳號已重新啟用；若尚未完成信箱驗證，會保持待啟用。', true, 'enabled')
  if (!mobile) {
    const linked = section('Coach QA').getByRole('combobox')
    await act(() => linked.selectOption('qa-new'), '這份公開教練資料已經連結其他帳號，未套用這次變更。', false, 'link-conflict')
    await act(() => linked.selectOption(''), '已解除公開教練資料連結。', true, 'unlinked')
    await act(() => linked.selectOption('qa-coach'), '教練帳號與公開資料已連結。', true, 'linked')
    await act(() => section('Ready Coach QA').getByRole('button', { name: 'Check and enable', exact: true }).click(), '教練帳號已重新啟用；若尚未完成信箱驗證，會保持待啟用。', true, 'pending-activated')
    await page.getByLabel('Filter coach account status', { exact: true }).selectOption('disabled')
  } else await page.getByRole('tablist', { name: 'Coach account status filter' }).getByRole('tab', { name: 'Disabled', exact: true }).click()
  await visibleText('No coach accounts match these filters.').waitFor()
  await snapshot('empty-filter')
  if (mobile) { await nav.getByRole('button', { name: 'More', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: /^Payment accounts/ }).click() }
  else await page.locator('#admin-tab-paymentAccounts').click()
  const payment = page.getByRole('region', { name: 'Customer transfer details settings', exact: true }).filter({ visible: true })
  await payment.getByRole('textbox').first().waitFor()
  await snapshot('payment-display')
  const bank = payment.getByRole('textbox').nth(0), code = payment.getByRole('textbox').nth(1), number = payment.getByRole('textbox').nth(2), qr = payment.getByRole('textbox').nth(3)
  const save = payment.getByRole('button', { name: 'Save and publish transfer details', exact: true })
  const confirmation = payment.getByRole('checkbox')
  await bank.fill('QA Updated Bank')
  assert.equal(await qr.inputValue(), '')
  assert.equal(await save.isDisabled(), true)
  await code.fill('007'); await number.fill('000012345678'); await confirmation.check()
  const publish = async (source, success, name, expected) => {
    data.qaPaymentResponse = { [success ? 'message' : 'error']: source }
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/admin/payment-info' && r.request().method() === 'PATCH')
    await save.click(); assert.equal((await response).status(), success ? 200 : 409)
    await payment.getByText(expected || financeEnglishCopy[source], { exact: true }).waitFor()
    await snapshot(name)
    assert.equal(data.qaPaymentSubmission.info.accountNumber, '000012345678')
    assert.equal(data.qaPaymentSubmission.info.bankCode, '007')
  }
  await publish('另一位管理員已更新資料，請重新讀取後再修改。', false, 'publish-conflict')
  assert.equal(await bank.inputValue(), 'QA Updated Bank')
  await publish('請填寫銀行名稱、三位銀行代碼與 6 至 24 位數字帳號。', false, 'publish-bank-validation')
  await publish('二維碼圖片請使用 HTTPS 網址，或留空不顯示。', false, 'publish-qr-validation')
  await publish('收款資料已儲存，但重新讀取失敗；請重新讀取確認，不必重複發布。', false, 'publish-readback-failed')
  await publish('已發布至課程報名與商城結帳頁。', true, 'published')
  assert.equal(await save.isDisabled(), true)
  await bank.fill('QA unsaved bank')
  const dialog = page.waitForEvent('dialog').then(async d => { assert.equal(d.message(), 'Reloading will discard unsaved payment details. Continue?'); await d.dismiss() })
  await payment.getByRole('button', { name: 'Reload', exact: true }).click(); await dialog
  assert.equal(await bank.inputValue(), 'QA unsaved bank')
  await snapshot('reload-cancelled')
  const accept = page.waitForEvent('dialog').then(async d => d.accept())
  data.qaPaymentReadError = '收款資料讀取失敗，請稍後重試。'
  await payment.getByRole('button', { name: 'Reload', exact: true }).click(); await accept
  await payment.getByRole('alert').waitFor()
  await snapshot('reload-error')
  data.qaPaymentReadError = ''
  const retry = page.waitForEvent('dialog').then(async d => d.accept())
  await payment.getByRole('button', { name: 'Reload', exact: true }).click(); await retry
  await page.waitForFunction(() => [...document.querySelectorAll('input')].some(i => i.value === 'QA Updated Bank'))
  await snapshot('reloaded')
  if (mobile) await page.getByRole('button', { name: '+ Add payment account', exact: true }).click()
  const form = mobile ? page.getByRole('dialog', { name: 'Add payment account', exact: true }) : page.locator('.apple-card').filter({ has: page.getByRole('heading', { name: 'Add payment account', exact: true }) }).filter({ visible: true })
  for (const [i, value] of ['QA New Channel', 'QA Holder', 'QA Bank', '007', '000012345678', '2'].entries()) await form.getByRole('textbox').nth(i).fill(value)
  const create = form.getByRole('button', { name: mobile ? 'Create Account' : 'Add account', exact: true })
  await act(() => create.click(), '新增收款帳戶失敗。', false, 'payment-create-error')
  assert.equal(await form.getByRole('textbox').nth(4).inputValue(), '000012345678')
  if (mobile) assert.equal(await form.getByRole('alert').count(), 1, 'Payment creation errors must be inside the open dialog')
  if (mobile) {
    assert.equal(await form.getByRole('alert').evaluate(e => e === document.activeElement), true)
    const small = await form.getByRole('textbox').evaluateAll(fields => fields.filter(f => parseFloat(getComputedStyle(f).fontSize) < 16).map(f => getComputedStyle(f).fontSize))
    assert.deepEqual(small, [])
  }
  await act(() => create.click(), '收款帳戶已新增。', true, 'payment-created')
  if (mobile) await form.waitFor({ state: 'hidden' })
  await act(() => section('QA New Channel').getByRole('button', { name: 'Disable', exact: true }).click(), '更新收款帳戶失敗。', false, 'payment-disable-error')
  await act(() => section('QA New Channel').getByRole('button', { name: 'Disable', exact: true }).click(), '收款帳戶已停用。', true, 'payment-disabled')
  await act(() => section('QA New Channel').getByRole('button', { name: 'Enable', exact: true }).click(), '收款帳戶已啟用。', true, 'payment-enabled')
  if (mobile) await nav.getByRole('button', { name: 'Coach', exact: true }).click()
  else await page.locator('#admin-tab-coaches').click()
  data.qaPaymentReadError = '只有超級管理員可修改對外匯款資料。'
  if (mobile) { await nav.getByRole('button', { name: 'More', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: /^Payment accounts/ }).click() }
  else await page.locator('#admin-tab-paymentAccounts').click()
  await payment.getByText(financeEnglishCopy[data.qaPaymentReadError], { exact: true }).waitFor()
  assert.equal(await payment.getByRole('textbox').count(), 0)
  await snapshot('payment-access-denied')
  data.qaPaymentReadError = ''
  await payment.getByRole('button', { name: 'Reload', exact: true }).click()
  await payment.getByRole('textbox').first().waitFor()
  if (mobile) assert.deepEqual(await payment.getByRole('textbox').evaluateAll(fields => fields.filter(f => parseFloat(getComputedStyle(f).fontSize) < 16).map(f => getComputedStyle(f).fontSize)), [])
  await snapshot('payment-access-recovered')
}
