import assert from 'node:assert/strict'
import test from 'node:test'
import { localizeTrainingFeedback } from '../lib/training-feedback-language.ts'

test('stored feedback translates system fields while preserving authored text and filenames', () => {
  const input = '訓練感受：舒服\n原文第二行\n睡眠質量：很好\n疲勞程度：偏疲勞\n是否完成原計畫：完成原計畫\n疼痛 / 不適位置：右小腿\n備註：普通\n跑步截圖：跑步紀錄.png'
  assert.equal(localizeTrainingFeedback(input, 'en'), 'Training feeling: 舒服\n原文第二行\nSleep quality: Very good\nFatigue level: Somewhat fatigued\nPlan completion: Completed as planned\nPain / discomfort: 右小腿\nNotes: 普通\nRunning screenshot: 跑步紀錄.png')
  assert.equal(localizeTrainingFeedback(input, 'zh-TW'), input)
})

test('plain notes and incomplete legacy formats remain verbatim', () => {
  for (const value of ['普通', '備註：保持原文', 'Good session\n睡眠質量：普通', '睡眠質量：未填\n疲勞程度：普通']) {
    assert.equal(localizeTrainingFeedback(value, 'en'), value)
  }
})

test('every selectable feedback value renders without Chinese system text', () => {
  for (const sleep of ['很好', '普通', '偏差', '很差']) {
    for (const fatigue of ['輕鬆', '普通', '偏疲勞', '非常疲勞']) {
      for (const completion of ['完成原計畫', '部分完成', '改為輕鬆跑', '未完成 / 休息']) {
        const value = `睡眠質量：${sleep}\r\n疲勞程度：${fatigue}\r\n是否完成原計畫：${completion}\r\n疼痛 / 不適位置：無明顯不適`
        assert.doesNotMatch(localizeTrainingFeedback(value, 'en'), /[\u3400-\u9fff]/u)
      }
    }
  }
})
