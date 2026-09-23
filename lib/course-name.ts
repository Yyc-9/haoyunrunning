/** Use the offering quarter, including when a course is copied to another season. */
export function seasonCourseName(name: string, code: string) {
  if (!/^\d{4}-Q[1-4]$/.test(code)) return name
  const short = name.trim()
    .replace(/^\d{4}\s*好運跑步訓練營\s*[XＸ×]\s*/u, '')
    .replace(/^\d{4}\s*-?Q[1-4]\s*/u, '')
    .replace(/\s+/gu, '')
  return short ? code.replace('-', '') + short : name
}
