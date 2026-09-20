import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createRequire, registerHooks } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) return next(new URL('../' + specifier.slice(2) + '.ts', import.meta.url).href, context)
  return next(specifier, context)
} })
const { toEnglishWebsiteText } = await import('../lib/english-website.ts')
const files = execFileSync('git', ['ls-files', 'app', 'components', 'lib'], { encoding: 'utf8' }).trim().split('\n')
const entries = new Map()
for (const file of files) {
  if (!/\.(ts|tsx)$/.test(file) || /lib\/(dictionary|english-website|traditional-.*)\.ts$/.test(file)) continue
  const source = await readFile(file, 'utf8')
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) {
      const value = node.text.replace(/\s+/g, ' ').trim()
      if (/[\u3400-\u9fff]/u.test(value) && /[\u3400-\u9fff]/u.test(toEnglishWebsiteText(value))) {
        const entry = entries.get(value) || { source: value, current: toEnglishWebsiteText(value), locations: [] }
        entry.locations.push(`${file}:${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1}`)
        entries.set(value, entry)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
}
const result = [...entries.values()]
await writeFile('/private/tmp/haoyun-english-source.json', JSON.stringify(result, null, 2))
console.log(JSON.stringify({ missing: result.length, publicUi: result.filter(x => x.locations.some(p => /^(components|app)\//.test(p) && !/\/(admin|coach|api)\//.test(p))).length, output: '/private/tmp/haoyun-english-source.json' }))
