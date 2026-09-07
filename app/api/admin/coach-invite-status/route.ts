import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      error: '教練認證碼已取消，請由管理員依登記信箱管理教練帳號。',
      code: 'COACH_CODE_RETIRED',
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  )
}
