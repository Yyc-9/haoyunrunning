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
    pending_transfer: '待匯款 / 待填寫後五碼',
    pending_review: '已提交後五碼，待人工核對',
    approved: '已核准，課表已開通',
    rejected: '核對未透過或需補充資料',
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
  accountName: '系統分配付款通道',
  bankName: '後台保密',
  bankCode: '後台保密',
  accountNumber: '不會在買家端顯示完整收款戶頭',
  amountNote: '請依訂單金額或客服確認为准。',
  paymentMemo: '請备注訂單編號或報名姓名，付款後提交转出帳戶後五碼。',
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
