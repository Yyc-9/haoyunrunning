import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import { createInflightRequest } from '../lib/inflight-request.ts'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const jsx = (type: unknown, props: unknown) => ({ type, props })
function loadComponent(path: string, mocks: Record<string, unknown>, globals = {}) {
  const exports: Record<string, any> = {}
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, ...globals, require: (name: string) => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name in mocks ? mocks[name] : require(name) })
  return exports.default
}

test('simultaneous content refreshes share one request, but later refreshes fetch anew', async () => {
  let calls = 0
  let release!: (value: number) => void
  const reader = createInflightRequest(() => { calls++; return new Promise<number>(resolve => { release = resolve }) })
  const a = reader.load(), b = reader.load()
  assert.equal(a, b)
  await Promise.resolve()
  assert.equal(calls, 1)
  release(1)
  await a
  const c = reader.load()
  assert.notEqual(a, c)
  await Promise.resolve()
  assert.equal(calls, 2)
  release(2)
  assert.equal(await c, 2)
})

test('publish invalidation and forced refresh cannot reuse or clear an older pending request', async () => {
  const resolvers: Array<(value: number) => void> = []
  const reader = createInflightRequest(() => new Promise<number>(resolve => resolvers.push(resolve)))
  const old = reader.load()
  const forced = reader.load(true)
  await Promise.resolve()
  resolvers[0](1)
  await old
  assert.equal(reader.load(), forced)
  reader.invalidate()
  const fresh = reader.load()
  assert.notEqual(fresh, forced)
  await Promise.resolve()
  resolvers[1](2)
  await forced
  assert.equal(reader.load(), fresh)
  resolvers[2](3)
  assert.equal(await fresh, 3)
})

test('a failed content request is not cached and can be retried', async () => {
  let calls = 0
  const reader = createInflightRequest(async () => { if (++calls === 1) throw new Error('offline'); return 'fresh' })
  await assert.rejects(reader.load(), /offline/)
  assert.equal(await reader.load(), 'fresh')
})

test('video has no media source until play, and changing the source requires another click', () => {
  let state: string | null = null
  const Video = loadComponent('components/OnDemandVideo.tsx', {
    react: { useState: () => [state, (value: string) => { state = value }] },
    'next/image': { __esModule: true, default: 'optimized-image' },
    'lucide-react': { PlayCircle: 'play-icon' },
  })
  const props = { src: 'https://example.com/large.mp4', poster: '/poster.jpg', label: 'Play', className: 'aspect-video' }
  const preview = Video(props)
  assert.equal(preview.type, 'button')
  assert.equal(JSON.stringify(preview).includes(props.src), false)
  assert.equal(preview.props.children[0].type, 'optimized-image')
  preview.props.onClick()
  const playing = Video(props)
  assert.equal(playing.type, 'video')
  assert.equal(playing.props.src, props.src)
  assert.equal(playing.props.preload, 'none')
  assert.equal(playing.props.controls, true)
  assert.equal(Video({ ...props, src: 'https://example.com/other.mp4' }).type, 'button')
})

function heroHarness({ desktop = true, reduced = false, saveData = false } = {}) {
  const effects: Array<() => () => void> = []
  const events = new Map<string, (event: { pointerType: string }) => void>()
  const loaded: string[] = []
  const hero = { addEventListener: (name: string, fn: any) => events.set(name, fn), removeEventListener: (name: string) => events.delete(name) }
  let refs = 0
  class FakeImage { set src(value: string) { loaded.push(value) } decode() { return Promise.resolve() } }
  const Hero = loadComponent('components/HeroSection.tsx', {
    react: { useRef: (initial: unknown) => ({ current: refs++ === 0 ? hero : initial }), useMemo: (fn: () => unknown) => fn(), useEffect: (fn: any) => effects.push(fn) },
    'next/image': { __esModule: true, default: 'optimized-image', getImageProps: require('next/image').getImageProps },
    'next/link': { __esModule: true, default: 'link' },
    'lucide-react': { ArrowUpRight: 'arrow' },
    'framer-motion': { motion: { figure: 'figure', div: 'div', aside: 'aside' }, useReducedMotion: () => reduced },
    '@/app/site-content-provider': { useSiteContent: () => ({ heroSlides: ['/one.jpg', '/one.jpg', '/two.jpg'], hasSyncedContent: true }) },
  }, { navigator: { connection: { saveData } }, window: { Image: FakeImage, matchMedia: () => ({ matches: desktop }) } })
  Hero({ initialImages: [] })
  const cleanup = effects[0]()
  return { loaded, events, cleanup }
}

test('desktop trail loads optimized thumbnails only once after mouse interaction', () => {
  const h = heroHarness()
  assert.equal(h.loaded.length, 0)
  h.events.get('pointermove')!({ pointerType: 'mouse' })
  assert.equal(h.loaded.length, 2)
  h.loaded.forEach(url => { assert.match(url, /^\/_next\/image\?/); assert.match(url, /w=640/); assert.match(url, /q=75/) })
  h.events.get('pointermove')!({ pointerType: 'mouse' })
  assert.equal(h.loaded.length, 2)
  h.cleanup()
  assert.equal(h.events.size, 0)
})

for (const [name, options, pointerType] of [
  ['mobile viewport', { desktop: false }, 'mouse'],
  ['reduced motion', { reduced: true }, 'mouse'],
  ['data saver', { saveData: true }, 'mouse'],
  ['touch input', {}, 'touch'],
] as const) test(`${name} does not fetch decorative trail images`, () => {
  const h = heroHarness(options)
  h.events.get('pointermove')!({ pointerType })
  assert.equal(h.loaded.length, 0)
  h.cleanup()
})
