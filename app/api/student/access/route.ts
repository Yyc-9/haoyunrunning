import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/supabase-server'
import { canAccessTrainingContent, getStudentAccessSummary } from '@/lib/student-access'
import { getIsolatedTestAccount } from '@/lib/test-account'

export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: '請先登入學員帳號。' }, { status: 401 })
  }

  try {
    const testAccount = await getIsolatedTestAccount(user)
    if (testAccount) {
      if (testAccount.currentMode !== 'student') return NextResponse.json({ error: '請先切換至學員測試模式。' }, { status: 403 })
      return NextResponse.json({ state: 'legacy_open', canAccessTraining: true, coachBound: false, coachName: '', isolatedTest: true })
    }
    const summary = await getStudentAccessSummary(user.id, user.email)

    return NextResponse.json({
      ...summary,
      canAccessTraining: canAccessTrainingContent(summary.state),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '讀取報名狀態失敗。' },
      { status: 500 }
    )
  }
}
