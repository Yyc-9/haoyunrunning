import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { CourseRegistrationQuote } from '@/lib/course-pricing'

export type CourseQuoteTokenPayload = {
  version: 1
  email: string
  courseSlug: string
  seasonId: string
  referrer: string
  quote: CourseRegistrationQuote
}

function signingSecret() {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('課程報價簽名服務尚未設定。')
  return secret
}

function signature(payload: string) {
  return createHmac('sha256', signingSecret()).update(payload).digest('base64url')
}

export function createCourseQuoteToken(payload: CourseQuoteTokenPayload) {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${encoded}.${signature(encoded)}`
}

export function verifyCourseQuoteToken(token: string): CourseQuoteTokenPayload | null {
  const [encoded, receivedSignature] = token.split('.')
  if (!encoded || !receivedSignature) return null

  const expectedSignature = signature(encoded)
  const received = Buffer.from(receivedSignature)
  const expected = Buffer.from(expectedSignature)
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as CourseQuoteTokenPayload
    if (payload.version !== 1 || !payload.email || !payload.courseSlug || !payload.seasonId || !payload.quote) return null
    return payload
  } catch {
    return null
  }
}
