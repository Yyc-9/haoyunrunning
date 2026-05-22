export type StudentDisplayProfile = {
  id?: string | null
  name?: string | null
  display_name?: string | null
  full_name?: string | null
  email?: string | null
}

export function getStudentDisplayName(profile: StudentDisplayProfile | null | undefined) {
  const name = profile?.display_name?.trim() || profile?.full_name?.trim() || profile?.name?.trim()
  return name || profile?.email?.trim() || ''
}

export function getStudentDisplayEmail(profile: StudentDisplayProfile | null | undefined) {
  return profile?.email?.trim() || ''
}

export function hasStudentName(profile: StudentDisplayProfile | null | undefined) {
  return Boolean(profile?.display_name?.trim() || profile?.full_name?.trim() || profile?.name?.trim())
}
