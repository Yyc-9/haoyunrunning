import 'server-only'

import { createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getAdminEmails, getAdminProfile, type AdminProfile } from '@/lib/admin-auth'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

const scrypt = promisify(nodeScrypt)
const FINANCE_TOKEN_LIFETIME_SECONDS = 30 * 60

export type FinanceCredentialRow = {
  singleton_key: 'primary'
  password_hash: string
  password_salt: string
  token_secret: string
  credential_version: number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

type FinanceTokenPayload = {
  sub: string
  version: number
  exp: number
  nonce: string
}

type AdminRequestAuth = {
  user: User
  adminProfile: AdminProfile
}

export type FinanceRequestAuth = AdminRequestAuth & {
  credential: FinanceCredentialRow
  financeTokenExpiresAt: string
}

const noStoreHeaders = {
  'Cache-Control': 'no-store',
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: noStoreHeaders })
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function financeManagerEmails() {
  const configured = (process.env.FINANCE_MANAGER_EMAILS ?? '')
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean)

  if (configured.length > 0) return configured
  return getAdminEmails().slice(0, 1)
}

export function canManageFinancePassword(email: string | null | undefined) {
  const managers = financeManagerEmails()
  return managers.length === 0 || managers.includes(normalizeEmail(email))
}

export function validateFinancePassword(password: string) {
  if (password.length < 12 || password.length > 128) {
    return '財務密碼需為 12 至 128 個字元。'
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return '財務密碼至少需包含一個英文字母與一個數字。'
  }
  return ''
}

export async function deriveFinancePasswordHash(password: string, salt: string) {
  const derived = await scrypt(password, salt, 64)
  return Buffer.from(derived as Buffer).toString('base64url')
}

export async function verifyFinancePassword(password: string, credential: FinanceCredentialRow) {
  const candidate = Buffer.from(await deriveFinancePasswordHash(password, credential.password_salt), 'base64url')
  const expected = Buffer.from(credential.password_hash, 'base64url')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

export async function newFinanceCredentialMaterial(password: string, actorId: string, credentialVersion = 1) {
  const passwordSalt = randomBytes(16).toString('base64url')
  return {
    singleton_key: 'primary' as const,
    password_hash: await deriveFinancePasswordHash(password, passwordSalt),
    password_salt: passwordSalt,
    token_secret: randomBytes(32).toString('base64url'),
    credential_version: credentialVersion,
    created_by: actorId,
    updated_by: actorId,
  }
}

function signTokenPayload(encodedPayload: string, secret: string) {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

export function createFinanceAccessToken(adminId: string, credential: FinanceCredentialRow) {
  const payload: FinanceTokenPayload = {
    sub: adminId,
    version: credential.credential_version,
    exp: Math.floor(Date.now() / 1000) + FINANCE_TOKEN_LIFETIME_SECONDS,
    nonce: randomBytes(12).toString('base64url'),
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return {
    token: `${encodedPayload}.${signTokenPayload(encodedPayload, credential.token_secret)}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  }
}

function verifyFinanceAccessToken(token: string, adminId: string, credential: FinanceCredentialRow) {
  const [encodedPayload, signature, ...extra] = token.split('.')
  if (!encodedPayload || !signature || extra.length > 0) return null

  const expectedSignature = Buffer.from(signTokenPayload(encodedPayload, credential.token_secret), 'base64url')
  const providedSignature = Buffer.from(signature, 'base64url')
  if (expectedSignature.length !== providedSignature.length || !timingSafeEqual(expectedSignature, providedSignature)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<FinanceTokenPayload>
    if (
      payload.sub !== adminId ||
      payload.version !== credential.credential_version ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null
    }
    return payload as FinanceTokenPayload
  } catch {
    return null
  }
}

export async function getFinanceCredential() {
  if (!supabaseAdmin) return null
  const { data, error } = await supabaseAdmin
    .from('finance_access_credentials')
    .select('*')
    .eq('singleton_key', 'primary')
    .maybeSingle()

  if (error) throw error
  return data as FinanceCredentialRow | null
}

export async function authenticateAdminRequest(request: NextRequest): Promise<AdminRequestAuth | { response: NextResponse }> {
  if (!supabaseAdmin) {
    return { response: jsonError('Supabase 尚未設定。', 500) }
  }

  const user = await getAuthedUser(request.headers.get('authorization')).catch(() => null)
  if (!user) {
    return { response: jsonError('請先登入管理員帳號。', 401) }
  }

  const adminProfile = await getAdminProfile(user)
  if (!adminProfile) {
    return { response: jsonError('目前帳號沒有管理員權限。', 403) }
  }

  return { user, adminProfile }
}

export async function authenticateFinanceRequest(request: NextRequest): Promise<FinanceRequestAuth | { response: NextResponse }> {
  const adminAuth = await authenticateAdminRequest(request)
  if ('response' in adminAuth) return adminAuth

  const credential = await getFinanceCredential()
  if (!credential) {
    return { response: jsonError('財務密碼尚未設定。', 409) }
  }

  const token = request.headers.get('x-finance-authorization')?.trim() ?? ''
  const payload = verifyFinanceAccessToken(token, adminAuth.adminProfile.id, credential)
  if (!payload) {
    return { response: jsonError('財務權限已鎖定或逾時，請重新輸入財務密碼。', 403) }
  }

  return {
    ...adminAuth,
    credential,
    financeTokenExpiresAt: new Date(payload.exp * 1000).toISOString(),
  }
}

export async function writeFinanceAudit(input: {
  actorProfileId: string
  action: 'credential_setup' | 'password_changed' | 'unlock_success' | 'unlock_failure'
  details?: Record<string, unknown>
}) {
  if (!supabaseAdmin) return
  const { error } = await supabaseAdmin.from('finance_reconciliation_audit_log').insert({
    actor_profile_id: input.actorProfileId,
    action: input.action,
    details: input.details ?? {},
  })
  if (error) {
    console.warn('[finance] Audit log write failed.', error.message)
  }
}

export function financeNoStoreHeaders() {
  return noStoreHeaders
}
