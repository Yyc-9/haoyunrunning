// A background refresh may update the saved baseline, but must not erase unsaved edits.
export function reconcileCourseField<T>(current: T, previous: T | undefined, incoming: T, sameCourse: boolean): T {
  return !sameCourse || JSON.stringify(current) === JSON.stringify(previous) ? incoming : current
}
