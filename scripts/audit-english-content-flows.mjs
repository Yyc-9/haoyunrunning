// Imported by the local administrator audit; all mutations stay in its synthetic fixture.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sections = { hero_slides: 'heroSlides', home_activities: 'activities', brand_content: 'brand', home_content: 'home', about_content: 'about', courses_page_content: 'coursesPage', testimonials_content: 'testimonials', team_content: 'team', achievements_content: 'achievements', anniversary_content: 'anniversary', page_media: 'pageMedia' }
export function prepareContentFixture(data) {
  const course = data.courses[0], coachKey = Object.keys(data.siteContent.coachProfiles)[0]
  Object.assign(course, { weekday: '週一', period: '10/5 - 12/28', classTime: '19:00–20:30', coachKeys: [coachKey] })
  for (const season of data.courseSeasons) {
    season.courseOverrides = { [course.slug]: { ...course, active: true, startTime: '19:00' } }
    season.courseBillingConfigs = { [course.slug]: { scheduleReady: true, sessionDates: ['2026-10-05', '2026-10-12'], returningFullPrice: 600, newFullPrice: 700, returningLateRate: 300, referredLateRate: 320, standardLateRate: 350, regularUntilSessionNumber: 2, priceLockHours: 24, regularCutoffConfigured: true } }
  }
  data.courseSeasons.push({ ...structuredClone(data.courseSeasons[0]), id: 'draft-season', name: '2027 Q1', code: '2027-Q1', status: 'draft', isCurrent: false, registrationCount: 0, approvedCount: 0, pendingReviewCount: 0 })
  data.courseSeasons.push({ ...structuredClone(data.courseSeasons[2]), id: 'empty-season', name: '2027 Q2', code: '2027-Q2', courseOverrides: {}, courseBillingConfigs: {}, courseCapacities: {} })
}
export function applyContentAction(data, body) {
  if (['save_site_content', 'save_site_contents'].includes(body.action)) {
    for (const { section, value } of body.entries ?? [body]) { assert.ok(sections[section], `Unknown section: ${section}`); data.siteContent[sections[section]] = value }
  }
  if (body.action === 'save_coach_public_profile') data.siteContent.coachProfiles[body.coachKey] = body.value
  const season = data.courseSeasons.find(s => s.id === body.seasonId)
  if (body.action === 'save_season_course') {
    assert.equal(body.value.weekday, '週一', 'English labels must not change stored weekday values')
    assert.equal(body.value.timeZone ?? 'Asia/Taipei', 'Asia/Taipei')
    season.courseOverrides[body.courseSlug] = body.value
    season.courseCapacities[body.courseSlug] = body.capacity
    season.courseBillingConfigs[body.courseSlug] = body.billingConfig
  }
}
export async function contentChecks({ page, width, data, record }) {
  const visit = async (tab, label) => {
    if (width > 768) await page.locator('#admin-tab-' + tab).click()
    else { await page.getByRole('navigation', { name: 'Main administrator navigation' }).getByRole('button', { name: 'More', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: new RegExp('^' + label) }).click() }
  }
  const panel = page.locator('#admin-content-panel')
  const mode = async label => { await page.locator('button[aria-controls="admin-content-panel"]:visible').filter({ hasText: new RegExp('^' + label) }).first().click(); await page.waitForTimeout(300) }
  const snapshot = name => record(page, width + '-content-' + name)
  const act = async button => { const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/admin' && r.request().method() === 'PATCH'); await button.click(); assert.equal((await response).status(), 200); await page.waitForTimeout(600) }
  const crop = async (button, name) => {
    const choosing = page.waitForEvent('filechooser'); await button.click(); const chooser = await choosing
    await chooser.setFiles({ name: 'qa-content.jpg', mimeType: 'image/jpeg', buffer: await readFile(new URL('../public/goodluck-running-vest.jpg', import.meta.url)) })
    const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true }); await dialog.waitFor(); await snapshot(name)
    if (name === 'hero-crop') {
      data.qaImageFailure = true
      await dialog.getByRole('button', { name: 'Apply crop and upload', exact: true }).click()
      await dialog.getByText('Image upload failed.', { exact: true }).waitFor(); await snapshot('image-upload-error')
      data.qaImageFailure = false
    }
    await dialog.getByRole('button', { name: 'Apply crop and upload', exact: true }).click(); await dialog.waitFor({ state: 'hidden' })
  }
  await visit('content', 'Site content'); await snapshot('overview')
  const contentModes = [['Homepage slideshow', 'hero'], ['Homepage copy', 'home'], ['Event links', 'activities'], ['Training schedule page', 'schedule'], ['Team and coach photos', 'team'], ['Brand and contact', 'brand'], ['Shop and anniversary', 'media'], ['About', 'about'], ['Student', 'testimonials'], ['Achievement', 'achievements'], ['Anniversary event', 'anniversary']]
  for (const [label, key] of process.env.LANGUAGE_ADMIN_SECTION === 'seasons' ? [] : contentModes) {
    await mode(label); await snapshot(key)
    if (key === 'hero') {
      await crop(panel.getByRole('button', { name: 'Add slideshow image', exact: true }), 'hero-crop')
      await act(panel.getByRole('button', { name: 'Save slideshow', exact: true })); assert.equal(data.siteContent.heroSlides.at(-1), '/goodluck-running-vest-black.jpg')
    } else if (key === 'team') {
      const details = panel.locator('#admin-coach-photos details').first(); await details.locator('summary').click(); await snapshot('coach-profile')
      const input = details.getByRole('textbox', { name: 'Public name', exact: true }), before = await input.inputValue()
      await input.fill(before + ' QA'); await act(details.getByRole('button', { name: 'Save and publish coach profile', exact: true }))
      assert.ok(Object.values(data.siteContent.coachProfiles).some(p => p.displayName === before + ' QA'))
      await input.fill(before); await act(details.getByRole('button', { name: 'Save and publish coach profile', exact: true }))
      await crop(details.getByRole('button', { name: 'Upload and crop avatar', exact: true }), 'avatar-crop')
      await details.getByRole('button', { name: 'Restore saved version', exact: true }).click()
    } else {
      if (key === 'testimonials') {
        data.qaVideoFailure = true
        await panel.locator('input[type="file"][accept^="video/"]').setInputFiles({ name: 'qa-video.mp4', mimeType: 'video/mp4', buffer: Buffer.from('synthetic video upload failure') })
        await panel.getByText('Unable to prepare the video upload.', { exact: true }).waitFor(); await snapshot('video-upload-error')
        data.qaVideoFailure = false
      }
      const input = panel.locator('input:not([type]),input[type="text"],textarea').first(), original = await input.inputValue()
      await input.fill(original + ' QA'); await snapshot(key + '-draft')
      await panel.getByRole('button', { name: 'Restore saved version', exact: true }).click(); assert.equal(await input.inputValue(), original)
      const expected = structuredClone(data.siteContent)
      await act(panel.getByRole('button', { name: key === 'activities' ? 'Publish activity links' : 'Save and publish', exact: true }))
      assert.deepEqual(data.siteContent, expected, 'Saving in English must preserve authored content and unrelated sections')
    }
    await snapshot(key + '-saved')
  }
  await visit('seasons', 'Seasons')
  await page.getByRole('tab', { name: 'Season settings', exact: true }).click(); await snapshot('seasons')
  const confirm = async (button, phrase, accept = false) => {
    const event = page.waitForEvent('dialog').then(async dialog => { assert.equal(dialog.type(), 'confirm'); assert.ok(dialog.message().includes(phrase), dialog.message()); assert.doesNotMatch(dialog.message(), /[\u3400-\u9fff]/u); if (accept) await dialog.accept(); else await dialog.dismiss() })
    await button.click(); await event
  }
  await confirm(panel.getByRole('button', { name: 'Delete 2027 Q1', exact: true }), 'cannot be undone')
  await confirm(panel.getByRole('button', { name: 'Publish for enrollment', exact: true }).first(), 'Publish')
  await panel.getByRole('button', { name: 'Manage season classes', exact: true }).first().click(); await snapshot('course-editor')
  await panel.locator('summary').filter({ hasText: 'Public class description' }).click(); await snapshot('course-description')
  const field = name => panel.getByLabel(name, { exact: false })
  const save = panel.getByRole('button', { name: 'Save and publish class and schedule', exact: true })
  for (const [name, value, invalid, message] of [
    ['Start time for check-in', '19:00', '', 'Set the class start time'],
    ['Class capacity', '30', '0', 'Set class capacity between'],
    ['Billable session dates (one YYYY-MM-DD per line)', '2026-10-05\n2026-10-12', '2026-02-30', 'Session dates must be valid'],
    ['Price lock (hours)', '24', '0', 'The price lock must be between'],
  ]) {
    await field(name).fill(invalid); await save.click(); await panel.getByText(message, { exact: false }).waitFor(); await snapshot('validation-' + name.toLowerCase().replaceAll(/[^a-z]+/g, '-')); await field(name).fill(value)
  }
  await field('Class name').fill('QA class 原始名稱'); await act(save)
  assert.equal(data.courseSeasons[0].courseOverrides[data.courses[0].slug].name, 'QA class 原始名稱')
  // Restore the fixture's name before scanning; this is authored content, not interface copy.
  await field('Class name').fill('竹北夜跑班'); await act(save); await snapshot('course-saved')
  await field('Class name').fill('Unsaved QA')
  await confirm(panel.getByRole('button', { name: 'Back to seasons', exact: true }), 'unsaved changes', true)
  await panel.getByRole('button', { name: 'Manage season classes', exact: true }).nth(2).click(); await snapshot('draft-course')
  await panel.getByRole('button', { name: 'Add', exact: true }).click(); await snapshot('new-course')
  await panel.getByRole('button', { name: 'Create class', exact: true }).click(); await panel.getByText('Enter a new class name and choose a description template.', { exact: true }).waitFor(); await snapshot('new-course-validation')
  await confirm(panel.getByRole('button', { name: 'Delete', exact: true }), 'Only classes')
  await act(panel.getByRole('button', { name: 'Save season class', exact: true })); await snapshot('draft-course-saved')
  await field('Season to manage').selectOption('archive'); await snapshot('archived-course')
  assert.equal(await field('Class name').isDisabled(), true)
  await field('Season to manage').selectOption('empty-season'); await snapshot('empty-course')
}
