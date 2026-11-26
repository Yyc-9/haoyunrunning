'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { socialProviderScopes, type SocialProvider } from '@/lib/auth-providers'
import { normalizeProfileGender, type ProfileGender } from '@/lib/profile-gender'
import { emptyProfile, type AccountProfile, type Achievement } from '@/lib/runner-profile'
import type { CoachAccountState } from '@/components/CoachAccountStatus'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  gender: ProfileGender
  pb: string
  avatar?: string
  nickname?: string
  bio?: string
  city?: string
  runningSince?: string
  favoriteDistance?: string
  targetEvent?: string
  instagram?: string
  goal?: string
  role?: 'student' | 'coach' | 'admin'
  testAccount?: {
    enabled: true
    mode: 'student' | 'coach'
    assignedCourseSlug: string
  }
}

export interface AuthContextType {
  user: User | null
  isLoggedIn: boolean
  isLoading: boolean
  account: AccountDetails | null
  accountError: string
  login: (email: string, password: string) => Promise<void>
  loginWithOAuth: (provider: SocialProvider) => Promise<void>
  logout: () => void
  register: (data: Omit<User, 'id'> & { password: string; coachId?: string }) => Promise<{ needsEmailConfirmation: boolean }>
  updateUser: (data: Partial<User>) => void
  refreshUser: () => Promise<User | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type ProfilePayload = {
  gender?: ProfileGender
  id: string
  role?: 'student' | 'coach' | 'admin'
  name?: string | null
  email?: string | null
  phone?: string | null
  pb?: string | null
  avatar_url?: string | null
  nickname?: string | null
  bio?: string | null
  city?: string | null
  running_since?: string | null
  favorite_distance?: string | null
  target_event?: string | null
  instagram?: string | null
  goal?: string | null
  test_account?: {
    enabled?: boolean
    mode?: 'student' | 'coach'
    assigned_course_slug?: string
  } | null
}

type AccountDetails = {
  profile: AccountProfile & ProfilePayload
  achievements: Achievement[]
  coachAccount: CoachAccountState | null
}

type ProfileRead = {
  user: User | null
  error?: Error
}

function userFromSession(authUser: SupabaseUser): User {
  const name = authUser.user_metadata?.name
  return {
    id: authUser.id,
    name: (typeof name === 'string' && name) || authUser.email?.split('@')[0] || '好運會員',
    email: authUser.email ?? '',
    phone: '',
    gender: '',
    pb: '',
    role: 'student',
  }
}

function isRetryableAuthNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const name = error && typeof error === 'object' && 'name' in error ? String((error as { name?: unknown }).name ?? '') : ''

  return /AuthRetryableFetchError|Failed to fetch|Load failed|NetworkError|ERR_CONNECTION|fetch failed/i.test(`${name} ${message}`)
}

function getSupabaseStorageKey() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null

  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    return projectRef ? `sb-${projectRef}-auth-token` : null
  } catch {
    return null
  }
}

function saveSupabaseSessionFallback(session: Session) {
  if (typeof window === 'undefined') return
  const storageKey = getSupabaseStorageKey()
  if (!storageKey) return

  window.localStorage.setItem(storageKey, JSON.stringify(session))
}

function removeSupabaseSessionFallback() {
  if (typeof window === 'undefined') return
  const storageKey = getSupabaseStorageKey()
  if (!storageKey) return

  window.localStorage.removeItem(storageKey)
  window.localStorage.removeItem(`${storageKey}-user`)
  window.localStorage.removeItem(`${storageKey}-code-verifier`)
}

async function loginViaServer(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    session?: Session
    user?: SupabaseUser
    error?: string
  }

  if (!response.ok || !payload.session || !payload.user) {
    throw new Error(payload.error || '登入服務暫時無法完成驗證，請稍後再試。')
  }

  return {
    session: payload.session,
    user: payload.user,
  }
}

