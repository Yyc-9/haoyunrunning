import { allCourses } from '@/lib/goodluck-data'
import type { CourseOverride } from '@/lib/site-content'

export type ManagedCourse = (typeof allCourses)[number]

export function applyCourseOverrides(
  courseOverrides: Record<string, CourseOverride>,
  options: { includeInactive?: boolean } = {}
) {
  return allCourses
    .map((course) => {
      const override = courseOverrides[course.slug]
      if (!override) return course

      const name = override.name || course.name
      const weekday = override.weekday || course.weekday
      const location = override.location || course.location
      const period = override.period || course.period
      const classTime = override.classTime || course.classTime
      const meetingPoint = override.meetingPoint || course.meetingPoint
      const focus = override.focus || course.focus
      const feeNote = override.feeNote || course.feeNote
      const signupUrl = override.signupUrl || course.signupUrl

      return {
        ...course,
        ...override,
        name,
        title: override.name || course.title,
        weekday,
        location,
        city: location,
        period,
        classTime,
        time: classTime,
        meetingPoint,
        focus,
        trainingGoal: focus,
        trainingGoals: focus ? [focus] : course.trainingGoals,
        feeNote,
        priceNote: feeNote,
        signupUrl,
        targetAudience: override.targetAudience || course.targetAudience,
      }
    })
    .filter((course) => options.includeInactive || courseOverrides[course.slug]?.active !== false)
}
