export type PaymentProvider = 'stripe' | 'ecpay' | 'newebpay'

export type PaymentMethodId = 'card' | 'bank_transfer' | 'instagram'

export type CheckoutDraft = {
  courseSlug?: string
  customerName?: string
  email?: string
  amountNote?: string
  method?: PaymentMethodId
}

export type CheckoutSessionResult = {
  status: 'coming_soon'
  provider?: PaymentProvider
  message: string
}

export const paymentProviders: Record<PaymentProvider, { enabled: boolean; secretEnv: string }> = {
  stripe: {
    enabled: false,
    secretEnv: 'STRIPE_SECRET_KEY',
  },
  ecpay: {
    enabled: false,
    secretEnv: 'ECPAY_HASH_KEY',
  },
  newebpay: {
    enabled: false,
    secretEnv: 'NEWEBPAY_HASH_KEY',
  },
}

export function createCheckoutSession(_draft: CheckoutDraft): CheckoutSessionResult {
  return {
    status: 'coming_soon',
    message: 'Payment providers are not connected yet.',
  }
}
