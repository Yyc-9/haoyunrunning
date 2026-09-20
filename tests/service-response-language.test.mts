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

// Inspect API error/message fields, not authored training data or acceptance fixtures.
const files = [
  ...['notifications', 'shop/orders', 'shop/products', 'site-content', 'coach/profile', 'coach/students', 'student/training-plans', 'integrations/google-forms', 'integrations/google-sheets'].map(route => `app/api/${route}/route.ts`),
  ...['admin-payment-notifications', 'bank-reconciliation', 'course-pricing-token', 'course-pricing', 'finance-access', 'finance-season-context', 'image-crop', 'notification-client', 'payment-display-server', 'season-write-guard', 'supabase'].map(name => `lib/${name}.ts`),
]
for (const file of files) {
  test(`${file}: fixed response errors have English presentation`, async () => {
    const ast = ts.createSourceFile(file, await readFile(new URL('../' + file, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
    const missing: string[] = []
    let checked = 0
    function isResponseMessage(node: import('typescript').Node): boolean {
      if (ts.isPropertyAssignment(node)) return ['error', 'message', 'reason'].includes(node.name.getText(ast).replaceAll(/['"]/g, ''))
      if (ts.isNewExpression(node) && ['Error', 'NotificationRequestError'].includes(node.expression.getText(ast))) return true
      if (ts.isReturnStatement(node)) return true
      if (ts.isParameter(node) && node.name.getText(ast) === 'message') return true
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 'unavailable') return true
      return node.parent ? isResponseMessage(node.parent) : false
    }
    function visit(node: import('typescript').Node) {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /[\u3400-\u9fff]/u.test(node.text) && isResponseMessage(node)) {
        checked++
        if (/[\u3400-\u9fff]/u.test(toEnglishWebsiteText(node.text))) missing.push(node.text)
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
    assert.ok(checked > 0, 'The guard must inspect actual response messages')
    assert.deepEqual(missing, [])
  })
}

test('generated bank column errors and import limits remain readable in English', () => {
  for (const label of ['入帳金額', '匯款帳號或後五碼', '交易日期', '交易時間', '匯款人', '交易序號', '摘要', '收支方向']) {
    for (const message of [`請指定「${label}」欄位。`, `「${label}」欄位設定無效。`]) {
      assert.doesNotMatch(toEnglishWebsiteText(message), /[\u3400-\u9fff]/u)
      assert.match(toEnglishWebsiteText(message), /column/)
    }
  }
  assert.equal(toEnglishWebsiteText('單次最多匯入 5,000 筆交易。'), 'You can import up to 5,000 transactions at a time.')
})
