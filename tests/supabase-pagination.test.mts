import assert from 'node:assert/strict'
import test from 'node:test'
import { readAllRows, readAllRowsResult } from '../lib/supabase-pagination.ts'
test('reads every row beyond the default 1000-row database limit', async () => {
  const data = Array.from({ length: 1207 }, (_, id) => ({ id }))
  const ranges: number[][] = []
  const rows = await readAllRows(async (from, to) => { ranges.push([from, to]); return { data: data.slice(from, to + 1), error: null } })
  assert.equal(rows.length, 1207)
  assert.equal(rows.at(-1)?.id, 1206)
  assert.deepEqual(ranges, [[0,499],[500,999],[1000,1499]])
})
test('a failed later page cannot return a partial list as complete', async () => {
  await assert.rejects(readAllRows(async from => from ? { data: null, error: { message: 'Page failed' } } : { data: [1,2], error: null }, 2), /Page failed/)
  await assert.rejects(readAllRows(async () => ({ data: null, error: null })), /完整記錄/)
  await assert.rejects(readAllRows(async () => ({ data: [], error: null }), 0), /Invalid page size/)
})
test('dashboard pagination preserves schema errors and discards partial results', async () => {
  const result=await readAllRowsResult(async from=>from ? {data:null,error:{message:'Missing table',code:'42P01'}} : {data:Array.from({length:500},(_,id)=>({id})),error:null})
  assert.equal(result.data,null)
  assert.equal(result.error?.code,'42P01')
  assert.equal(result.error?.message,'Missing table')
  const data=Array.from({length:1501},(_,id)=>({id}))
  const all=await readAllRowsResult(async(from,to)=>({data:data.slice(from,to+1),error:null}))
  assert.equal(all.error,null);assert.equal(all.data?.length,1501)
})
