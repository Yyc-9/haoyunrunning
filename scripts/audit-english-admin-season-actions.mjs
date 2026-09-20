import assert from 'node:assert/strict'
import { nextCourseSeasonIdentity } from '../lib/course-seasons.ts'
import { adminActionEnglishCopy } from '../lib/english-admin-action-copy.ts'
import { applyContentAction } from './audit-english-content-flows.mjs'

export function applyAdminSeasonAction(data, body) {
  const season = data.courseSeasons.find(s => s.id === body.seasonId)
  if (body.action === 'create_next_course_season') {
    const source = data.courseSeasons.find(s => s.id === body.sourceSeasonId)
    data.courseSeasons.push({ ...structuredClone(source), ...nextCourseSeasonIdentity(source.code), id: 'qa-next-season', isCurrent: false, status: 'draft' })
  } else if (body.action === 'create_season_course') {
    season.courseOverrides['qa-new-class'] = { ...structuredClone(data.courseSeasons[0].courseOverrides[body.templateSlug]), name: body.name, active: false, templateSlug: body.templateSlug }
    season.courseBillingConfigs['qa-new-class'] = structuredClone(data.courseSeasons[0].courseBillingConfigs[body.templateSlug])
    season.courseCapacities['qa-new-class'] = 30
  } else if (body.action === 'duplicate_season_course') {
    season.courseOverrides['qa-class-copy'] = { ...structuredClone(season.courseOverrides[body.courseSlug]), name: season.courseOverrides[body.courseSlug].name + '（複本）', active: false }
    season.courseBillingConfigs['qa-class-copy'] = structuredClone(season.courseBillingConfigs[body.courseSlug])
    season.courseCapacities['qa-class-copy'] = 30
  } else if (body.action === 'delete_season_course') {
    delete season.courseOverrides[body.courseSlug]
    delete season.courseBillingConfigs[body.courseSlug]
    delete season.courseCapacities[body.courseSlug]
  } else if (body.action === 'delete_course_season') {
    data.courseSeasons = data.courseSeasons.filter(s => s.id !== body.seasonId)
  } else if (body.action === 'activate_course_season') {
    assert.ok(Object.values(season.courseOverrides).some(c => c.active !== false))
    for (const s of data.courseSeasons) s.isCurrent = s === season
    season.status = 'enrolling'
  } else if (body.action === 'update_course_season_status') {
    season.status = body.status
  } else if (body.action === 'save_season_course') {
    applyContentAction(data, body)
  } else throw Error('Unmocked administrator action: ' + body.action)
}

