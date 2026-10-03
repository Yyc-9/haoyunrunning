import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import type { CoachAccountState } from '../components/CoachAccountStatus'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const exports: Record<string, unknown> = {}
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/CoachAccountStatus.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
}).outputText, {
  exports,
  require: (name: string) => name === 'next/link'
    ? { default: ({ children, ...props }: { children: unknown; href: string }) => React.createElement('a', props, children) }
    : name === 'lucide-react' ? { ArrowRight: () => React.createElement('svg') } : require(name),
})
function render(status: CoachAccountState['status'], message?: string) {
  return renderToStaticMarkup(React.createElement(exports.default, {
    account: { status, coachKey: 'example', coachName: '範例教練', message },
  })) as string
}

test('an enabled account never shows the pending label or email verification instructions', () => {
  const html = render('enabled')
  assert.match(html, /範例教練 · 已啟用/)
  assert.match(html, /href="\/coach"/)
  assert.match(html, /進入教練工作台/)
  assert.doesNotMatch(html, /待啟用|重新登入|驗證信箱/)
})

test('an enabled account does not reuse a stale pending message', () => {
  assert.doesNotMatch(render('enabled', '請驗證信箱並重新登入'), /請驗證信箱並重新登入/)
})

for (const [status, label] of [
  ['pending', '待啟用'], ['pending_email', '待驗證信箱'],
  ['disabled', '已停用'], ['conflict', '身份待確認'],
] as const) {
  test(`${status} has its own label and no enabled-account shortcut`, () => {
    const html = render(status)
    assert.ok(html.includes(`範例教練 · ${label}`))
    assert.doesNotMatch(html, /href="\/coach"/)
    assert.ok(render(status, '伺服器提供的處理說明').includes('伺服器提供的處理說明'))
  })
}
