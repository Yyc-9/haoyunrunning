const shortWeekdayPattern = /(?:週|周)([一二三四五六日天])/g

const englishWeekdays: Record<string, string> = {
  一: 'Monday',
  二: 'Tuesday',
  三: 'Wednesday',
  四: 'Thursday',
  五: 'Friday',
  六: 'Saturday',
  日: 'Sunday',
  天: 'Sunday',
}

export function formatCourseWeekday(value: string, language?: string) {
  return value.replace(shortWeekdayPattern, (_match, day: string) => (
    language === 'en' ? englishWeekdays[day] : `星期${day === '天' ? '日' : day}`
  ))
}
