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

function createScopedAccessToken(scope: string, orderId: string) {
  const secret = getSigningSecret()
  if (!secret || !scope || !orderId) return ''

  return createHmac('sha256', secret).update(`${scope}:${orderId}`).digest('base64url')
}

function verifyScopedAccessToken(scope: string, orderId: string, token: string) {
  if (!orderId || !token) return false

  const expected = createScopedAccessToken(scope, orderId)
  if (!expected) return false

  const expectedBuffer = Buffer.from(expected)
  const tokenBuffer = Buffer.from(token)

  return expectedBuffer.length === tokenBuffer.length && timingSafeEqual(expectedBuffer, tokenBuffer)
}

export function createOrderAccessToken(orderId: string) {
  return createScopedAccessToken('shop-order', orderId)
}

export function verifyOrderAccessToken(orderId: string, token: string) {
  return verifyScopedAccessToken('shop-order', orderId, token)
}

export function createCourseOrderAccessToken(orderId: string) {
  return createScopedAccessToken('course-order', orderId)
}

export function verifyCourseOrderAccessToken(orderId: string, token: string) {
  return verifyScopedAccessToken('course-order', orderId, token)
}
