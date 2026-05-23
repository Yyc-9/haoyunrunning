import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

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

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
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
