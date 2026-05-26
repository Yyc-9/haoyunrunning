import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/supabase-server'
import { canAccessTrainingContent, getStudentAccessState } from '@/lib/student-access'

export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: '请先登录学员账号。' }, { status: 401 })
  }

  try {
    const state = await getStudentAccessState(user.id, user.email)

    return NextResponse.json({
      state,
      canAccessTraining: canAccessTrainingContent(state),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '读取报名状态失败。' },
      { status: 500 }
    )
  }
}
