import assert from 'node:assert/strict'

// Called by the isolated coach harness. All actions hit intercepted local APIs.
export async function auditCoachDutyFlows({ open, record, scenario, duty, base, id, writes }) {
  const cases = [
    ['check-in-window-error', {}, 'check_in', { error: '目前不在簽到開放時間內；簽到僅限課前 15 分鐘至開課後 15 分鐘。' }],
    ['check-in-success', {}, 'check_in', { message: '已完成準時簽到。' }],
    ['leave-conflict', {}, 'leave', { error: '本堂已有正在處理或已生效的代班安排。' }],
    ['leave-invited', {}, 'leave', { message: '請假與代班邀請已送出，等待受邀教練回覆。' }],
    ['leave-admin-arranged', {}, 'leave_admin', { message: '請假已送出，等待管理員安排代班。' }],
    ['stale-invitation', { canRespondSubstitute: true }, 'accept', { error: '代班邀請已被處理，請重新整理後確認最新狀態。' }],
    ['substitution-accepted', { canRespondSubstitute: true }, 'accept', { message: '已接受代班邀請；代班已生效，並同步至管理員後台。' }],
    ['admin-substitution-accepted', { canRespondSubstitute: true, adminStatus: 'pending' }, 'accept', { message: '已接受管理員指派的代班邀請，等待管理員最終確認。' }],
    ['substitution-declined', { canRespondSubstitute: true }, 'decline', { message: '已拒絕代班邀請；原教練可以重新邀請其他教練。' }],
    ['admin-substitution-declined', { canRespondSubstitute: true, adminStatus: 'pending' }, 'decline', { message: '已拒絕管理員指派的代班邀請，管理員將重新安排。' }],
    ['admin-manual-entry', { managedByAdmin: true }, 'manual', { message: '已為本堂實際授課教練代登遲到到課。' }],
    ['reinvite', { leaveStatus: 'requested', substituteResponse: 'rejected', substituteCoachName: 'Substitute QA' }, 'reinvite', { message: '請假與代班邀請已送出，等待受邀教練回覆。' }],
    ['refresh-failed', {}, 'check_in', { message: '已完成準時簽到。' }],
    ['upcoming', { attendanceState: 'upcoming', canCheckIn: false }],
    ['missing-time', { attendanceState: 'missing_start_time', startTime: '', checkInOpensAt: '', canCheckIn: false }],
    ['late', { attendanceState: 'late', punctuality: 'late', checkedInAt: duty.startTime, canCheckIn: false }],
    ['substitute-absent', { attendanceState: 'substitute_absent', canCheckIn: false, coachRole: 'substitute' }],
    ['cancelled', { attendanceState: 'cancelled', isCancelled: true, canCheckIn: false, canRequestLeave: false }],
    ['leave-approved', { attendanceState: 'leave_approved', leaveStatus: 'approved', substituteResponse: 'accepted', substituteCoachName: 'Substitute QA', adminStatus: 'approved', canCheckIn: false }],
    ['same-day-classes', {}],
  ]
  for (const width of [1440, 375]) {
    const { ctx, page } = await open(width)
    const submit = async locator => Promise.all([
      page.waitForResponse(response => response.url().endsWith('/api/coach/session-duty') && response.request().method() === 'POST'),
      locator.click(),
    ])
    try {
      for (const [name, changes, action, response] of cases) {
        Object.assign(scenario, { items: [{ ...duty, ...changes }], response, loadError: '', refreshError: name === 'refresh-failed' ? '更新教練到課資料失敗。' : '' })
        if (name === 'same-day-classes') scenario.items.push({ ...duty, id: 'another-session', startTime: new Date(Date.parse(duty.startTime) + 3600000).toISOString() })
        await page.goto(base + '/coach', { waitUntil: 'domcontentloaded' })
        await page.getByRole('button', { name: 'View details', exact: true }).first().click()
        const dialog = page.getByRole('dialog').filter({ visible: true })
        await dialog.waitFor()
        if (action === 'check_in') await submit(dialog.getByRole('button', { name: 'Check in for teaching', exact: true }))
        if (['leave', 'leave_admin', 'reinvite'].includes(action)) {
          const toggle = dialog.getByRole('button', { name: action === 'reinvite' ? /Invite a substitute again/ : /Leave and substitution/ })
          if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
          await dialog.getByPlaceholder('Enter the reason for leave (required)').fill('QA 原因保留')
          if (action !== 'leave_admin') await dialog.locator('select').selectOption(id)
          await submit(dialog.getByRole('button', { name: action === 'reinvite' ? 'Resubmit arrangement' : 'Submit leave request', exact: true }))
          assert.equal(writes.at(-1).body.reason, 'QA 原因保留')
          assert.equal(writes.at(-1).body.invitedSubstituteId, action === 'leave_admin' ? undefined : id)
        }
        if (action === 'accept' || action === 'decline') {
          await dialog.getByRole('button', { name: /Substitution invitation awaiting reply/ }).click()
          await submit(dialog.getByRole('button', { name: action === 'accept' ? 'Accept substitution' : 'Decline substitution', exact: true }))
          assert.equal(writes.at(-1).body.response, action === 'accept' ? 'accepted' : 'rejected')
        }
        if (action === 'manual') {
          await dialog.getByPlaceholder('Explain why this session needs a manual entry (required)').fill('QA manual correction')
          await submit(dialog.getByRole('button', { name: 'Confirm coach attendance', exact: true }))
          assert.equal(writes.at(-1).body.reason, 'QA manual correction')
        }
        if (action) {
          await page.waitForTimeout(700)
          await record(page, `${width}-${name}`)
          // Feedback must be readable while the action dialog is still open.
          const feedback = dialog.getByRole(response.error ? 'alert' : 'status')
          assert.equal(await feedback.count(), 1, `${name}: feedback must be inside the open dialog`)
          assert.doesNotMatch(await feedback.innerText(), /[\u3400-\u9fff]/u)
          await feedback.scrollIntoViewIfNeeded()
          assert.ok(await feedback.isVisible())
        } else {
          if (name === 'same-day-classes') {
            await dialog.getByRole('tab').nth(1).click()
            assert.equal(await dialog.getByRole('tab').nth(1).getAttribute('aria-selected'), 'true')
          }
          await record(page, `${width}-${name}`)
        }
      }
      Object.assign(scenario, { loadError: '目前帳號沒有教練權限。', refreshError: '' })
      await page.goto(base + '/coach', { waitUntil: 'domcontentloaded' })
      await page.getByTestId('coach-workbench').getByRole('alert').waitFor()
      await record(page, `${width}-access-error`)
    } catch (error) {
      const visibleDialog = page.getByRole('dialog').filter({ visible: true })
      console.log((await (await visibleDialog.count() ? visibleDialog : page.locator('body')).innerText()).slice(-7000))
      throw error
    } finally { await ctx.close() }
  }
}
