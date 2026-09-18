import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

// Authorized acceptance fixtures only. Never log passwords or session tokens.
const directory = '/tmp/haoyun-formal-journey-20260918'
const statePath = `${directory}/accounts.json`
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
if (new URL(url).hostname !== 'vmnbthmssiizbsvzeahz.supabase.co') throw new Error('Unexpected project')
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
await mkdir(directory, { recursive: true, mode: 0o700 })
let state
try { state = JSON.parse(await readFile(statePath, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error; state = { marker: 'formal-journey-20260918', accounts: [] } }
const save = () => writeFile(statePath, JSON.stringify(state), { mode: 0o600 })
if (process.argv[2] === 'create') {
  for (const label of ['student', 'coach-a', 'coach-b']) {
    if (state.accounts.some(account => account.label === label)) continue
    const email = `haoyun-qa-20260918-${label}-${randomBytes(4).toString('hex')}@example.com`
    const password = randomBytes(30).toString('base64url')
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: `驗收測試-${label}`, acceptance_fixture: state.marker } })
    if (error) throw error
    state.accounts.push({ label, id: data.user.id, email, password })
    await save()
  }
  for (const account of state.accounts) {
    const { error } = await admin.from('profiles').upsert({ id: account.id, email: account.email, role: account.label === 'student' ? 'student' : 'coach', name: `驗收測試-${account.label}` }, { onConflict: 'id' })
    if (error) throw error
  }
  console.log(JSON.stringify({ created: state.accounts.map(({ label, id }) => ({ label, id })), noEmailSent: true }))
} else if (process.argv[2] === 'verify') {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  for (const account of state.accounts) {
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await client.auth.signInWithPassword({ email: account.email, password: account.password })
    if (error) throw error
    const { data: profile, error: profileError } = await client.from('profiles').select('id,role').eq('id', account.id).single()
    if (profileError) throw profileError
    if (profile.id !== data.user.id || profile.role !== (account.label === 'student' ? 'student' : 'coach')) throw new Error('Role mismatch')
    await client.auth.signOut()
    console.log(`PASS independent login ${account.label}: ${profile.role}`)
  }
} else {
  throw new Error('Use create or verify. Cleanup must first remove linked acceptance fixtures and revoke sessions.')
}
