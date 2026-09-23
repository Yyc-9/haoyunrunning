import assert from 'node:assert/strict'
import test from 'node:test'
import { coachEmergencyContact, emergencyContactTable } from '../lib/coach-emergency-contacts.ts'
import { rosterCsv } from '../lib/enrollment-export.ts'

test('contact projection excludes registration and financial data', () => {
  const contact = coachEmergencyContact({ id: '1', name: '學員', phone: '0912345678', email: 'test@example.com', status: 'approved', notes: 'private', payload: { emergencyContactName: '家人', emergencyContactPhone: '031234567', lineId: '=unsafe', pricing: { amount: 6000 }, injuryHistory: 'private' } })
  assert.deepEqual(Object.keys(contact), ['id', 'name', 'phone', 'email', 'emergency_contact_name', 'emergency_contact_phone', 'line_id'])
  assert.equal(contact.emergency_contact_name, '家人')
  assert.deepEqual(coachEmergencyContact(contact), contact)
  const table = emergencyContactTable([contact])
  assert.equal(table.headers.length, 6)
  assert.equal(table.rows[0].length, 6)
  const csv = rosterCsv(table.headers, table.rows)
  assert.ok(csv.includes("'0912345678"))
  assert.ok(csv.includes("'=unsafe"))
  assert.ok(!csv.includes('private'))
  assert.ok(!csv.includes('6000'))
})

test('missing contact fields stay empty and English export has stable columns', () => {
  const contact = coachEmergencyContact({ id: '2', name: ' 測試 ', payload: null })
  assert.equal(contact.name, '測試')
  assert.equal(contact.line_id, '')
  assert.equal(contact.emergency_contact_phone, '')
  assert.deepEqual(emergencyContactTable([contact], true).headers, ['Student name', 'Student phone', 'Student email', 'Emergency contact name', 'Emergency contact phone', 'LINE ID'])
})
