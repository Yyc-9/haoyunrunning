import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { preferredCourseSeasonId } from '../lib/course-seasons.ts'

test('季度統計優先招生中，不受已封存的 current 標記或陣列順序影響', () => {
 const q3 = {id:'q3',code:'2026-Q3',status:'archived' as const,isCurrent:true}
 const q4 = {id:'q4',code:'2026-Q4',status:'enrolling' as const,isCurrent:false}
 assert.equal(preferredCourseSeasonId([q3,q4]),'q4')
 assert.equal(preferredCourseSeasonId([q4,q3]),'q4')
 assert.equal(preferredCourseSeasonId([]),'')
 assert.equal(preferredCourseSeasonId([{...q3,status:'active'},q4]),'q4')
 assert.equal(preferredCourseSeasonId([{...q3,status:'active'},{...q4,status:'draft'}]),'q3')
})
test('同時招生時先選指定當期，再選最新季度，且不修改輸入順序', () => {
 const items = [{id:'q3',code:'2026-Q3',status:'enrolling' as const,isCurrent:true},{id:'q4',code:'2026-Q4',status:'enrolling' as const,isCurrent:false}]
 assert.equal(preferredCourseSeasonId(items),'q3')
 assert.equal(preferredCourseSeasonId(items.map(s=>({...s,isCurrent:false}))),'q4')
 assert.equal(items[0].id,'q3')
})
test('課程表列表保留時間地點，不再顯示日期週期', () => {
 const source=readFileSync(new URL('../components/CoursesTable.tsx',import.meta.url),'utf8')
 assert.doesNotMatch(source,/course\.period/)
 assert.match(source,/course\.classTime/)
 assert.match(source,/course\.meetingPoint/)
 assert.match(source,/weekdayText\(weekday\)/)
})
test('活動前台使用保留段落的純文字呈現，不注入 HTML', () => {
 for(const file of ['../components/UpcomingActivitiesSection.tsx','../app/anniversary/AnniversaryPageClient.tsx']){
  const source=readFileSync(new URL(file,import.meta.url),'utf8')
  assert.match(source,/whitespace-pre-wrap/)
  assert.doesNotMatch(source,/dangerouslySetInnerHTML/)
 }
})

