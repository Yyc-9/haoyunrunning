export type ProfileGender = '' | 'male' | 'female' | 'other'

export function normalizeProfileGender(value: unknown): ProfileGender {
  return value === 'male' || value === 'female' || value === 'other' ? value : ''
}
