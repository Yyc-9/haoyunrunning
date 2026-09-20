export type RegistrationField = { label: string; value: string }

const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''

/** Explicit form-field allowlist: never expose the raw payload or payment internals. */
export function coachRegistrationFields(row: Record<string, unknown>): RegistrationField[] {
  const payload = row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
    ? row.payload as Record<string, unknown> : {}
  const agreements = payload.agreements && typeof payload.agreements === 'object'
    ? payload.agreements as Record<string, unknown> : {}
  const booleanText = (value: unknown) => typeof value === 'boolean' ? (value ? '是' : '否') : ''
  const identity = text(row.registration_identity) || text(payload.studentType)
  return [
    ['報名姓名', text(row.name)], ['Email', text(row.email)], ['電話', text(row.phone)],
    ['報名課程', text(row.preferred_course)], ['學員身分', identity === 'new' ? '新學員' : identity === 'returning' ? '舊學員' : identity],
    ['LINE ID', text(payload.lineId)], ['Instagram', text(row.instagram)],
    ['緊急聯絡人', text(payload.emergencyContactName)], ['緊急聯絡電話', text(payload.emergencyContactPhone)],
    ['推薦人', text(payload.referrer)], ['近期挑戰', text(payload.recentChallenge)],
    ['近期目標', text(payload.recentGoal) || text(row.goal)], ['病史或運動傷害', text(payload.injuryHistory)],
    ['跑步近況', text(payload.runningStatus)], ['跑步經驗', text(row.running_experience)],
    ['起算上課日', text(row.billing_start_session_date) || text(payload.billingStartSessionDate)],
    ['曾提前上課', booleanText(row.prior_attendance_claimed ?? payload.priorAttendanceClaimed)],
    ['匯款金額', text(row.amount_text)], ['帳號後五碼', text(row.transfer_last_five)],
    ['發票寄送方式', text(payload.invoiceDelivery)], ['發票寄送資料', text(payload.invoiceDetail)],
    ['統編與抬頭', text(payload.taxInvoiceInfo)], ['備註', text(row.notes)],
    ['同意教練代課', booleanText(agreements.coachSubstituteConsent)],
    ['同意課程規則', booleanText(agreements.rulesConsent)], ['最終確認', booleanText(agreements.finalConsent)],
    ['同意時間', text(agreements.agreedAt)],
  ].map(([label, value]) => ({ label, value }))
}
