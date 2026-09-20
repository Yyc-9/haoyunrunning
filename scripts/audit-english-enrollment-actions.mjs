import assert from 'node:assert/strict'
import { studentActionEnglishCopy } from '../lib/english-student-action-copy.ts'

export async function auditEnrollmentActions({ account, record, scenario, enrollment, followups, id, nid, base, output }) {
  const submit = (page, locator, path, method) => Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === path && r.request().method() === method), locator.click()])
  for (const width of [1440, 375]) {
    scenario.overrides = {}
    const student = await account('student', width)
    await student.goto(base + '/courses/zhubei-night-run-monday/register', { waitUntil: 'domcontentloaded' })
    await student.getByRole('button', { name: 'Next', exact: true }).click()
    for (const checkbox of await student.locator('main input[type="checkbox"]').all()) await checkbox.check()
    await student.getByRole('button', { name: 'Next', exact: true }).click()
    for (const input of await student.locator('main input').all()) {
      const type = await input.getAttribute('type')
      if (type === 'checkbox' || type === 'radio') continue
      await input.fill(type === 'email' ? '' : type === 'tel' ? '0900000000' : 'Language QA')
    }
    for (const textarea of await student.locator('main textarea').all()) await textarea.fill('None')
    await student.getByRole('button', { name: 'Next', exact: true }).click()
    await student.getByText('QA Bank', { exact: true }).waitFor()
    await student.getByPlaceholder('12345', { exact: true }).fill('00123')
    await student.getByLabel('Send to my registration email or Gmail address', { exact: true }).check()
    await student.locator('main textarea').fill('QA 備註保留')
    await student.locator('main input[type="checkbox"]').check()
    for (const [name, message] of [
      ['registration-expired-quote', '課程報價已超過保留時間，請返回匯款步驟重新計算。'],
      ['registration-class-full', '本班目前已額滿，暫時無法建立新的報名記錄。'],
    ]) {
      scenario.registrationError = message
      await submit(student, student.getByRole('button', { name: 'Submit registration and transfer details', exact: true }), '/api/course-enrollments', 'POST')
      await student.getByText(studentActionEnglishCopy[message], { exact: true }).waitFor()
      assert.equal(scenario.submissions.at(-1).registration.notes, 'QA 備註保留')
      assert.equal(scenario.submissions.at(-1).registration.transferLastFive, '00123')
      assert.equal(await student.locator('main textarea').inputValue(), 'QA 備註保留')
      await record(student, `${width}-${name}`)
    }

    Object.assign(enrollment, { status: 'rejected', student_review_message: 'Please confirm the transfer date.' })
    followups.splice(0, followups.length, { id: nid, enrollment_id: id, reason: 'missing_info', student_message: 'Please confirm the transfer date.', internal_note: 'PRIVATE-ONLY', student_reply: null, responded_at: null, created_at: enrollment.created_at, email_status: 'failed', email_error: '郵件發送未確認；站內通知仍有效，可安全重試。' })
    await student.goto(base + `/notifications?enrollment=${id}`, { waitUntil: 'domcontentloaded' })
    await student.getByRole('heading', { name: 'Please provide the following details' }).waitFor().catch(async error => {
      console.log(await student.locator('body').innerText())
      throw error
    })
    assert.ok(!(await student.locator('body').innerText()).includes('PRIVATE-ONLY'))
    const paymentError = '此季度已封存，請聯絡跑班確認款項。'
    scenario.overrides = { 'POST /api/course-enrollments/payment-info': { status: 409, body: { error: paymentError } } }
    await student.getByRole('button', { name: 'View payment instructions', exact: true }).click()
    await student.getByText(studentActionEnglishCopy[paymentError], { exact: true }).waitFor().catch(async error => {
      console.log(await student.locator('body').innerText())
      throw error
    })
    await record(student, `${width}-payment-instructions-archived`)
    await student.getByLabel('Last five digits of the sender’s account').fill('00123')
    await student.getByLabel('Transfer date', { exact: true }).fill('2026-09-19')
    await student.getByLabel('Additional details', { exact: true }).fill('QA 補件原文')
    for (const [name, message] of [
      ['supplement-stale-record', '這筆報名已更新、已完成或季度已封存，請重新整理後再試。'],
      ['supplement-validation', '請填寫有效日期、後五碼與補充說明；勿填完整帳號或身分證號。'],
    ]) {
      scenario.overrides = { 'PATCH /api/enrollment-followups': { status: 409, body: { error: message } } }
      await submit(student, student.getByRole('button', { name: 'Submit for finance review', exact: true }), '/api/enrollment-followups', 'PATCH')
      await student.getByText(studentActionEnglishCopy[message], { exact: true }).waitFor()
      assert.equal(scenario.submissions.at(-1).reply, 'QA 補件原文')
      assert.equal(scenario.submissions.at(-1).lastFive, '00123')
      await record(student, `${width}-${name}`)
      assert.equal(await student.locator('main textarea').inputValue(), 'QA 補件原文')
    }
    await student.screenshot({ path: output + `/${width}-supplement-error.png`, animations: 'disabled' })

    scenario.overrides = {}
    followups[0].responded_at = new Date().toISOString()
    enrollment.status = 'pending_review'
    const admin = await account('admin', width)
    await admin.goto(base + `/notifications?view=staff&enrollment=${id}`, { waitUntil: 'domcontentloaded' })
    await admin.getByLabel('Message to the student').fill('Please confirm the transfer date.')
    for (const [name, message, success] of [
      ['staff-followup-stale', '報名資料已更新，請重新整理。', false],
      ['staff-followup-email-unconfirmed', '補件要求與站內通知已保存；郵件狀態尚未確認，請重新整理後重試寄送。', true],
    ]) {
      scenario.overrides = { 'POST /api/enrollment-followups': { status: success ? 200 : 409, body: { [success ? 'message' : 'error']: message } } }
      await submit(admin, admin.getByRole('button', { name: 'Send notification and email', exact: true }), '/api/enrollment-followups', 'POST')
      await admin.getByText(studentActionEnglishCopy[message], { exact: true }).waitFor()
      await record(admin, `${width}-${name}`)
    }
    const retryMessage = '已重新檢查郵件寄送狀態。'
    followups[0].responded_at = null
    enrollment.status = 'rejected'
    await admin.reload({ waitUntil: 'domcontentloaded' })
    scenario.overrides = { 'POST /api/enrollment-followups': { body: { message: retryMessage } } }
    await submit(admin, admin.getByRole('button', { name: 'Retry email', exact: true }).first(), '/api/enrollment-followups', 'POST')
    await admin.getByText(studentActionEnglishCopy[retryMessage], { exact: true }).waitFor()
    await record(admin, `${width}-staff-email-retry`)
    await admin.screenshot({ path: output + `/${width}-staff-email-retry.png`, animations: 'disabled' })
  }
}
