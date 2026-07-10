import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

function getSigningSecret() {
  return (
    process.env.ORDER_ACCESS_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ''
  )
}

export function createOrderAccessToken(orderId: string) {
  const secret = getSigningSecret()
  if (!secret || !orderId) return ''

  return createHmac('sha256', secret).update(`shop-order:${orderId}`).digest('base64url')
}

export function verifyOrderAccessToken(orderId: string, token: string) {
  if (!orderId || !token) return false

  const expected = createOrderAccessToken(orderId)
  if (!expected) return false

  const expectedBuffer = Buffer.from(expected)
  const tokenBuffer = Buffer.from(token)

  return expectedBuffer.length === tokenBuffer.length && timingSafeEqual(expectedBuffer, tokenBuffer)
}
