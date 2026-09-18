import assert from 'node:assert/strict'
import test from 'node:test'
import { courseRosterTable, registrationExportFields, rosterCsv } from '../lib/enrollment-export.ts'

const order = {
  id: 'registration-id', seasonName: '2026 第四季', orderNumber: '', studentName: '測試跑者',
  email: 'runner@example.com', courseName: '週一班', amountText: 'NT$6,000', transferLastFive: '01234',
  submittedAt: '2026-09-18T00:00:00Z', notes: '第一行\n第二行,"備註"', reviewNote: '人工核對完成',
  registrationDetails: registrationExportFields.map((label) => ({ label, value: `${label}內容` })),
}

test('roster exports every registration detail in a stable order and management note last', () => {
  const table = courseRosterTable([order], () => '已確認入帳')
  assert.equal(table.rows[0].length, table.headers.length)
  for (const field of registrationExportFields) assert.equal(table.rows[0][table.headers.indexOf(field)], `${field}內容`)
  assert.deepEqual(table.headers.slice(0, 5), ['季度', '報名編號', '班級', '姓名', '電子信箱'])
  assert.equal(table.rows[0].at(-1), '人工核對完成')
  assert.equal(table.rows[0][table.headers.indexOf('報名備註')], order.notes)
  assert.equal(table.rows[0][1], order.id)
  assert.deepEqual(courseRosterTable([], () => '').headers, table.headers)
})

test('missing details remain blank; old combined emergency contact and new fields survive export', () => {
  const table = courseRosterTable([{ ...order, registrationDetails: [{ label: '緊急聯絡人', value: '家人｜0912345678' }, { label: '新增報名欄位', value: '原始填答' }] }], () => '')
  for (const [field, expected] of [['手機電話', ''], ['緊急聯絡人姓名', '家人'], ['緊急聯絡人電話', '0912345678'], ['新增報名欄位', '原始填答']]) {
    assert.equal(table.rows[0][table.headers.indexOf(field)], expected)
  }
})

test('CSV preserves Chinese, multiline answers and escaping while protecting spreadsheet cells', () => {
  const csv = rosterCsv(['姓名', '備註', '電話', '後五碼'], [['跑者', '多行\n含,"引號"', '0912345678', '01234'], [' =SUM(1,2)', '+123', '@line', '-1']])
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.includes('"多行\n含,""引號"""'))
  assert.ok(csv.includes('"\'0912345678"'))
  assert.ok(csv.includes('"\'01234"'))
  assert.ok(csv.includes('"\' =SUM(1,2)"'))
})
