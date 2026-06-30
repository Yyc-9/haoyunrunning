import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/supabase-server'
import { canAccessTrainingContent, getStudentAccessSummary } from '@/lib/student-access'

export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: '請先登入學員帳號。' }, { status: 401 })
  }

  try {
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