async function registerViaServer(data: {
  email: string
  password: string
  name: string
  phone: string
  pb: string
  coachId?: string
}) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    needsEmailConfirmation?: boolean
    session?: Session | null
    user?: SupabaseUser | null
    error?: string
  }

  if (!response.ok) {
    throw new Error(payload.error || '帳戶暫時無法建立，請稍後再試。')
  }

  return payload
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionNotice, setSessionNotice] = useState('')
  const [account, setAccount] = useState<AccountDetails | null>(null)
  const [accountError, setAccountError] = useState('')
  const currentSession = useRef<Session | null>(null)
  const pendingProfile = useRef<Promise<ProfileRead> | null>(null)

  const applySession = useCallback((session: Session | null) => {
    const previous = currentSession.current
    if (session && previous?.access_token === session.access_token) return

    currentSession.current = session
    pendingProfile.current = null
    if (!session || previous?.user.id !== session.user.id) {
      setAccount(null)
      setAccountError('')
      setUser(session ? userFromSession(session.user) : null)
    }
  }, [])

  const applyProfile = useCallback((data: ProfilePayload, fallbackEmail = '') => {
    const nextUser: User = {
      id: data.id,
      name: data.name || '好運會員',
      email: data.email || fallbackEmail,
      phone: data.phone || '',
      gender: normalizeProfileGender(data.gender),
      pb: data.pb || '',
      avatar: data.avatar_url || undefined,
      nickname: data.nickname || '',
      bio: data.bio || '',
      city: data.city || '',
      runningSince: data.running_since || '',
      favoriteDistance: data.favorite_distance || '',
      targetEvent: data.target_event || '',
      instagram: data.instagram || '',
      goal: data.goal || '',
      role: data.role,
      testAccount: data.test_account?.enabled && data.test_account.mode ? {
        enabled: true,
        mode: data.test_account.mode,
        assignedCourseSlug: data.test_account.assigned_course_slug || 'zhubei-night-run-monday',
      } : undefined,
    }

    setUser(nextUser)
    return nextUser
  }, [])

  const loadProfile = useCallback((session: Session, force = false): Promise<ProfileRead> => {
    const client = supabase
    const { user: authUser, access_token: token } = session
    if (!client || currentSession.current?.access_token !== token) return Promise.resolve({ user: null })
    if (pendingProfile.current && !force) return pendingProfile.current

    const isCurrent = () => pendingProfile.current === request
    const readProfile = async (): Promise<ProfileRead> => {
      if (!isCurrent()) return { user: null }
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 10_000)
      try {
        const response = await fetch('/api/account/me', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const payload = (await response.json().catch(() => ({}))) as Partial<AccountDetails> & { error?: string; code?: string }
        if (!isCurrent()) return { user: null }

        if (response.status === 401 && payload.code === 'SESSION_REVOKED') {
          const error = new Error(payload.error || '此帳號已在其他裝置登入，目前裝置已登出。')
          applySession(null)
          setIsLoading(false)
          setSessionNotice(error.message)
          void client.auth.signOut({ scope: 'local' })
          removeSupabaseSessionFallback()
          return { user: null, error }
        }
        if (!response.ok || payload.profile?.id !== authUser.id) {
          throw new Error(payload.error || '讀取帳戶資料失敗。')
        }

        const profileValues = Object.entries(payload.profile).filter(([, value]) => value != null)
        setAccount({
          profile: { ...emptyProfile, ...Object.fromEntries(profileValues) },
          achievements: payload.achievements ?? [],
          coachAccount: payload.coachAccount ?? null,
        })
        setAccountError('')
        return { user: applyProfile(payload.profile, authUser.email) }
      } catch (cause) {
        if (!isCurrent()) return { user: null }
        console.error('Load server profile error:', cause)
        const error = cause instanceof Error && !['TypeError', 'AbortError'].includes(cause.name)
          ? cause
          : new Error('帳戶資料暫時無法載入，請稍後重試。')
        setAccountError(error.message)

        const { data } = await client.from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .abortSignal(controller.signal)
          .maybeSingle()
        if (!isCurrent()) return { user: null }
        const fallbackUser = data?.id === authUser.id
          ? applyProfile(data as ProfilePayload, authUser.email)
          : userFromSession(authUser)
        return { user: fallbackUser, error }
      } finally {
        window.clearTimeout(timeout)
      }
    }

    const request = Promise.resolve().then(readProfile)
    pendingProfile.current = request
    const clear = () => { if (isCurrent()) pendingProfile.current = null }
    void request.then(clear, clear)
    return request
  }, [applyProfile, applySession])

  const loadCurrentProfile = useCallback(async (force = false) => {
    if (!supabase) return null
    const previous = currentSession.current
    const { data: { session }, error } = await supabase.auth.getSession()
    if (currentSession.current !== previous && currentSession.current?.access_token !== session?.access_token) return null
    if (error) throw error

    applySession(session)
    return session ? (await loadProfile(session, force)).user : null
  }, [applySession, loadProfile])

  const userId = user?.id
  useEffect(() => {
    if (!userId || !supabase) return

    const checkCurrentSession = () => {
      loadCurrentProfile().catch((error) => {
        console.error('Session heartbeat error:', error)
      })
    }
    const interval = window.setInterval(checkCurrentSession, 60_000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkCurrentSession()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [loadCurrentProfile, userId])

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    let timer: number | undefined
    let mounted = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      const previous = currentSession.current
      applySession(session)
      if (!session) {
        window.clearTimeout(timer)
        setIsLoading(false)
        return
      }
      if (previous?.access_token === session.access_token && event !== 'USER_UPDATED') return

      if (previous?.user.id !== session.user.id) setIsLoading(true)
      window.clearTimeout(timer)
      // Supabase holds its auth lock while invoking this callback.
      timer = window.setTimeout(() => {
        void loadProfile(session, event === 'USER_UPDATED').catch(error => {
          console.error('Load fallback profile error:', error)
        }).finally(() => {
          if (mounted && currentSession.current?.access_token === session.access_token) setIsLoading(false)
        })
      }, 0)
    })

    return () => {
      mounted = false
      window.clearTimeout(timer)
      subscription.unsubscribe()
      currentSession.current = null
      pendingProfile.current = null
    }
  }, [applySession, loadProfile])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      if (!supabase) {
        throw new Error('Supabase 尚未設定。')
      }

      let data: { user: SupabaseUser | null; session: Session | null }
      const { data: directData, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        if (!isRetryableAuthNetworkError(error)) {
          throw error
        }

        const fallback = await loginViaServer(email, password)
        saveSupabaseSessionFallback(fallback.session)
        data = fallback
      } else {
        data = directData
      }

      if (data.session) {
        applySession(data.session)
        const { error: profileError } = await loadProfile(data.session)
        if (profileError) throw profileError
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [applySession, loadProfile])

  const loginWithOAuth = useCallback(async (provider: SocialProvider) => {
    if (!supabase) {
      throw new Error('Supabase 尚未設定。')
    }

    let redirectTo: string | undefined
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.delete('auth')
      redirectTo = currentUrl.pathname === '/'
        ? `${window.location.origin}/profile`
        : currentUrl.toString()
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes: socialProviderScopes(provider),
      },
    })

    if (error) throw error
  }, [])

  const logout = useCallback(() => {
    applySession(null)
    if (supabase) {
      void supabase.auth.signOut({ scope: 'local' })
    }
    removeSupabaseSessionFallback()
  }, [applySession])

  const register = useCallback(async (data: Omit<User, 'id'> & { password: string; coachId?: string }) => {
    setIsLoading(true)
    try {
      if (!supabase) {
        throw new Error('Supabase 尚未設定。')
      }

      const { password, coachId, ...userData } = data
      const signUpData = await registerViaServer({
        email: userData.email.trim().toLowerCase(),
        password,
        name: userData.name,
        phone: userData.phone,
        pb: userData.pb,
        coachId,
      })
      const authUser = signUpData.user
      if (!authUser) {
        return { needsEmailConfirmation: true }
      }

      if (!signUpData.session || signUpData.needsEmailConfirmation) {
        return { needsEmailConfirmation: true }
      }

      const { data: { session }, error: sessionError } = await supabase.auth.setSession(signUpData.session)
      if (sessionError) throw sessionError
      if (!session) throw new Error('登入狀態已失效，請重新登入。')
      applySession(session)

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: userData.name,
          email: userData.email.trim().toLowerCase(),
          phone: userData.phone,
          pb: userData.pb,
          role: 'student',
        })
        .eq('id', authUser.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
      }

      setUser(current => current?.id === authUser.id ? {
        ...current,
        name: userData.name || userData.email.split('@')[0],
        email: userData.email,
        phone: userData.phone,
        gender: userData.gender,
        pb: userData.pb,
        role: 'student',
      } : current)

      if (currentSession.current?.user.id === authUser.id) await loadCurrentProfile(true)
      return { needsEmailConfirmation: false }
    } catch (error) {
      console.error('Register error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [applySession, loadCurrentProfile])

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prev => {
      const nextUser = prev ? { ...prev, ...data } : null
      return nextUser
    })
  }, [])

  const refreshUser = useCallback(() => loadCurrentProfile(true), [loadCurrentProfile])

  const value: AuthContextType = {
    user,
    isLoggedIn: user !== null,
    isLoading,
    account: account?.profile.id === user?.id ? account : null,
    accountError,
    login,
    loginWithOAuth,
    logout,
    register,
    updateUser,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      {sessionNotice ? (
        <div className="fixed bottom-4 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-center justify-between gap-4 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-xl">
          <span>{sessionNotice}</span>
          <button
            type="button"
            onClick={() => setSessionNotice('')}
            className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black"
          >
            關閉
          </button>
        </div>
      ) : null}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
