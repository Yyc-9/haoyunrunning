import { allCourses, coachProfiles } from '@/lib/goodluck-data'
import { coachPublicProfileToCoach, getStaticCoachKey, type CoachPublicProfileMap } from '@/lib/coach-profiles'
import { compareCourses, normalizeCourseLocation } from '@/lib/course-sort'
import type { CourseOverride } from '@/lib/site-content'

export type ManagedCourse = (typeof allCourses)[number]

export function applyCourseOverrides(
  courseOverrides: Record<string, CourseOverride>,
  options: { includeInactive?: boolean; coachProfiles?: CoachPublicProfileMap } = {}
) {
  return allCourses
    .map((course) => {
      const override = courseOverrides[course.slug]
      const defaultCoachKeys = (course.coaches ?? []).map(getStaticCoachKey).filter((key): key is string => Boolean(key))
      const requestedCoachKeys = override?.coachKeys?.length ? override.coachKeys : defaultCoachKeys
      const resolvedCoaches = requestedCoachKeys
        .map((coachKey) => {
          const publicProfile = options.coachProfiles?.[coachKey]
          if (publicProfile) return publicProfile.published ? coachPublicProfileToCoach(publicProfile) : null
          return coachProfiles[coachKey as keyof typeof coachProfiles]
        })
        .filter((coach): coach is NonNullable<typeof coach> => Boolean(coach))
      const hasPublicProfiles = requestedCoachKeys.some((coachKey) => Boolean(options.coachProfiles?.[coachKey]))
      const coaches = hasPublicProfiles ? resolvedCoaches : course.coaches
      const coach = coaches?.[0] ?? course.coach

      if (!override) {
        const location = normalizeCourseLocation(course.location)
        return { ...course, location, city: location, coach, coaches }
      }

      const name = override.name || course.name
      const weekday = override.weekday || course.weekday
      const location = normalizeCourseLocation(override.location || course.location)
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
        coach,
        coaches,
        targetAudience: override.targetAudience || course.targetAudience,
      }
    })
    .filter((course) => options.includeInactive || courseOverrides[course.slug]?.active !== false)
    .sort(compareCourses)
}
