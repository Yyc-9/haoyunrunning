type ExportEnrollment = {
  id: string; seasonName: string; orderNumber: string; studentName: string; email: string;
  courseName: string; amountText: string; transferLastFive: string; submittedAt: string;
  notes: string; reviewNote: string | null;
  registrationDetails: Array<{ label: string; value: string }>;
}

export const registrationExportFields = [
  '學員身分', '報名時點', '計價方式', '計費起始課次', '最近一堂到課申報', '收費課次',
  '手機電話', 'LINE ID', '緊急聯絡人姓名', '緊急聯絡人電話', '推薦人', '推薦資格',
  '近期挑戰', '近期目標', '病史或運動傷害', '跑步近況',
  '發票方式', '載具或信箱', '統編與抬頭',
  '教練代課同意', '課程規範同意', '報名最終同意', '同意時間',
  '課程條款版本', '退費政策版本', '隱私政策版本', '發票說明版本',
  '報價鎖定至', '已扣除課次',
] as const

export function courseRosterTable<T extends ExportEnrollment>(orders: T[], statusLabel: (order: T) => string) {
  // Keep a stable column order even for empty quarters or records with missing optional fields.
  const known = new Set<string>(registrationExportFields)
  const extra = [...new Set(orders.flatMap((order) => order.registrationDetails.map((detail) => detail.label)))]
    .filter((label) => !known.has(label) && label !== '緊急聯絡人').sort()
  const fields = [...registrationExportFields, ...extra]
  const headers = ['季度', '報名編號', '班級', '姓名', '電子信箱', ...fields, '報名備註', '金額', '匯款後五碼', '付款狀態', '提交時間', '管理備註']
  const rows = orders.map((order) => {
    const details = new Map(order.registrationDetails.map((detail) => [detail.label, detail.value]))
    const legacyContact = details.get('緊急聯絡人')?.split('｜') ?? []
    if (!details.has('緊急聯絡人姓名')) details.set('緊急聯絡人姓名', legacyContact[0] ?? '')
    if (!details.has('緊急聯絡人電話')) details.set('緊急聯絡人電話', legacyContact.slice(1).join('｜'))
    return [order.seasonName, order.orderNumber || order.id, order.courseName, order.studentName, order.email,
      ...fields.map((field) => details.get(field) ?? ''), order.notes, order.amountText,
      order.transferLastFive, statusLabel(order), order.submittedAt, order.reviewNote ?? '']
  })
  return { headers, rows }
}

export function rosterCsv(headers: string[], rows: string[][]) {
  const cell = (value: string) => {
    let text = value ?? ''
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`
    // Preserve leading zeroes in telephone numbers, remittance codes and numeric LINE IDs.
    if (/^0\d+$/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  return '\uFEFF' + [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')
}
