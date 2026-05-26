import { NextRequest, NextResponse } from 'next/server'
import { checkPendingTransferReminders } from '@/lib/payment-reminders'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

async function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const providedSecret = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('secret')

  if (cronSecret && providedSecret === cronSecret) {
    return true
  }

  if (!supabaseAdmin) return false

  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) return false

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error) return false
  return ['coach', 'admin'].includes(profile.role)
}

async function handleReminderCheck(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: '需要教练、管理员权限，或有效 CRON_SECRET。' }, { status: 401 })
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1'

  try {
    const result = await checkPendingTransferReminders({ dryRun })

    return NextResponse.json({
      ...result,
      todo: 'TODO: 接入 Vercel Cron 或 Supabase 定时任务后，定时调用此 API。当前可手动触发。',
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '检查待汇款提醒失败。',
        todo: '请确认已执行 supabase/payment-order-statuses.sql，尤其是 reminder_sent_at 字段。',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return handleReminderCheck(request)
}

export async function POST(request: NextRequest) {
  return handleReminderCheck(request)
}
