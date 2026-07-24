export type RemittanceStatus =
  | 'pending_transfer'
  | 'pending_review'
  | 'approved'
  | 'rejected'

export type RemittanceAction =
  | 'report_transfer'
  | 'confirm_bank_match'
  | 'flag_exception'

const allowedTransitions: Record<
  RemittanceStatus,
  Partial<Record<RemittanceAction, RemittanceStatus>>
> = {
  pending_transfer: {
    report_transfer: 'pending_review',
  },
  pending_review: {
    report_transfer: 'pending_review',
    confirm_bank_match: 'approved',
    flag_exception: 'rejected',
  },
  approved: {},
  rejected: {
    report_transfer: 'pending_review',
  },
}

export function transitionRemittanceStatus(
  currentStatus: RemittanceStatus,
  action: RemittanceAction,
) {
  const nextStatus = allowedTransitions[currentStatus][action]
  if (!nextStatus) {
    throw new Error(`匯款狀態不允許由 ${currentStatus} 執行 ${action}。`)
  }
  return nextStatus
}

