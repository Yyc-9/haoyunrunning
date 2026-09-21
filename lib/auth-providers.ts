export const socialProviders = [
  { id: 'google', label: 'Google' },
  { id: 'azure', label: 'Microsoft' },
  { id: 'apple', label: 'Apple' },
  { id: 'facebook', label: 'Facebook' },
] as const

export type SocialProvider = typeof socialProviders[number]['id']

export function enabledSocialProviders(external: Record<string, unknown>) {
  return socialProviders.filter(provider => external[provider.id] === true)
}

export function socialProviderScopes(provider: SocialProvider) {
  return provider === 'azure' ? 'email' : undefined
}
