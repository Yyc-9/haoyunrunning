import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type LoginBody = {
  email?: string
  password?: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function authErrorMessage(message = '') {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return '信箱或密碼不正確。'
  }

  if (normalized.includes('email not confirmed')) {
    return '請先到信箱完成驗證，再回來登入。'
  }

  if (normalized.includes('too many')) {
    return '登入嘗試太頻繁，請稍後再試。'
  }

  return '登入服務暫時無法完成驗證，請稍後再試。'
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase 尚未設定。' }, { status: 500 })
  }

  const body = (await request.json().catch(() => ({}))) as LoginBody
  const email = cleanText(body.email).toLowerCase()
  const password = cleanText(body.password)

  if (!email || !password) {
    return NextResponse.json({ error: '請填寫信箱和密碼。' }, { status: 400 })
  }

  const serverAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  const { data, error } = await serverAuth.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.session || !data.user) {
    return NextResponse.json(
      { error: authErrorMessage(error?.message), code: error?.code ?? null },
      { status: error?.status && error.status >= 400 ? error.status : 401 }
    )
  }

  return NextResponse.json({
    session: data.session,
    user: data.user,
  })
}
