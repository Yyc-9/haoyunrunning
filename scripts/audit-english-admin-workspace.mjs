import assert from 'node:assert/strict'

export async function adminWorkspaceChecks({ page, width, data, record }) {
  data.qaAdminReadGate = true
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByText('Loading administrator workspace…', { exact: true }).waitFor()
  await record(page, `${width}-workspace-loading`)
  data.qaAdminReadGate = false
  assert.equal(typeof data.qaAdminRelease, 'function')
  data.qaAdminRelease()
  await page.getByRole('heading', { name: 'Season overview', exact: true }).waitFor()
  for (const [name, status, message] of [
    ['sign-in-required', 401, '請先登入管理員帳號。'],
    ['permission-denied', 403, '目前帳號沒有管理員權限。'],
    ['service-unavailable', 500, 'Supabase 尚未設定。'],
    ['read-failed', 503, ''],
  ]) {
    data.qaAdminReadError = { status, message }
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Administration access unavailable', exact: true }).waitFor()
    assert.equal(await page.locator('#admin-tab-students').count(), 0)
    assert.equal(await page.locator('.apple-card a').getAttribute('href'), '/')
    await record(page, `${width}-workspace-${name}`)
  }
  delete data.qaAdminReadError
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Season overview', exact: true }).waitFor()
  await record(page, `${width}-workspace-recovered`)
  for (const key of ['students', 'coaches', 'orders', 'courseCapacity', 'courseSeasons', 'seasonSyncSources', 'products', 'paymentAccounts', 'courses', 'coachOptions', 'coachAccounts', 'coachPublicProfiles']) data[key] = []
  data.overview = Object.fromEntries(Object.keys(data.overview).map(key => [key, 0]))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Season overview', exact: true }).waitFor()
  await record(page, `${width}-empty-overview`)
  const nav = page.getByRole('navigation', { name: 'Main administrator navigation' })
  for (const [tab, label] of [['students', 'Student'], ['coaches', 'Coach'], ['seasons', 'Seasons'], ['products', 'Products'], ['paymentAccounts', 'Payment accounts']]) {
    if (width > 768) await page.locator('#admin-tab-' + tab).click()
    else if (['students', 'coaches'].includes(tab)) await nav.getByRole('button', { name: label, exact: true }).click()
    else {
      await nav.getByRole('button', { name: 'More', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: new RegExp('^' + label) }).click()
    }
    await record(page, `${width}-empty-${tab}`)
  }
}
