import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { adminProductEnglishCopy } from '../lib/english-admin-product-copy.ts'
import { adminActionEnglishCopy } from '../lib/english-admin-action-copy.ts'

export async function adminMediaActions({ page, width, data, record }) {
  if (width > 768) await page.locator('#admin-tab-content').click()
  else { await page.getByRole('navigation', { name: 'Main administrator navigation' }).getByRole('button', { name: 'More', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: /^Site content/ }).click() }
  const panel = page.locator('#admin-content-panel')
  const mode = async label => page.locator('button[aria-controls="admin-content-panel"]:visible').filter({ hasText: new RegExp('^' + label) }).first().click()
  const snapshot = name => record(page, `${width}-media-${name}`)
  await mode('Homepage slideshow')
  const choosing = page.waitForEvent('filechooser')
  await panel.getByRole('button', { name: 'Add slideshow image', exact: true }).click()
  await (await choosing).setFiles({ name: 'QA 原圖.jpg', mimeType: 'image/jpeg', buffer: await readFile(new URL('../public/goodluck-running-vest.jpg', import.meta.url)) })
  const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
  await dialog.waitFor()
  const before = structuredClone(data.siteContent.heroSlides)
  for (const [name, source] of [
    ['image-access-denied', '只有超級管理員可以上傳網站媒體。'],
    ['image-format', '圖片僅支援 JPG、PNG 或 WebP。'],
    ['image-size', '圖片大小必須小於 8 MB。'],
    ['avatar-size', '圖片大小必須小於 15 MB。'],
  ]) {
    data.qaImageFailure = source
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/admin/upload')
    await dialog.getByRole('button', { name: 'Apply crop and upload', exact: true }).click()
    assert.equal((await response).status(), 503)
    await dialog.getByText(adminProductEnglishCopy[source] || `Images must be smaller than ${name === 'avatar-size' ? 15 : 8} MB.`, { exact: true }).waitFor()
    assert.deepEqual(data.siteContent.heroSlides, before)
    await snapshot(name)
  }
  data.qaImageFailure = false
  await dialog.getByRole('button', { name: 'Apply crop and upload', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  const saving = page.waitForResponse(r => new URL(r.url()).pathname === '/api/admin' && r.request().method() === 'PATCH')
  await panel.getByRole('button', { name: 'Save slideshow', exact: true }).click()
  assert.equal((await saving).status(), 200)
  assert.equal(data.siteContent.heroSlides.at(-1), '/goodluck-running-vest-black.jpg')
  await snapshot('image-retried-and-saved')
  await mode('Student')
  const original = structuredClone(data.siteContent.testimonials)
  for (const [name, source] of [
    ['video-access-denied', '只有超級管理員可以上傳網站影片。'],
    ['video-format', '影片僅支援 MP4、WebM 或 MOV。'],
    ['video-folder', '影片只能上傳至商城商品或網站頁面。'],
    ['video-size', '影片大小必須小於 50 MB。'],
  ]) {
    data.qaVideoFailure = source
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/admin/upload')
    await panel.locator('input[type="file"][accept^="video/"]').setInputFiles({ name: 'qa-video.mp4', mimeType: 'video/mp4', buffer: Buffer.from('Synthetic video upload validation') })
    assert.equal((await response).status(), 503)
    await panel.getByText(adminProductEnglishCopy[source], { exact: true }).waitFor()
    assert.deepEqual(data.siteContent.testimonials, original)
    await snapshot(name)
  }
  if (width > 768) await page.locator('#admin-tab-seasons').click()
  else { await page.getByRole('navigation', { name: 'Main administrator navigation' }).getByRole('button', { name: 'More', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: /^Seasons/ }).click() }
  for (const [name, source] of [
    ['sync-permission', '只有超級管理員可以取得表格同步程式。'],
    ['sync-configuration', 'Google 表格同步憑證尚未設定。'],
    ['sync-unlinked', '這一季尚未連結 Google 表格。'],
    ['sync-season-missing', '找不到同步季度。'],
    ['sync-recovered', ''],
  ]) {
    data.qaScriptError = source
    await page.getByRole('button', { name: 'Synchronization settings', exact: true }).click()
    const sync = page.getByRole('dialog', { name: 'Google Sheets synchronization settings', exact: true })
    await sync.waitFor()
    if (source) await sync.getByText(adminActionEnglishCopy[source], { exact: true }).waitFor()
    else assert.match(await sync.getByRole('textbox').inputValue(), /Synthetic preview only/)
    await snapshot(name)
    await sync.getByRole('button', { name: 'Close', exact: true }).click()
  }
}
