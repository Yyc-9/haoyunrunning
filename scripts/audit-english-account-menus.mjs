import assert from 'node:assert/strict'

export async function auditAccountMenus({ account, record, scenario, base, output }) {
  for (const width of [1440, 375]) {
    for (const role of ['student', 'coach', 'admin', 'finance']) {
      const page = await account(role, width)
      await page.goto(base, { waitUntil: 'domcontentloaded' })
      const root = width > 768 ? page.locator('[data-account-menu-root]').filter({ visible: true }) : page.locator('#mobile-site-menu')
      if (width > 768) await root.locator('button[aria-haspopup="menu"]').hover()
      else await page.getByRole('button', { name: 'Open menu', exact: true }).click()
      await root.locator('a[href="/profile"]').first().waitFor()
      assert.equal(await root.locator('a[href="/admin"]').count(), role === 'admin' ? 1 : 0)
      assert.equal(await root.locator('a[href="/coach"]').count(), ['coach', 'admin'].includes(role) ? 1 : 0)
      assert.equal(await root.locator('a[href="/finance"]').count(), role === 'finance' ? 1 : 0)
      await record(page, `${width}-${role}-account-menu`)
      const menu = width > 768 ? root.locator(':scope > div') : root
      await menu.screenshot({ path: `${output}/${width}-${role}-menu.png`, animations: 'disabled' })
      await page.keyboard.press('Escape')
      await root.locator('a[href="/profile"]').first().waitFor({ state: 'hidden' })
      await page.goto(base + '/profile', { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Language QA', exact: true }).waitFor()
      const financeCard = page.getByRole('region', { name: 'Finance workspace access', exact: true })
      assert.equal(await financeCard.count(), role === 'finance' ? 1 : 0)
      if (role === 'finance') {
        await financeCard.getByRole('link', { name: 'Open bank reconciliation', exact: true }).waitFor()
        await financeCard.screenshot({ path: `${output}/${width}-finance-profile.png`, animations: 'disabled' })
      }
      await record(page, `${width}-${role}-profile-access`)
      await page.close()
    }
    const page = await account('student', width)
    scenario.overrides['GET /api/notifications'] = { body: { error: '無法讀取通知。' }, status: 503 }
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Notifications are unavailable. Select to retry.', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('alert').waitFor()
    await record(page, `${width}-notification-read-error`)
    delete scenario.overrides['GET /api/notifications']
    await dialog.getByRole('button', { name: 'Refresh', exact: true }).click()
    await dialog.getByRole('button', { name: 'Mark displayed notifications as read', exact: true }).waitFor()
    await record(page, `${width}-notification-read-recovered`)
    scenario.overrides['PATCH /api/notifications'] = { body: { error: '通知清單格式不正確。' }, status: 400 }
    await dialog.getByRole('button', { name: 'Mark displayed notifications as read', exact: true }).click()
    await dialog.getByRole('alert').waitFor()
    await record(page, `${width}-notification-mark-read-error`)
    delete scenario.overrides['PATCH /api/notifications']
    await dialog.getByRole('button', { name: 'Refresh', exact: true }).click()
    await dialog.getByRole('button', { name: 'Mark displayed notifications as read', exact: true }).click()
    await page.getByRole('button', { name: 'Notifications, 0 unread', exact: true }).waitFor({ state: 'attached' })
    await record(page, `${width}-notification-mark-read-recovered`)
    await page.close()
  }
}
