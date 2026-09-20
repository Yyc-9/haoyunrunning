import assert from 'node:assert/strict'

export async function auditLegacyEnrollment({ account, record, scenario, base, output }) {
  for (const width of [1440, 375]) {
    const page = await account('student', width)
    await page.goto(base + '/anniversary', { waitUntil: 'domcontentloaded' })
    const form = page.locator('.mobile-lead-form')
    const submit = () => form.getByRole('button', { name: 'Submit interest', exact: true }).click()
    await form.waitFor()
    await submit()
    await form.getByRole('alert').waitFor()
    await record(page, `${width}-legacy-name-required`)
    assert.equal(await form.getByRole('alert').innerText(), 'Enter your name.')
    const name = form.locator('input[autocomplete="name"]')
    await name.fill('QA 活動報名')
    await submit()
    await form.getByText('Please provide at least one contact method: phone, email, or Instagram.', { exact: true }).waitFor()
    await record(page, `${width}-legacy-contact-required`)
    await form.locator('input[type="tel"]').fill('0912345678')
    await form.locator('textarea').last().fill('原文備註保留')
    const choice = await form.locator('select option').nth(1).getAttribute('value')
    await form.locator('select').selectOption(choice)
    for (const [source, expected, state] of [
      ['報名資料提交失敗。', 'Unable to submit enrollment details.', 'server-error'],
      ['報名來源無效。', 'Invalid enrollment source.', 'invalid-source'],
    ]) {
      scenario.overrides['POST /api/signup-leads'] = { status: 400, body: { error: source } }
      await submit()
      await form.getByRole('alert').filter({ hasText: expected }).waitFor()
      assert.equal(await name.inputValue(), 'QA 活動報名')
      assert.equal(await form.locator('textarea').last().inputValue(), '原文備註保留')
      const body = scenario.submissions.at(-1)
      assert.equal(body.source, 'anniversary_4th')
      assert.equal(body.companionCount, choice)
      assert.equal(body.phone, '0912345678')
      assert.equal(body.notes, '原文備註保留')
      await record(page, `${width}-legacy-${state}`)
    }
    if (width === 375) {
      const small = await form.locator('input,select,textarea').evaluateAll(fields => fields.filter(f => parseFloat(getComputedStyle(f).fontSize) < 16).map(f => ({ tag: f.tagName, font: getComputedStyle(f).fontSize })))
      assert.deepEqual(small, [], 'Mobile form controls must be at least 16px')
      await form.screenshot({ path: output + '/mobile-form-error.png', animations: 'disabled' })
    }
    scenario.overrides['POST /api/signup-leads'] = { body: { success: true } }
    await submit()
    await form.getByRole('status').waitFor()
    assert.equal(await name.inputValue(), '')
    assert.equal(await form.locator('select').inputValue(), '')
    await record(page, `${width}-legacy-complete`)
    await page.close()
  }
}
