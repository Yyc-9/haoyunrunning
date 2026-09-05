import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const navigation = readFileSync(new URL('../components/Navigation.tsx', import.meta.url), 'utf8')
const globalStyles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('桌面導航下滑後保留安全邊距且沒有藍色底線', () => {
  assert.match(navigation, /data-scrolled=\{isScrolled\}/)
  assert.match(globalStyles, /\.site-navigation\[data-scrolled='true'\]\s*> div\s*\{[^}]*width: calc\(100% - 3rem\);[^}]*max-width: 100rem;/s)
  assert.match(globalStyles, /\.site-navigation\[data-scrolled='true'\]\s*> div > div\s*\{[^}]*background: rgb\(255 255 255 \/ 96%\);[^}]*box-shadow: 0 10px 30px/s)
  assert.doesNotMatch(globalStyles, /inset 0 -2px 0 var\(--kinetic-accent/)
})
