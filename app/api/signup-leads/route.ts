import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

type SignupLeadBody = {
  source?: string
  name?: string
  phone?: string
  email?: string
  instagram?: string
  preferredCourse?: string
  runningExperience?: string
  goal?: string
  companionCount?: string
  notes?: string
}

const allowedSources = new Set(['anniversary_4th', 'group_class'])
const allowedStatuses = new Set(['new', 'contacted', 'confirmed', 'closed'])

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

async function getAuthorizedProfile(request: NextRequest) {
  if (!supabaseAdmin) {
    return { error: NextResponse.json({ error: 'Supabase 尚未设置。' }, { status: 500 }) }
  }

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return { error: NextResponse.json({ error: '请先登录教练或管理员账号。' }, { status: 401 }) }
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (error) {
    return { error: NextResponse.json({ error: error.message }, { status: 500 }) }
  }

  if (!['coach', 'admin'].includes(profile.role)) {
    return { error: NextResponse.json({ error: '目前账号尚未取得教练或管理员权限。' }, { status: 403 }) }
  }

  return { profile }
}

export async function GET(request: NextRequest) {
  const auth = await getAuthorizedProfile(request)
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const source = cleanText(searchParams.get('source'))
  const status = cleanText(searchParams.get('status'))

  let query = supabaseAdmin!
    .from('signup_leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)

  if (source && allowedSources.has(source)) {
    query = query.eq('source', source)
  }

  if (status && allowedStatuses.has(status)) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ leads: data ?? [] })
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase 尚未设置，暂时无法收集资料。' }, { status: 500 })
  }

  const body = (await request.json().catch(() => ({}))) as SignupLeadBody
  const source = cleanText(body.source)
  const name = cleanText(body.name)
  const phone = cleanText(body.phone)
  const email = cleanText(body.email)
  const instagram = cleanText(body.instagram)
  const preferredCourse = cleanText(body.preferredCourse)
  const runningExperience = cleanText(body.runningExperience)
  const goal = cleanText(body.goal)
  const companionCount = cleanText(body.companionCount)
  const notes = cleanText(body.notes)

  if (!allowedSources.has(source)) {
    return NextResponse.json({ error: '报名来源无效。' }, { status: 400 })
  }

  if (!name) {
    return NextResponse.json({ error: '请填写姓名。' }, { status: 400 })
  }

  if (!phone && !email && !instagram) {
    return NextResponse.json({ error: '请至少填写一种联系方式。' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('signup_leads')
    .insert({
      source,
      name,
      phone,
      email,
      instagram,
      preferred_course: preferredCourse,
      running_experience: runningExperience,
      goal,
      companion_count: companionCount,
      notes,
      status: 'new',
      payload: {
        source,
        name,
        phone,
        email,
        instagram,
        preferredCourse,
        runningExperience,
        goal,
        companionCount,
        notes,
      },
    })
    .select('id, source, status, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || '报名资料提交失败。' }, { status: 500 })
  }

  return NextResponse.json({ lead: data })
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthorizedProfile(request)
  if (auth.error) return auth.error

  const body = (await request.json().catch(() => ({}))) as { id?: string; status?: string; notes?: string }
  const id = cleanText(body.id)
  const status = cleanText(body.status)
  const notes = cleanText(body.notes)

  if (!id) {
    return NextResponse.json({ error: '缺少报名资料 ID。' }, { status: 400 })
  }

  if (!allowedStatuses.has(status)) {
    return NextResponse.json({ error: '状态无效。' }, { status: 400 })
  }

  const updatePayload: { status: string; notes?: string } = { status }
  if (typeof body.notes === 'string') {
    updatePayload.notes = notes
  }

  const { data, error } = await supabaseAdmin!
    .from('signup_leads')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || '报名资料更新失败。' }, { status: 500 })
  }

  return NextResponse.json({ lead: data })
}