export async function adminSeasonActions({ page, width, data, record }) {
  if (width > 768) await page.locator('#admin-tab-seasons').click()
  else {
    await page.getByRole('navigation', { name: 'Main administrator navigation' }).getByRole('button', { name: 'More', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^Seasons/ }).click()
  }
  await page.getByRole('tab', { name: 'Season settings', exact: true }).click()
  const panel = page.locator('#admin-content-panel')
  const original = structuredClone(data.courseSeasons[0])
  const snapshot = name => record(page, width + '-action-' + name)
  const act = async (trigger, source, success, name, expected, confirmation = false) => {
    data.qaActionResponse = { [success ? 'message' : 'error']: source }
    const event = confirmation ? page.waitForEvent('dialog').then(async dialog => {
      assert.equal(dialog.type(), 'confirm')
      assert.doesNotMatch(dialog.message(), /[\u3400-\u9fff]/u)
      await dialog.accept()
    }) : Promise.resolve()
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/admin' && r.request().method() === 'PATCH')
    await trigger(); await event
    assert.equal((await response).status(), success ? 200 : 409)
    await page.getByText(expected || adminActionEnglishCopy[source], { exact: true }).filter({ visible: true }).first().waitFor()
    await snapshot(name)
  }
  const button = name => () => panel.getByRole('button', { name, exact: true }).click()
  const seasonRow = name => panel.locator('article').filter({ has: page.getByRole('heading', { name, exact: true }) })
  await snapshot('season-settings')
  await panel.getByLabel('Source season to duplicate', { exact: false }).selectOption('empty-season')
  await act(button('Duplicate into next season'), '2027 第三季 已經存在，請直接切換管理。', false, 'next-season-exists', '2027 Q3 already exists. Select it to manage it.')
  assert.equal(data.courseSeasons.length, 4)
  await act(button('Duplicate into next season'), '2027 第三季 已建立為草稿，來源季度資料仍完整保留。', true, 'next-season-created', '2027 Q3 created as a draft. All source-season records are retained.')
  assert.equal(data.courseSeasons.at(-1).name, '2027 第三季')
  assert.deepEqual(data.courseSeasons[0], original)
  await act(() => seasonRow('2027 Q2').getByRole('button', { name: 'Delete 2027 Q2', exact: true }).click(), '季度刪除功能尚待資料庫更新，請稍後再試；目前未刪除任何資料。', false, 'delete-season-error', undefined, true)
  await act(() => seasonRow('2027 Q2').getByRole('button', { name: 'Delete 2027 Q2', exact: true }).click(), '空白季度及其課程設定已刪除，其他季度與歷史資料不受影響。', true, 'delete-season-complete', undefined, true)
  assert.ok(!data.courseSeasons.some(s => s.id === 'empty-season'))
  await seasonRow('2027 Q3').getByRole('button', { name: 'Manage season classes', exact: true }).click()
  await panel.getByRole('button', { name: 'Add', exact: true }).click()
  await panel.getByLabel('New class name', { exact: false }).fill('QA Training Class')
  await act(button('Create class'), '新增季度課程失敗。', false, 'create-class-error')
  assert.equal(await panel.getByLabel('New class name', { exact: false }).inputValue(), 'QA Training Class')
  await act(button('Create class'), '已新增「QA Training Class」；完成日期、教練與計價後再開啟對外顯示。', true, 'create-class-complete', 'QA Training Class added. Set dates, coaches and pricing before publishing it.')
  assert.equal(data.courseSeasons.at(-1).courseOverrides['qa-new-class'].active, false)
  await act(button('Copy'), '複製課程失敗。', false, 'duplicate-class-error')
  await act(button('Copy'), '課程複本已建立；完成設定前不會顯示於前台。', true, 'duplicate-class-complete')
  await panel.getByLabel('Classes in this season', { exact: false }).selectOption('qa-class-copy')
  assert.equal(await panel.getByLabel('Class name', { exact: false }).inputValue(), 'QA Training Class（複本）')
  await snapshot('duplicate-class-name')
  await act(button('Delete'), '這門課已有報名、點名、停課或補課資料，不能刪除；請改為關閉對外顯示。', false, 'delete-class-protected', undefined, true)
  await act(button('Delete'), '空白課程已移除，其他季度與既有資料不受影響。', true, 'delete-class-complete', undefined, true)
  assert.ok(!data.courseSeasons.at(-1).courseOverrides['qa-class-copy'])
  await panel.getByLabel('Show this class publicly', { exact: false }).check()
  await act(button('Save season class'), '已儲存到這一季；若為當前招生季度，前台也已同步。', true, 'class-ready')
  await panel.getByRole('button', { name: 'Back to seasons', exact: true }).click()
  await act(() => seasonRow('2027 Q3').getByRole('button', { name: 'Publish for enrollment', exact: true }).click(), '還有 2 門對外課程未完成實際收費課次，不能切換前台招生。', false, 'activate-incomplete', '2 public courses have incomplete billable sessions. Public enrollment cannot switch yet.', true)
  await act(() => seasonRow('2027 Q3').getByRole('button', { name: 'Publish for enrollment', exact: true }).click(), '前台訓練課程、日程表與報名頁已切換到新季度。', true, 'activate-complete', undefined, true)
  assert.equal(data.courseSeasons.find(s => s.isCurrent).id, 'qa-next-season')
  await act(() => page.getByLabel('Update 2026 Q4 status', { exact: false }).selectOption('archived'), '無法停止季度同步，尚未封存。', false, 'archive-error')
  assert.notEqual(data.courseSeasons[0].status, 'archived')
  await act(() => page.getByLabel('Update 2026 Q4 status', { exact: false }).selectOption('archived'), '季度狀態已更新，報名資料不會被刪除。', true, 'archive-complete')
  assert.equal(data.courseSeasons[0].status, 'archived')
  assert.equal(data.courseSeasons[0].registrationCount, original.registrationCount)
  await act(() => page.getByLabel('Update 2027 Q1 status', { exact: false }).selectOption('active'), '季度狀態已更新，報名資料不會被刪除。', true, 'status-active')
}
