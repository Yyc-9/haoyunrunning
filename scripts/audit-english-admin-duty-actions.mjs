import assert from 'node:assert/strict'
import { adminActionEnglishCopy } from '../lib/english-admin-action-copy.ts'

export async function adminDutyActions({ page, width, data, record }) {
  const snapshot = name => record(page, `${width}-admin-duty-${name}`)
  const panel = page.locator('details').filter({ has: page.getByRole('heading', { name: 'Coach attendance, leave, and substitutions', exact: true }) }).filter({ visible: true })
  await panel.waitFor()
  const initial = structuredClone(data.qaDutyItems[0])
  const item = () => panel.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Scheduled: Coach QA' }) }).first()
  const refresh = async () => {
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/admin/coach-duty' && r.request().method() === 'GET')
    await panel.getByRole('button', { name: 'Refresh coach attendance', exact: true }).click()
    await response
    await page.waitForTimeout(250)
  }
  const expand = async () => { if (await item().getAttribute('open') === null) await item().locator('summary').click() }
  await expand()
  const action = async (label, submit, error, message, after, name, expectedAction) => {
    await item().getByRole('button', { name: label, exact: true }).click()
    const dialog = page.getByRole('dialog', { name: label, exact: true })
    await dialog.getByRole('textbox').fill('QA 原文原因保留')
    const send = async () => {
      const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/admin/coach-duty' && r.request().method() === 'PATCH')
      await dialog.getByRole('button', { name: submit, exact: true }).click()
      return response
    }
    data.qaDutyResponse = { error }
    assert.equal((await send()).status(), 409)
    await dialog.getByRole('alert').filter({ hasText: adminActionEnglishCopy[error] }).waitFor()
    assert.equal(await dialog.getByRole('textbox').inputValue(), 'QA 原文原因保留')
    assert.equal(data.qaDutySubmission.action, expectedAction)
    if (width === 375) assert.ok(await dialog.getByRole('textbox').evaluate(e => parseFloat(getComputedStyle(e).fontSize) >= 16))
    await snapshot(name + '-error')
    data.qaDutyResponse = { message }; data.qaDutyAfter = after
    assert.equal((await send()).status(), 200)
    await dialog.waitFor({ state: 'hidden' })
    await panel.getByText(adminActionEnglishCopy[message], { exact: true }).waitFor()
    await snapshot(name + '-complete')
    await expand()
  }
  await action('Reject leave', 'Confirm rejection', '請假狀態已被其他操作更新，請重新整理。', '請假已拒絕，原定教練仍為本堂實際教練。', { ...initial, leaveStatus: 'rejected' }, 'reject', 'review_leave')
  data.qaDutyItems = [structuredClone(initial)]; await refresh(); await expand()
  await action('Approve leave', 'Confirm approval', '本堂已停課，不能再核對請假。', '請假已核准；代班仍須完成邀請、接受與最終確認。', { ...initial, leaveStatus: 'approved', actualCoachId: '', actualCoachName: '' }, 'approve', 'review_leave')
  await action('Assign / Change substitute', 'Confirm assignment', '代班帳號目前沒有啟用的教練權限。', '代班邀請已送出，等待代班教練回覆後再由管理員最終確認。', { ...data.qaDutyItems[0], substituteResponse: 'pending' }, 'assign', 'assign_substitute')
  assert.equal(data.qaDutySubmission.substituteCoachId, 'qa-substitute')
  await action('Confirm emergency substitute', 'Confirm emergency coverage', '課次狀態已過期，請重新整理後再處理。', '代班已最終確認；原教練權限已移除，代班教練可簽到並核實學員出席。', { ...data.qaDutyItems[0], actualCoachId: 'qa-substitute', actualCoachName: 'Substitute QA', substituteResponse: 'accepted', adminStatus: 'approved' }, 'emergency', 'confirm_substitute')
  assert.equal(data.qaDutySubmission.emergency, true)
  await action('Finalize substitution', 'Confirm substitute', '代班教練尚未接受邀請，不能最終確認。', '代班已最終確認；原教練權限已移除，代班教練可簽到並核實學員出席。', data.qaDutyItems[0], 'confirm', 'confirm_substitute')
  assert.equal(data.qaDutySubmission.emergency, false)
  await action('Correct attendance manually', 'Save check-in', '出勤狀態已變更，請重新整理。', '出勤狀態已人工修正，操作人、時間與原因已保留。', { ...data.qaDutyItems[0], attendanceState: 'not_checked_in', manualCorrection: true }, 'correct', 'manual_correction')
  for (const [name, change, audit] of [
    ['upcoming', { attendanceState: 'upcoming', leaveStatus: 'none', substituteCoachId: '' }, 'coach_checked_in'],
    ['missing-time', { attendanceState: 'missing_start_time', startTime: '', checkedInAt: '' }, 'admin_recorded_coach_checkin'],
    ['late', { attendanceState: 'late' }, 'attendance_manually_corrected'],
    ['cancelled', { attendanceState: 'cancelled', isCancelled: true }, 'unknown'],
    ['leave-awaiting-substitute', { attendanceState: 'leave_approved', leaveStatus: 'approved', actualCoachId: '', actualCoachName: '', substituteCoachId: '', substituteCoachName: '' }, 'leave_approved'],
    ['direct-pending', { adminStatus: 'not_required', substituteResponse: 'pending' }, 'direct_substitute_invited'],
    ['direct-declined', { adminStatus: 'not_required', substituteResponse: 'rejected' }, 'direct_substitute_rejected'],
    ['direct-active', { adminStatus: 'not_required', substituteResponse: 'accepted', actualCoachId: 'qa-substitute', actualCoachName: 'Substitute QA' }, 'direct_substitute_accepted'],
  ]) {
    data.qaDutyItems = [{ ...initial, ...change }]; data.qaDutyAudit = audit
    await refresh(); await expand(); await snapshot(name)
  }
  data.qaDutyItems = []; await refresh()
  await panel.getByText('No sessions match these filters.', { exact: true }).waitFor()
  await snapshot('empty')
  data.qaDutyReadError = '讀取教練到課管理資料失敗。'; await refresh()
  await panel.getByText(adminActionEnglishCopy[data.qaDutyReadError], { exact: true }).waitFor()
  await snapshot('read-error')
  data.qaDutyReadError = ''; data.qaDutyItems = [initial]; await refresh()
}
