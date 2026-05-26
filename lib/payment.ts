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
    approved: '已核准，課表已開通',
    rejected: '核對未通過或需補充資料',
  },
  'zh-CN': {
    pending_transfer: '待汇款 / 待填写后五码',
    pending_review: '已提交后五码，待人工核对',
    approved: '已核准，课表已开通',
    rejected: '核对未通过或需补充资料',
  },
  en: {
    pending_transfer: 'Awaiting transfer / last five digits',
    pending_review: 'Last five digits submitted, pending review',
    approved: 'Approved, training access enabled',
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
  accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || '好運跑班（待補正式戶名）',
  bankName: process.env.NEXT_PUBLIC_BANK_NAME || '待補銀行名稱',
  bankCode: process.env.NEXT_PUBLIC_BANK_CODE || '待補銀行代碼',
  accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || '待補匯款帳號',
  amountNote: process.env.NEXT_PUBLIC_PAYMENT_AMOUNT_NOTE || '請依 Instagram 確認的課程費用與名額為準。',
  paymentMemo: process.env.NEXT_PUBLIC_PAYMENT_MEMO || '請備註：報名姓名 + 課程名稱，方便核對。',
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
