import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createRequire, registerHooks } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript') as typeof import('typescript')
registerHooks({ resolve(specifier, context, next) {
  return specifier.startsWith('@/') ? next(new URL('../' + specifier.slice(2) + '.ts', import.meta.url).href, context) : next(specifier, context)
} })
const { toEnglishWebsiteText } = await import('../lib/english-website.ts')
const { validatePaymentDisplay } = await import('../lib/payment-display.ts')

for (const file of ['app/api/admin/route.ts', 'app/api/admin/coach-duty/route.ts', 'app/api/admin/payment-info/route.ts', 'app/api/signup-leads/route.ts']) {
  test(`${file}: fixed Chinese response text has complete English coverage`, async () => {
    const ast = ts.createSourceFile(file, await readFile(new URL('../' + file, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
    const missing: string[] = []
    let checked = 0
    function visit(node: import('typescript').Node) {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /[\u3400-\u9fff]/u.test(node.text)) {
        checked++
        if (/[\u3400-\u9fff]/u.test(toEnglishWebsiteText(node.text))) missing.push(`${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1}: ${node.text}`)
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
    assert.ok(checked > 0)
    assert.deepEqual(missing, [])
  })
}

test('generated season, course-copy and product action messages preserve names and counts', () => {
  assert.equal(toEnglishWebsiteText('2027 第三季'), '2027 Q3')
  assert.equal(toEnglishWebsiteText('QA Training Class（複本）'), 'QA Training Class (copy)')
  assert.equal(toEnglishWebsiteText('2027 第三季 已建立為草稿，來源季度資料仍完整保留。'), '2027 Q3 created as a draft. All source-season records are retained.')
  assert.equal(toEnglishWebsiteText('2027 第三季 已經存在，請直接切換管理。'), '2027 Q3 already exists. Select it to manage it.')
  assert.equal(toEnglishWebsiteText('已新增「QA Training Class」；完成日期、教練與計價後再開啟對外顯示。'), 'QA Training Class added. Set dates, coaches and pricing before publishing it.')
  assert.equal(toEnglishWebsiteText('還有 1 門對外課程未完成實際收費課次，不能切換前台招生。'), '1 public course has incomplete billable sessions. Public enrollment cannot switch yet.')
  assert.equal(toEnglishWebsiteText('商品「QA Shirt」已刪除；既有訂單記錄與刪除紀錄仍會保留。'), 'QA Shirt deleted. Existing orders and the deletion history are retained.')
  assert.equal(toEnglishWebsiteText('自訂名稱與學生原文不應改寫'), '自訂名稱與學生原文不應改寫')
})

test('payment display validation errors translate while bank codes and account numbers remain intact', () => {
  const valid = { bankName: 'QA Bank', bankCode: '007', accountNumber: '000012345678', qrCodeUrl: '' }
  assert.deepEqual(validatePaymentDisplay(valid), { ...valid, useLegacyQr: false })
  for (const input of [
    { ...valid, bankCode: '7' },
    { ...valid, qrCodeUrl: 'http://example.invalid/qr.png' },
    { ...valid, qrCodeUrl: 'https://user:pass@example.invalid/qr.png' },
    { ...valid, useLegacyQr: true },
  ]) {
    assert.throws(() => validatePaymentDisplay(input), (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.match(error.message, /[\u3400-\u9fff]/u)
      assert.doesNotMatch(toEnglishWebsiteText(error.message), /[\u3400-\u9fff]/u)
      return true
    })
  }
})
