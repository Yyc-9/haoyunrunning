import { readFile, writeFile } from 'node:fs/promises'
import { registerHooks } from 'node:module'

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) return next(new URL('../' + specifier.slice(2) + '.ts', import.meta.url).href, context)
  return next(specifier, context)
} })
const { toEnglishWebsiteText } = await import('../lib/english-website.ts')
if (!process.env.LANGUAGE_CONTENT_FILE) throw new Error('Set LANGUAGE_CONTENT_FILE to a published site-content JSON snapshot')
const data = JSON.parse(await readFile(process.env.LANGUAGE_CONTENT_FILE, 'utf8'))
const missing = []
function visit(value, path) {
  if (typeof value === 'string') {
    if (/[\u3400-\u9fff]/u.test(toEnglishWebsiteText(value))) missing.push({ path, value })
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) visit(item, `${path}.${key}`)
  }
}
visit(data.content, 'content')
await writeFile('/private/tmp/haoyun-published-english-missing.json', JSON.stringify(missing, null, 2))
console.log(`${missing.length} untranslated published values; details: /private/tmp/haoyun-published-english-missing.json`)
if (missing.length) process.exitCode = 1
