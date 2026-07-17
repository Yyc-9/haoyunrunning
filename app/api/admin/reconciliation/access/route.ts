import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateAdminRequest,
  authenticateFinanceRequest,
  canManageFinancePassword,
  createFinanceAccessToken,
  financeNoStoreHeaders,
  getFinanceCredential,
  newFinanceCredentialMaterial,
  validateFinancePassword,
  verifyFinancePassword,
  writeFinanceAudit,
} from '@/lib/finance-access'
import { supabaseAdmin } from '@/lib/supabase-server'

type FinanceAccessBody = {
  action?: 'setup' | 'unlock' | 'change_password'
  password?: string
  currentPassword?: string
  newPassword?: string
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...financeNoStoreHeaders(),
      ...(init?.headers ?? {}),
    },
  })
}

function cleanPassword(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export async function GET(request: NextRequest) {
  const auth = await authenticateAdminRequest(request)
  if ('response' in auth) return auth.response

  try {
    const [credential, guardResult] = await Promise.all([
      getFinanceCredential(),
      supabaseAdmin!
        .from('finance_access_guards')
        .select('failed_attempts, locked_until')
        .eq('admin_profile_id', auth.adminProfile.id)
        .maybeSingle(),
    ])

    if (guardResult.error) throw guardResult.error

    const lockedUntil = guardResult.data?.locked_until ?? null
    const isLocked = Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now())

    return json({
      configured: Boolean(credential),
      canManagePassword: canManageFinancePassword(auth.adminProfile.email),
      lockedUntil: isLocked ? lockedUntil : null,
      passwordRequirements: '12 至 128 個字元，至少包含一個英文字母與一個數字。',
    })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : '讀取財務權限狀態失敗。' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as FinanceAccessBody

  if (body.action === 'change_password') {
    const auth = await authenticateFinanceRequest(request)
    if ('response' in auth) return auth.response

    if (!canManageFinancePassword(auth.adminProfile.email)) {
      return json({ error: '只有指定的財務主管可以變更財務密碼。' }, { status: 403 })
    }

    const currentPassword = cleanPassword(body.currentPassword)
    const newPassword = cleanPassword(body.newPassword)
    const validationError = validateFinancePassword(newPassword)
    if (validationError) return json({ error: validationError }, { status: 400 })

    if (!(await verifyFinancePassword(currentPassword, auth.credential))) {
      return json({ error: '目前的財務密碼不正確。' }, { status: 403 })
    }

    try {
      const material = await newFinanceCredentialMaterial(
        newPassword,
        auth.adminProfile.id,
        auth.credential.credential_version + 1
      )
      const { data, error } = await supabaseAdmin!
        .from('finance_access_credentials')
        .update({
          password_hash: material.password_hash,
          password_salt: material.password_salt,
          token_secret: material.token_secret,
          credential_version: material.credential_version,
          updated_by: auth.adminProfile.id,
          updated_at: new Date().toISOString(),
        })
        .eq('singleton_key', 'primary')
        .select('*')
        .single()

      if (error || !data) throw error ?? new Error('財務密碼更新失敗。')
      await writeFinanceAudit({
        actorProfileId: auth.adminProfile.id,
        action: 'password_changed',
        details: { credentialVersion: data.credential_version },
      })

      return json({
        ...createFinanceAccessToken(auth.adminProfile.id, data),
        message: '財務密碼已更新，其他已解鎖的工作階段已失效。',
      })
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : '財務密碼更新失敗。' },
        { status: 500 }
      )
    }
  }

  const auth = await authenticateAdminRequest(request)
  if ('response' in auth) return auth.response

  const password = cleanPassword(body.password)

  if (body.action === 'setup') {
    if (!canManageFinancePassword(auth.adminProfile.email)) {
      return json({ error: '只有指定的財務主管可以建立財務密碼。' }, { status: 403 })
    }

    const validationError = validateFinancePassword(password)
    if (validationError) return json({ error: validationError }, { status: 400 })

    try {
      if (await getFinanceCredential()) {
        return json({ error: '財務密碼已建立，請直接解鎖。' }, { status: 409 })
      }

      const material = await newFinanceCredentialMaterial(password, auth.adminProfile.id)
      const { data, error } = await supabaseAdmin!
        .from('finance_access_credentials')
        .insert(material)
        .select('*')
        .single()

      if (error || !data) throw error ?? new Error('建立財務密碼失敗。')
      await writeFinanceAudit({
        actorProfileId: auth.adminProfile.id,
        action: 'credential_setup',
        details: { credentialVersion: data.credential_version },
      })

      return json({
        ...createFinanceAccessToken(auth.adminProfile.id, data),
        message: '財務密碼已建立，對帳區已解鎖 30 分鐘。',
      })
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : '建立財務密碼失敗。' },
        { status: 500 }
      )
    }
  }

  if (body.action !== 'unlock') {
    return json({ error: '財務權限操作無效。' }, { status: 400 })
  }

  try {
    const credential = await getFinanceCredential()
    if (!credential) {
      return json({ error: '財務密碼尚未建立。' }, { status: 409 })
    }

    const { data: guard, error: guardError } = await supabaseAdmin!
      .from('finance_access_guards')
      .select('failed_attempts, locked_until')
      .eq('admin_profile_id', auth.adminProfile.id)
      .maybeSingle()

    if (guardError) throw guardError

    const lockedUntil = guard?.locked_until ?? null
    if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
      return json(
        { error: '財務密碼輸入錯誤次數過多，請稍後再試。', lockedUntil },
        { status: 429 }
      )
    }

    const verified = await verifyFinancePassword(password, credential)
    if (!verified) {
      const failedAttempts = Math.min(Number(guard?.failed_attempts ?? 0) + 1, 20)
      const nextLockedUntil = failedAttempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
        : null

      await supabaseAdmin!
        .from('finance_access_guards')
        .upsert({
          admin_profile_id: auth.adminProfile.id,
          failed_attempts: nextLockedUntil ? 0 : failedAttempts,
          locked_until: nextLockedUntil,
          last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'admin_profile_id' })

      await writeFinanceAudit({
        actorProfileId: auth.adminProfile.id,
        action: 'unlock_failure',
        details: {
          failedAttempts,
          locked: Boolean(nextLockedUntil),
        },
      })

      return json(
        {
          error: nextLockedUntil
            ? '財務密碼連續輸入錯誤，已鎖定 15 分鐘。'
            : `財務密碼不正確，還可嘗試 ${5 - failedAttempts} 次。`,
          lockedUntil: nextLockedUntil,
        },
        { status: nextLockedUntil ? 429 : 403 }
      )
    }

    await supabaseAdmin!
      .from('finance_access_guards')
      .upsert({
        admin_profile_id: auth.adminProfile.id,
        failed_attempts: 0,
        locked_until: null,
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'admin_profile_id' })

    await writeFinanceAudit({
      actorProfileId: auth.adminProfile.id,
      action: 'unlock_success',
      details: { credentialVersion: credential.credential_version },
    })

    return json({
      ...createFinanceAccessToken(auth.adminProfile.id, credential),
      message: '財務對帳區已解鎖 30 分鐘。',
    })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : '財務權限驗證失敗。' },
      { status: 500 }
    )
  }
}
