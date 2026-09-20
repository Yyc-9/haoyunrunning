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

for (const file of ['app/api/auth/login/route.ts', 'app/api/auth/register/route.ts', 'app/api/admin/upload/route.ts', 'app/api/admin/google-sheets-script/route.ts', 'app/api/admin/google-forms-script/route.ts']) {
  test(`${file}: fixed response messages translate completely`, async () => {
    const ast = ts.createSourceFile(file, await readFile(new URL('../' + file, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
    const missing: string[] = []
    let checked = 0
    function visit(node: import('typescript').Node) {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /[\u3400-\u9fff]/u.test(node.text)) {
        checked++
        if (/[\u3400-\u9fff]/u.test(toEnglishWebsiteText(node.text))) missing.push(node.text)
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
    assert.ok(checked > 0)
    assert.deepEqual(missing, [])
  })
}

test('media size messages preserve the image limit for both website and coach images', () => {
  for (const limit of [8, 15]) assert.equal(toEnglishWebsiteText(`圖片大小必須小於 ${limit} MB。`), `Images must be smaller than ${limit} MB.`)
})
