'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  gender: 'male' | 'female' | 'other'
  pb: string
  avatar?: string
  role?: 'student' | 'coach' | 'admin'
}

export interface AuthContextType {
  user: User | null
  isLoggedIn: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithOAuth: (provider: 'google' | 'apple') => Promise<void>
  logout: () => void
  register: (data: Omit<User, 'id'> & { password: string; coachId?: string }) => Promise<{ needsEmailConfirmation: boolean }>
  updateUser: (data: Partial<User>) => void
  refreshUser: () => Promise<User | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type ProfilePayload = {
  id: string
  role?: 'student' | 'coach' | 'admin'
  name?: string | null
  email?: string | null
  phone?: string | null
  pb?: string | null
  avatar_url?: string | null
}

class AccountSessionError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'AccountSessionError'
    this.code = code
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

  const applyProfile = useCallback((data: ProfilePayload, fallbackEmail = '') => {
    const nextUser: User = {
      id: data.id,
      name: data.name || '好運會員',
      email: data.email || fallbackEmail,
      phone: data.phone || '',
      gender: 'other',
      pb: data.pb || '',
      avatar: data.avatar_url || undefined,
      role: data.role,
    }

    setUser(nextUser)
    return nextUser
  }, [])

  const applyAuthUser = useCallback((authUser: SupabaseUser, fallbackRole?: User['role']) => {
    const nextUser: User = {
      id: authUser.id,
      name:
        (authUser.user_metadata?.name as string | undefined) ||
        authUser.email?.split('@')[0] ||
        '好運會員',
      email: authUser.email ?? '',
      phone: '',
      gender: 'other',
      pb: '',
      role: fallbackRole || 'student',
    }

    setUser(nextUser)
    return nextUser
  }, [])

  const loadProfileFromServer = useCallback(async (fallbackEmail = '', accessToken?: string) => {
    if (!supabase) return null

    let token = accessToken
    if (!token) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      token = session?.access_token
    }

    if (!token) return null

    const response = await fetch('/api/account/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const payload = (await response.json().catch(() => ({}))) as {
      profile?: ProfilePayload
      error?: string
      code?: string
    }

    if (!response.ok || !payload.profile) {
      if (payload.code === 'SESSION_REVOKED') {
        throw new AccountSessionError(
          payload.error || '此帳號已在其他裝置登入，目前裝置已登出。',
          payload.code
        )
      }
      throw new Error(payload.error || '讀取帳號角色失敗。')
    }

    return applyProfile(payload.profile, fallbackEmail)
  }, [applyProfile])

  const loadProfile = useCallback(async (userId: string, fallbackEmail = '') => {
    if (!supabase) return null

    try {
      return await loadProfileFromServer(fallbackEmail)
    } catch (serverError) {
      console.error('Load server profile error:', serverError)

      if (serverError instanceof AccountSessionError && serverError.code === 'SESSION_REVOKED') {
        await supabase.auth.signOut({ scope: 'local' })
        removeSupabaseSessionFallback()
        window.localStorage.removeItem('goodluck-user-role')
        setUser(null)
        setSessionNotice(serverError.message)
        return null
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!error && data) {
        return applyProfile(data as ProfilePayload, fallbackEmail)
      }

      if (error) {
        console.error('Load profile error:', error)
      }

      const savedRole =
        typeof window !== 'undefined'
          ? (window.localStorage.getItem('goodluck-user-role') as User['role'] | null)
          : null

      const fallbackUser: User = {
        id: userId,
        name: fallbackEmail ? fallbackEmail.split('@')[0] : '好運會員',
        email: fallbackEmail,
        phone: '',
        gender: 'other',
        pb: '',
        role: savedRole || 'student',
      }

      setUser(fallbackUser)
      return fallbackUser
    }
  }, [applyProfile, loadProfileFromServer])

  useEffect(() => {
    if (!user || !supabase) return

    const checkCurrentSession = () => {
      loadProfile(user.id, user.email).catch((error) => {
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
  }, [loadProfile, user])

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      if (!supabase) {
        if (mounted) setIsLoading(false)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user && mounted) {
        const savedRole =
          typeof window !== 'undefined'
            ? (window.localStorage.getItem('goodluck-user-role') as User['role'] | null)
            : null

        applyAuthUser(session.user, savedRole || undefined)
        await loadProfile(session.user.id, session.user.email ?? '')
      }

      if (mounted) setIsLoading(false)
    }

    initAuth()

    if (!supabase) {
      return () => {
        mounted = false
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return

      if (session?.user) {
        const savedRole =
          typeof window !== 'undefined'
            ? (window.localStorage.getItem('goodluck-user-role') as User['role'] | null)
            : null

        applyAuthUser(session.user, savedRole || undefined)

        setTimeout(() => {
          loadProfile(session.user.id, session.user.email ?? '')
        }, 0)
      } else {
        setUser(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [applyAuthUser, loadProfile])

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

      if (data.user) {
        applyAuthUser(data.user)
        await loadProfileFromServer(data.user.email ?? email, data.session?.access_token)
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [applyAuthUser, loadProfileFromServer])

  const loginWithOAuth = useCallback(async (provider: 'google' | 'apple') => {
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
      },
    })

    if (error) throw error
  }, [])

  const logout = useCallback(() => {
    if (supabase) {
      supabase.auth.signOut({ scope: 'local' })
    }
    removeSupabaseSessionFallback()
    window.localStorage.removeItem('goodluck-user-role')
    setUser(null)
  }, [])

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

      const { error: sessionError } = await supabase.auth.setSession(signUpData.session)
      if (sessionError) throw sessionError

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

      setUser({
        id: authUser.id,
        name: userData.name || userData.email.split('@')[0],
        email: userData.email,
        phone: userData.phone,
        gender: userData.gender,
        pb: userData.pb,
        role: 'student',
      })

      await loadProfile(authUser.id, userData.email)
      return { needsEmailConfirmation: false }
    } catch (error) {
      console.error('Register error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [loadProfile])

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prev => {
      const nextUser = prev ? { ...prev, ...data } : null
      if (data.role) {
        window.localStorage.setItem('goodluck-user-role', data.role)
      }
      return nextUser
    })
  }, [])

  const refreshUser = useCallback(async () => {
    if (!supabase) return null

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      setUser(null)
      return null
    }

    return loadProfile(authUser.id, authUser.email ?? '')
  }, [loadProfile])

  const value: AuthContextType = {
    user,
    isLoggedIn: user !== null,
    isLoading,
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
