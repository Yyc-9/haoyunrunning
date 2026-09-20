/** Merge refreshed values without discarding edits made in another content panel. */
export function reconcileAdminDraft<T>(current: T, previous: T, incoming: T): T {
  if (JSON.stringify(current) === JSON.stringify(previous)) return incoming
  if (current && previous && incoming && typeof current === 'object' && typeof previous === 'object' && typeof incoming === 'object' && !Array.isArray(current) && !Array.isArray(previous) && !Array.isArray(incoming)) {
    const result = { ...incoming } as Record<string, unknown>
    const before = previous as Record<string, unknown>
    const after = incoming as Record<string, unknown>
    for (const [key, value] of Object.entries(current)) {
      result[key] = reconcileAdminDraft(value, before[key], after[key])
    }
    return result as T
  }
  return current
}
