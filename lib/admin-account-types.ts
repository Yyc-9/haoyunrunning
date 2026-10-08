export type AdminAccountOverview = {
  actorId: string
  admins: Array<{
    email: string; userId: string | null; name: string | null; role: string | null
    registered: boolean; emailConfirmed: boolean; allowlistActive: boolean | null
    accountActive: boolean | null; environmentAllowed: boolean
  }>
  diagnostic: {
    email: string
    accounts: Array<{ id: string; emailConfirmed: boolean; role: string | null; name: string | null; adminActive: boolean | null }>
    adminAllowlist: boolean | null
    environmentAllowed: boolean
    coachAccounts: Array<{ coachKey: string; name: string; status: string; profileId: string | null; ownerId: string | null }>
    courses: Array<{ id: string; coachId: string; name: string; season: string; seasonStatus: string }>
    sessions: Array<{ lastSeenAt: string; revokedAt: string | null; device: string }>
  } | null
  audit: Array<{ id: string; email: string; active: boolean; reason: string; created_at: string; actor_name: string | null }>
}
