import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { checkPendingTransferReminders } from '@/lib/payment-reminders'
import { getAuthedUser, supabaseAdmin } from '@/lib/supabase-server'

function secretsMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

async function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim() ?? ''
  const authorization = request.headers.get('authorization')?.trim() ?? ''
  const bearerSecret = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const providedSecret = request.headers.get('x-cron-secret')?.trim() || bearerSecret

  if (cronSecret && providedSecret && secretsMatch(providedSecret, cronSecret)) {
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
  return profile.role === 'admin'
}

async function handleReminderCheck(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: '需要管理員權限或有效的定時任務憑證。' }, { status: 401 })
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1'

  try {
    const result = await checkPendingTransferReminders({ dryRun })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '檢查待匯款提醒失敗。',
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
