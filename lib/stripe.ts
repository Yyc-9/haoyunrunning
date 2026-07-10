import 'server-only'

import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secretKey) return null

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      maxNetworkRetries: 2,
      typescript: true,
    })
  }

  return stripeClient
}
