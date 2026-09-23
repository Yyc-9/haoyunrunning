const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''

/** Only contact information is exposed in the emergency directory. */
export function coachEmergencyContact(row: Record<string, unknown>) {
  const payload = row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
    ? row.payload as Record<string, unknown> : {}
  return {
    id: text(row.id),
    name: text(row.name),
    phone: text(row.phone),
    email: text(row.email),
    emergency_contact_name: text(payload.emergencyContactName) || text(row.emergency_contact_name),
    emergency_contact_phone: text(payload.emergencyContactPhone) || text(row.emergency_contact_phone),
    line_id: text(payload.lineId) || text(row.line_id),
  }
}

export type CoachEmergencyContact = ReturnType<typeof coachEmergencyContact>
export const emergencyContactColumns = [
  ['name', '學員姓名', 'Student name'],
  ['phone', '學員電話', 'Student phone'],
  ['email', '學員信箱', 'Student email'],
  ['emergency_contact_name', '緊急聯絡人姓名', 'Emergency contact name'],
  ['emergency_contact_phone', '緊急聯絡人電話', 'Emergency contact phone'],
  ['line_id', 'LINE ID', 'LINE ID'],
] as const

export function emergencyContactTable(contacts: CoachEmergencyContact[], english = false) {
  return {
    headers: emergencyContactColumns.map(([, zh, en]) => english ? en : zh),
    rows: contacts.map(contact => emergencyContactColumns.map(([key]) => contact[key])),
  }
}
