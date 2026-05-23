import { NextResponse } from 'next/server'
import { createCheckoutSession, type CheckoutDraft } from '@/lib/payment'

export async function POST(request: Request) {
  const draft = (await request.json().catch(() => ({}))) as CheckoutDraft
  const session = createCheckoutSession(draft)

  return NextResponse.json(
    {
      ...session,
      error: 'Payment checkout is not connected yet.',
    },
    { status: 501 }
  )
}
