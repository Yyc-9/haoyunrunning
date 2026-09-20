const sleepLabels: Record<string, string> = { 很好: 'Very good', 普通: 'Average', 偏差: 'Poor', 很差: 'Very poor' }
const fatigueLabels: Record<string, string> = { 輕鬆: 'Fresh', 普通: 'Normal', 偏疲勞: 'Somewhat fatigued', 非常疲勞: 'Very fatigued' }
const completionLabels: Record<string, string> = { 完成原計畫: 'Completed as planned', 部分完成: 'Partially completed', 改為輕鬆跑: 'Changed to an easy run', '未完成 / 休息': 'Not completed / Rest' }

// Existing records store generated labels and authored text in one field.
// Recognize the full generated format; plain notes must remain verbatim.
export function localizeTrainingFeedback(value: string, language: string): string {
  if (language !== 'en') return value
  const match = value.match(/^(?:訓練感受：([\s\S]*?)\r?\n)?睡眠質量：(很好|普通|偏差|很差)\r?\n疲勞程度：(輕鬆|普通|偏疲勞|非常疲勞)\r?\n是否完成原計畫：(完成原計畫|部分完成|改為輕鬆跑|未完成 \/ 休息)\r?\n疼痛 \/ 不適位置：([\s\S]*)$/u)
  if (!match) return value
  const [, feeling, sleep, fatigue, completion, remainder] = match
  const tail = remainder.split(/\r?\n(?=備註：|跑步截圖：)/u)
  const pain = tail.shift() ?? ''
  return [
    ...(feeling === undefined ? [] : [`Training feeling: ${feeling}`]),
    `Sleep quality: ${sleepLabels[sleep]}`,
    `Fatigue level: ${fatigueLabels[fatigue]}`,
    `Plan completion: ${completionLabels[completion]}`,
    `Pain / discomfort: ${pain === '無明顯不適' ? 'No noticeable discomfort' : pain}`,
    ...tail.map(line => line.startsWith('備註：') ? `Notes: ${line.slice(3)}` : `Running screenshot: ${line.slice(5)}`),
  ].join('\n')
}
