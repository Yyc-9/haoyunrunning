export type PaymentProvider = 'stripe' | 'ecpay' | 'newebpay'

export type PaymentMethodId = 'card' | 'bank_transfer' | 'instagram'

export type PaymentOrderStatus = 'pending_transfer' | 'pending_review' | 'approved' | 'rejected'

export const paymentOrderStatuses: PaymentOrderStatus[] = [
  'pending_transfer',
  'pending_review',
  'approved',
  'rejected',
]

export const paymentOrderStatusLabels = {
  'zh-TW': {
    pending_transfer: '待匯款 / 待填寫後五碼',
    pending_review: '已提交後五碼，待人工核對',
    approved: '付款已核准，報名已確認',
    rejected: '核對未通過或需補充資料',
  },
  'zh-CN': {
    pending_transfer: '待匯款 / 待填寫後五碼',
    pending_review: '已提交後五碼，待人工核對',
    approved: '付款已核准，報名已確認',
    rejected: '核對未透過或需補充資料',
  },
  en: {
    pending_transfer: 'Awaiting transfer / last five digits',
    pending_review: 'Last five digits submitted, pending review',
    approved: 'Payment approved, registration confirmed',
    rejected: 'Review failed or more information needed',
  },
} as const

export function isPaymentOrderStatus(value: string): value is PaymentOrderStatus {
  return paymentOrderStatuses.includes(value as PaymentOrderStatus)
}

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

export type BankTransferDetails = {
  accountName: string
  bankName: string
  bankCode: string
  accountNumber: string
  amountNote: string
  paymentMemo: string
}

export const bankTransferDetails: BankTransferDetails = {
  accountName: '待支付平台提供',
  bankName: '待支付平台提供',
  bankCode: '待支付平台提供',
  accountNumber: '尚未產生虛擬帳號',
  amountNote: '請依訂單顯示金額為準。',
  paymentMemo: '虛擬帳號服務接通後，系統會顯示付款期限與訂單代號。',
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

export function createCheckoutSession(draft: CheckoutDraft): CheckoutSessionResult {
  void draft

  return {
    status: 'coming_soon',
    message: 'Payment providers are not connected yet.',
  }
}
