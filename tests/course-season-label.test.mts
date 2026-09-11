import assert from 'node:assert/strict'
import test from 'node:test'
import { courseSeasonCampaignLabel, nextCourseSeasonIdentity } from '../lib/course-seasons.ts'

test('季度小標跟隨季度編號，包含第四季與跨年', () => {
  assert.equal(courseSeasonCampaignLabel('2026-Q3'), 'S3 | 2026 RUNNING CAMP')
  assert.equal(courseSeasonCampaignLabel('2026-Q4'), 'S4 | 2026 RUNNING CAMP')
  assert.equal(courseSeasonCampaignLabel(nextCourseSeasonIdentity('2026-Q4').code), 'S1 | 2027 RUNNING CAMP')
  assert.equal(courseSeasonCampaignLabel('invalid'), '')
})
