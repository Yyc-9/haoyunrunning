import { NextRequest, NextResponse } from 'next/server'
import { createClient, type Session, type User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-server'

type RegisterBody = {
  email?: string
  password?: string
  name?: string
  phone?: string
  pb?: string
  coachId?: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function registrationError(message = '') {
  const normalized = message.toLowerCase()
  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return { error: '這個信箱已經註冊，請直接登入。', code: 'email_exists', status: 409 }
  }
  if (normalized.includes('password should be') || normalized.includes('weak password')) {
    return { error: '密碼強度不足，請使用至少 6 個字元。', code: 'weak_password', status: 400 }
  }
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return { error: '註冊嘗試太頻繁，請稍後再試。', code: 'rate_limited', status: 429 }
  }
  return { error: '帳戶暫時無法建立，請稍後再試。', code: 'registration_failed', status: 400 }
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const body = (await request.json().catch(() => ({}))) as RegisterBody
  const email = cleanText(body.email, 320).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  const name = cleanText(body.name, 120)
  const phone = cleanText(body.phone, 40)
  const pb = cleanText(body.pb, 100)
  const coachId = cleanText(body.coachId, 80)

  if (!isEmail(email)) {
    return NextResponse.json({ error: '請輸入有效的信箱地址。', code: 'invalid_email' }, { status: 400 })
  }
  if (password.length < 6 || password.length > 128) {
    return NextResponse.json({ error: '密碼請使用 6 至 128 個字元。', code: 'invalid_password' }, { status: 400 })
  }
  if (!name || !phone) {
    return NextResponse.json({ error: '請完整填寫姓名與聯絡電話。', code: 'missing_profile' }, { status: 400 })
  }

  const { data: existingProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .limit(1)
    .maybeSingle()

  if (profileError) {
    console.error('Registration email lookup failed:', profileError)
    return NextResponse.json({ error: '帳戶服務暫時無法使用，請稍後再試。' }, { status: 503 })
  }
  if (existingProfile) {
    return NextResponse.json({ error: '這個信箱已經註冊，請直接登入。', code: 'email_exists' }, { status: 409 })
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || request.nextUrl.origin
  const { data, error } = await authClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone,
        pb,
        role: 'student',
        preferred_coach_id: coachId,
      },
      emailRedirectTo: `${siteUrl.replace(/\/$/, '')}/profile?auth=login`,
    },
  })

  if (error) {
    const detail = registrationError(error.message)
    return NextResponse.json({ error: detail.error, code: detail.code }, { status: detail.status })
  }

  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return NextResponse.json({ error: '這個信箱已經註冊，請直接登入。', code: 'email_exists' }, { status: 409 })
  }

  return NextResponse.json({
    needsEmailConfirmation: !data.session,
    session: data.session as Session | null,
    user: data.user as User | null,
  })
}
