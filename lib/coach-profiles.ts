import { allCourses, coachProfiles, type Coach } from '@/lib/goodluck-data'

export type CoachPublicProfile = {
  coachKey: string
  displayName: string
  nickname: string
  role: string
  bio: string
  avatarUrl: string
  fullBodyImageUrl: string
  avatarFocusX: number
  avatarFocusY: number
  fullBodyFocusX: number
  fullBodyFocusY: number
  specialties: string[]
  style: string
  achievements: string[]
  certifications: string[]
  published: boolean
}

export type CoachPublicProfileRow = {
  coach_key: string
  owner_profile_id?: string | null
  verification_email?: string | null
  display_name?: string | null
  nickname?: string | null
  role_title?: string | null
  bio?: string | null
  avatar_url?: string | null
  full_body_image_url?: string | null
  avatar_focus_x?: number | null
  avatar_focus_y?: number | null
  full_body_focus_x?: number | null
  full_body_focus_y?: number | null
  specialties?: unknown
  style?: string | null
  achievements?: unknown
  certifications?: unknown
  profile_initialized?: boolean | null
  published?: boolean | null
}

export type CoachPublicProfileMap = Record<string, CoachPublicProfile>

function clampFocus(value: unknown, fallback: number) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : fallback
}

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item ?? '').trim()).filter(Boolean).slice(0, 20)
}

function defaultProfile(coachKey: string, coach: Coach): CoachPublicProfile {
  return {
    coachKey,
    displayName: coach.name,
    nickname: coach.nickname ?? '',
    role: coach.role,
    bio: coach.bio,
    avatarUrl: coach.imageUrl ?? '',
    fullBodyImageUrl: coach.fullBodyImageUrl || coach.imageUrl || '',
    avatarFocusX: coach.avatarFocusX ?? 50,
    avatarFocusY: coach.avatarFocusY ?? 18,
    fullBodyFocusX: coach.fullBodyFocusX ?? 50,
    fullBodyFocusY: coach.fullBodyFocusY ?? 18,
    specialties: coach.specialties,
    style: coach.style,
    achievements: coach.achievements,
    certifications: coach.certifications ?? [],
    published: true,
  }
}

export const defaultCoachPublicProfiles = Object.fromEntries(
  Object.entries(coachProfiles).map(([coachKey, coach]) => [coachKey, defaultProfile(coachKey, coach)])
) as CoachPublicProfileMap

export const coachProfileOptions = Object.values(defaultCoachPublicProfiles)

export function coachPublicProfilesFromRows(rows: CoachPublicProfileRow[] | null | undefined): CoachPublicProfileMap {
  const result = { ...defaultCoachPublicProfiles }

  for (const row of rows ?? []) {
    const initialized = row.profile_initialized === true
    const fallback = result[row.coach_key] ?? {
      coachKey: row.coach_key,
      displayName: String(row.display_name ?? '').trim(),
      nickname: '',
      role: '',
      bio: '',
      avatarUrl: '',
      fullBodyImageUrl: '',
      avatarFocusX: 50,
      avatarFocusY: 18,
      fullBodyFocusX: 50,
      fullBodyFocusY: 18,
      specialties: [],
      style: '',
      achievements: [],
      certifications: [],
      published: true,
    }
    if (!fallback.displayName) continue

    result[row.coach_key] = {
      coachKey: row.coach_key,
      displayName: initialized ? String(row.display_name ?? '').trim() || fallback.displayName : fallback.displayName,
      nickname: initialized ? String(row.nickname ?? '').trim() : fallback.nickname,
      role: initialized ? String(row.role_title ?? '').trim() : fallback.role,
      bio: initialized ? String(row.bio ?? '').trim() : fallback.bio,
      avatarUrl: initialized ? String(row.avatar_url ?? '').trim() || fallback.avatarUrl : fallback.avatarUrl,
      fullBodyImageUrl: initialized ? String(row.full_body_image_url ?? '').trim() || fallback.fullBodyImageUrl : fallback.fullBodyImageUrl,
      avatarFocusX: initialized ? clampFocus(row.avatar_focus_x, fallback.avatarFocusX) : fallback.avatarFocusX,
      avatarFocusY: initialized ? clampFocus(row.avatar_focus_y, fallback.avatarFocusY) : fallback.avatarFocusY,
      fullBodyFocusX: initialized ? clampFocus(row.full_body_focus_x, fallback.fullBodyFocusX) : fallback.fullBodyFocusX,
      fullBodyFocusY: initialized ? clampFocus(row.full_body_focus_y, fallback.fullBodyFocusY) : fallback.fullBodyFocusY,
      specialties: initialized ? cleanList(row.specialties) : fallback.specialties,
      style: initialized ? String(row.style ?? '').trim() : fallback.style,
      achievements: initialized ? cleanList(row.achievements) : fallback.achievements,
      certifications: initialized ? cleanList(row.certifications) : fallback.certifications,
      published: row.published !== false,
    }
  }

  return result
}

export function coachPublicProfileToCoach(profile: CoachPublicProfile): Coach {
  return {
    name: profile.displayName,
    nickname: profile.nickname || undefined,
    role: profile.role,
    bio: profile.bio,
    imageUrl: profile.avatarUrl,
    fullBodyImageUrl: profile.fullBodyImageUrl,
    avatarFocusX: profile.avatarFocusX,
    avatarFocusY: profile.avatarFocusY,
    fullBodyFocusX: profile.fullBodyFocusX,
    fullBodyFocusY: profile.fullBodyFocusY,
    specialties: profile.specialties,
    style: profile.style,
    achievements: profile.achievements,
    certifications: profile.certifications,
  }
}

export function getStaticCoachKey(coach: Coach) {
  return Object.entries(coachProfiles).find(([, candidate]) => candidate === coach || candidate.imageUrl === coach.imageUrl)?.[0]
}

export function getDefaultCourseCoachKeys(courseSlug: string) {
  const course = allCourses.find((candidate) => candidate.slug === courseSlug)
  return (course?.coaches ?? []).map(getStaticCoachKey).filter((coachKey): coachKey is string => Boolean(coachKey))
}
