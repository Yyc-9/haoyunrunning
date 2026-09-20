import assert from 'node:assert/strict'
import { studentActionEnglishCopy } from '../lib/english-student-action-copy.ts'

export async function auditStudentActions({ context, record, scenario, attendance, id, base, writes, futureDate }) {
  const endpoint = '/api/student/attendance'
  const leave = { id: 'leave', enrollment_id: id, original_course_season_course_id: id, original_session_date: futureDate(1), status: 'leave_requested' }
  const scheduled = { ...leave, status: 'scheduled', target_course_season_course_id: 'makeup-class', target_session_date: futureDate(2) }
  const cases = [
    ['leave-cancelled-class', 'leave', [], '本堂已經停課，不需要另行請假。'],
    ['leave-stale-session', 'leave', [], '目前只能為最近一堂尚未開始的課程請假。'],
    ['leave-success', 'leave', [], '請假已送出，你可以選擇原課次之後、本季度內其他班級的可用課次補課。', true],
    ['makeup-full', 'makeup', [leave], '這一堂已達班級名額上限，請選擇其他補課課次。'],
    ['makeup-cancelled-class', 'makeup', [leave], '這一堂目前停課，請選擇其他補課課次。'],
    ['makeup-cancel-started', 'cancel_makeup', [scheduled], '補課課次已開始，無法再取消或更換。'],
    ['makeup-cancel-success', 'cancel_makeup', [scheduled], '已取消原補課安排，可以重新選擇其他課次。', true],
    ['leave-cancel-confirmed', 'cancel_leave', [leave], '本堂點名或補課已經確認，無法取消請假。'],
    ['leave-cancel-success', 'cancel_leave', [leave], '請假已取消，本堂恢復為待點名。', true],
  ]
  for (const width of [1440, 375]) {
    const { ctx, page } = await context(width)
    const submit = async (locator, path) => Promise.all([page.waitForResponse(r => new URL(r.url()).pathname === path && r.request().method() !== 'GET'), locator.click()])
    try {
      scenario.overrides = {}
      await page.goto(base + '/student', { waitUntil: 'domcontentloaded' })
      const storedFeedback = page.locator('[data-training-feedback]')
      await storedFeedback.waitFor()
      assert.ok((await storedFeedback.innerText()).includes('Sleep quality: Very good'))
      assert.ok((await storedFeedback.innerText()).includes('Notes: Keep original note'))
      assert.doesNotMatch(await storedFeedback.innerText(), /[\u3400-\u9fff]/u)
      await page.getByText('Choose image', { exact: true }).waitFor()
      await page.locator('input[type="file"]').setInputFiles({ name: '跑步紀錄.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=', 'base64') })
      assert.equal(await page.getByText('跑步紀錄.png', { exact: true }).getAttribute('translate'), 'no')
      await record(page, `${width}-stored-feedback-and-file-control`)
      for (const [name, action, makeups, message, success] of cases) {
        attendance.makeups = structuredClone(makeups)
        scenario.overrides = { ['POST ' + endpoint]: { body: { [success ? 'message' : 'error']: message }, status: success ? 200 : 409 } }
        await page.goto(base + '/profile?languageAudit=' + name + '#attendance-overview', { waitUntil: 'domcontentloaded' })
        const panel = page.locator('#attendance')
        await panel.getByRole('heading', { name: 'My attendance record', exact: true }).waitFor()
        if (action === 'makeup') {
          await panel.getByRole('button', { name: 'Choose makeup session', exact: true }).click()
          await panel.locator('select').last().selectOption({ index: 1 })
          await submit(panel.getByRole('button', { name: 'Confirm makeup session', exact: true }), endpoint)
          assert.equal(writes.at(-1).body.targetCourseSeasonCourseId, 'makeup-class')
        } else {
          const label = action === 'leave' ? 'On leave' : action === 'cancel_leave' ? 'Cancel leave' : 'Cancel makeup session'
          await submit(panel.getByRole('button', { name: label, exact: true }).first(), endpoint)
        }
        const feedback = panel.getByText(studentActionEnglishCopy[message], { exact: true })
        await feedback.waitFor()
        await feedback.scrollIntoViewIfNeeded()
        await record(page, `${width}-${name}`)
      }
      attendance.makeups = []
      for (const [name, path, action, message] of [
        ['feedback-owner-error', '/student', 'feedback', '這份課表不屬於目前學員，不能提交回饋。'],
        ['feedback-rpe-error', '/student', 'feedback', 'RPE 必須在 1 到 10 之間。'],
        ['profile-tax-error', '/profile/edit', 'profile', '統一編號必須是 8 位數字。'],
        ['profile-carrier-error', '/profile/edit', 'profile', '手機條碼載具格式應為「/」加 7 位英數字。'],
        ['training-access-error', '/student', 'load', '請先完成匯款並回報後五碼；財務確認入帳後將自動開通課表。'],
        ['attendance-access-error', '/profile#attendance-overview', 'attendance_load', '找不到你的本季度課程資格。'],
      ]) {
        const api = action === 'feedback' ? '/api/student/training-feedback' : action === 'profile' ? '/api/account/me' : action === 'load' ? '/api/student/training-plans' : endpoint
        const method = action === 'profile' ? 'PATCH' : action === 'feedback' ? 'POST' : 'GET'
        scenario.overrides = { [method + ' ' + api]: { body: { error: message }, status: 409 } }
        await page.goto(base + path, { waitUntil: 'domcontentloaded' })
        if (action === 'feedback') {
          await page.getByLabel('Sleep quality').selectOption({ label: 'Very good' })
          await submit(page.getByRole('button', { name: 'Submit to coach', exact: true }), api)
          assert.ok(writes.at(-1).body.feeling.includes('睡眠質量：很好'))
        }
        if (action === 'profile') {
          await page.getByPlaceholder('What should other runners call you?').fill('QA 草稿保留')
          await submit(page.getByRole('button', { name: 'Save and view profile', exact: true }), api)
          assert.equal(await page.getByPlaceholder('What should other runners call you?').inputValue(), 'QA 草稿保留')
        }
        await page.getByText(studentActionEnglishCopy[message], { exact: action !== 'load' }).first().waitFor()
        await record(page, `${width}-${name}`)
      }
    } finally { await ctx.close() }
  }
}
