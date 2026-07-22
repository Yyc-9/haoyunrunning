import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-server'

export async function awardCourseEnrollmentAchievement(input: {
  email: string
  courseName: string
  awardedBy: string
}) {
  if (!supabaseAdmin || !input.email) return

  const [{ data: profile }, { data: badge }] = await Promise.all([
    supabaseAdmin.from('profiles').select('id').ilike('email', input.email.trim()).maybeSingle(),
    supabaseAdmin.from('achievement_badges').select('id').eq('slug', 'first-course').eq('active', true).maybeSingle(),
  ])

  if (!profile || !badge) return
  await supabaseAdmin.from('profile_achievements').upsert(
    {
      profile_id: profile.id,
      badge_id: badge.id,
      reason: `完成 ${input.courseName} 報名`,
      awarded_by: input.awardedBy,
    },
    { onConflict: 'profile_id,badge_id', ignoreDuplicates: true }
  )
}

export async function sendCourseEnrollmentApprovedEmail(input: {
  to: string
  studentName: string
  courseName: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.ENROLLMENT_EMAIL_FROM || process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) return '郵件服務尚未設定，已完成對帳但未發送郵件。'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: '好運跑班銀行入帳已確認',
      text: `${input.studentName || '同學'}你好：你的 ${input.courseName || '已報名課程'} 匯款已與銀行入帳紀錄核對完成，課程報名已確認。後續課程通知將另行聯絡。`,
    }),
  })

  if (!response.ok) {
    console.warn('[finance] Enrollment approved email failed.', { status: response.status })
    return '對帳已完成，但郵件發送失敗，請稍後檢查郵件服務設定。'
  }

  return '對帳已完成，並已發送報名確認郵件。'
}
