import assert from 'node:assert/strict'

export async function auditPublicCourses({ account, record, base, output }) {
  for (const width of [1440, 375]) {
    const page = await account('student', width)
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    const cards = page.locator('#courses button[aria-label]')
    await page.locator('#courses').getByRole('button', { name: /^Preview / }).first().waitFor()
    const count = await cards.count()
    assert.ok(count > 0)
    for (let i = 0; i < count; i++) {
      console.log(`Opening course preview ${width}/${i}`)
      await cards.nth(i).click()
      const dialog = page.locator('dialog.home-course-dialog')
      await dialog.waitFor()
      await page.waitForTimeout(400)
      await record(page, `${width}-course-preview-${i}`)
      const href = await dialog.locator('a').getAttribute('href')
      assert.match(href, /^\/courses\/[a-z0-9-]+$/)
      if (i === 0) await dialog.screenshot({ path: `${output}/${width}-preview.png`, animations: 'disabled' })
      await dialog.getByRole('button').click()
      await dialog.waitFor({ state: 'hidden' })
      await dialog.locator('a').waitFor({ state: 'detached' })
    }
    await page.goto(base + '/courses', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'All cities', exact: true }).waitFor()
    const filters = page.locator('.course-filter-deck')
    await filters.waitFor()
    const levels = filters.locator(':scope > div').nth(0).getByRole('button')
    const cities = filters.locator(':scope > div').nth(1).getByRole('button')
    const cityCount = await cities.count()
    const memberships = new Map()
    const visibleCourses = () => page.locator('#courses a[href^="/courses/"]').filter({ visible: true })
    const courseHrefs = () => visibleCourses().evaluateAll(links => links.map(link => link.getAttribute('href')).sort())
    let emptyStates = 0
    for (let level = 0; level < await levels.count(); level++) {
      await levels.nth(level).click()
      for (let city = 0; city < cityCount; city++) {
        await cities.nth(city).click()
        await record(page, `${width}-course-filter-${level}-${city}`)
        assert.equal(await levels.nth(level).getAttribute('aria-pressed'), 'true')
        assert.equal(await cities.nth(city).getAttribute('aria-pressed'), 'true')
        const hrefs = await courseHrefs()
        const reportedCount = Number((await page.locator('#courses [role="status"]').textContent()).match(/\d+/)[0])
        assert.equal(hrefs.length, reportedCount, 'Every counted class must have a visible card')
        memberships.set(`${level}-${city}`, hrefs)
        if (reportedCount === 0) {
          await page.getByRole('heading', { name: 'No classes match your filters', exact: true }).waitFor()
          emptyStates++
          if (emptyStates === 1) await page.locator('#courses').screenshot({ path: `${output}/${width}-empty.png`, animations: 'disabled' })
        }
      }
    }
    assert.ok(emptyStates > 0, 'The audit must reach an empty filter combination')
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
    await page.locator('#courses a[href^="/courses/"]').filter({ visible: true }).first().waitFor()
    assert.equal(await levels.first().getAttribute('aria-pressed'), 'true')
    assert.equal(await cities.first().getAttribute('aria-pressed'), 'true')
    assert.ok(await visibleCourses().count() > 0)
    await record(page, `${width}-course-filters-cleared`)
    if (width < 768) {
      await page.getByRole('button', { name: 'Open menu', exact: true }).click()
      await page.locator('#mobile-site-menu').getByRole('button', { name: 'TC', exact: true }).click()
      await page.getByRole('button', { name: '關閉選單', exact: true }).click()
    } else {
      await page.getByRole('button', { name: 'Language', exact: true }).click()
      await page.getByRole('button', { name: 'Traditional Chinese TC', exact: true }).click()
    }
    await page.getByRole('button', { name: '全部城市', exact: true }).waitFor()
    for (let level = 0; level < await levels.count(); level++) {
      await levels.nth(level).click()
      for (let city = 0; city < cityCount; city++) {
        await cities.nth(city).click()
        await page.waitForTimeout(150)
        assert.deepEqual(await courseHrefs(), memberships.get(`${level}-${city}`), 'Changing language must not change class membership')
      }
    }
    const selectedHrefs = await courseHrefs()
    if (width < 768) {
      await page.getByRole('button', { name: '開啟選單', exact: true }).click()
      await page.locator('#mobile-site-menu').getByRole('button', { name: 'EN', exact: true }).click()
      await page.getByRole('button', { name: 'Close menu', exact: true }).click()
    } else {
      await page.getByRole('button', { name: '語言', exact: true }).click()
      await page.getByRole('button', { name: 'English EN', exact: true }).click()
    }
    await page.getByRole('button', { name: 'All cities', exact: true }).waitFor()
    assert.deepEqual(await courseHrefs(), selectedHrefs)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'All cities', exact: true }).waitFor()
    await page.waitForTimeout(400)
    assert.equal(await levels.last().getAttribute('aria-pressed'), 'true')
    assert.equal(await cities.last().getAttribute('aria-pressed'), 'true')
    assert.deepEqual(await courseHrefs(), selectedHrefs, 'Reload must preserve the selected filters')
    await record(page, `${width}-course-language-and-reload`)
    await page.close()
  }
}
