type SessionAssignment = {
  id: string
  courseSeasonCourseId?: string
  sessionDate: string
  startTime: string
}

/** Group presentation only: retain every assignment and its independent actions. */
export function groupCoachDutySessions<T extends SessionAssignment>(items: T[]) {
  const groups = new Map<string, { key: string; items: T[] }>()
  for (const item of items) {
    const key = JSON.stringify([item.courseSeasonCourseId || item.id, item.sessionDate, item.startTime])
    const group = groups.get(key)
    if (group) group.items.push(item)
    else groups.set(key, { key, items: [item] })
  }
  return [...groups.values()]
}
