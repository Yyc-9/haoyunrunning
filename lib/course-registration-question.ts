export type CourseRegistrationQuestion = { enabled: boolean; title: string; options: string[]; required: boolean }

export function questionConfigError(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'object' || Array.isArray(value)) return '報名下拉題設定無效。'
  const q = value as Partial<CourseRegistrationQuestion>
  if (!q.enabled) return null
  if (q.enabled !== true || typeof q.title !== 'string' || !q.title.trim() || q.title.trim().length > 200) return '請填寫報名下拉題題目（最多200字）。'
  if (typeof q.required !== 'boolean' || !Array.isArray(q.options) || q.options.length < 1 || q.options.length > 30
    || q.options.some(o => typeof o !== 'string' || !o.trim() || o.trim().length > 120)) return '請填寫1至30個選項，每個最多120字，不能留空。'
  if (new Set(q.options.map(o => o.trim())).size !== q.options.length) return '報名下拉題的選項不能重複。'
  return null
}

export function normalizeRegistrationQuestion(value: unknown): CourseRegistrationQuestion | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const q = value as Partial<CourseRegistrationQuestion>
  if (questionConfigError(value)) return undefined
  return { enabled: q.enabled === true, title: typeof q.title === 'string' ? q.title.trim().slice(0, 200) : '',
    options: Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === 'string').map(o => o.trim().slice(0, 120)).filter(Boolean).slice(0, 30) : [], required: q.required === true }
}

export function registrationQuestionVersion(question: CourseRegistrationQuestion | undefined) {
  return question?.enabled ? JSON.stringify(question) : ''
}

export function registrationQuestionAnswer(question: CourseRegistrationQuestion | undefined, value: unknown, version: unknown) {
  if (!question?.enabled) {
    if (version) throw new Error('報名題目已更新，請重新整理頁面後再送出。')
    return null
  }
  if (version !== registrationQuestionVersion(question)) throw new Error('報名題目已更新，請重新整理頁面後再送出。')
  if (value != null && typeof value !== 'string') throw new Error('請選擇有效的報名選項。')
  const answer = typeof value === 'string' ? value : ''
  if (!answer && question.required) throw new Error(`請選擇「${question.title}」。`)
  if (answer && !question.options.includes(answer)) throw new Error('報名選項已更新，請重新選擇。')
  return { title: question.title, answer, options: [...question.options], required: question.required }
}
