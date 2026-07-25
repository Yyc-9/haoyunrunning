export type CoachDutyCalendarItem = {
  id: string
  sessionDate: string
  startTime: string
}

export function groupCoachDutyCalendarItems<T extends CoachDutyCalendarItem>(items: T[]) {
  const grouped = new Map<string, T[]>()

  items.forEach((item) => {
    grouped.set(item.sessionDate, [...(grouped.get(item.sessionDate) ?? []), item])
  })
  grouped.forEach((events) => {
    events.sort((left, right) => left.startTime.localeCompare(right.startTime))
  })

  return grouped
}

export function selectCoachDutyCalendarDate<T extends CoachDutyCalendarItem>(
  grouped: Map<string, T[]>,
  date: string,
  currentDate: string,
) {
  if (date === currentDate) return { selectedDate: '', selectedId: '' }

  const firstEvent = grouped.get(date)?.[0]
  if (!firstEvent) return { selectedDate: '', selectedId: '' }

  return { selectedDate: date, selectedId: firstEvent.id }
}
