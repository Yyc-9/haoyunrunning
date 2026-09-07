import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: '教練認證碼已取消，請由管理員依登記信箱啟用教練帳號。',
      code: 'COACH_CODE_RETIRED',
    },
    { status: 410 },
  )
}
