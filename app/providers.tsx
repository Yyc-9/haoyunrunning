'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
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
  logout: () => void
  register: (data: Omit<User, 'id'> & { password: string }) => Promise<void>
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const applyProfile = useCallback((data: ProfilePayload, fallbackEmail = '') => {
    const nextUser: User = {
      id: data.id,
      name: data.name || '好運學員',
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

  const loadProfileFromServer = useCallback(async (fallbackEmail = '') => {
    if (!supabase) return null

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) return null

    const response = await fetch('/api/account/me', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    const payload = (await response.json().catch(() => ({}))) as {
      profile?: ProfilePayload
      error?: string
    }

    if (!response.ok || !payload.profile) {
      throw new Error(payload.error || '讀取帳號角色失敗。')
    }

    return applyProfile(payload.profile, fallbackEmail)
  }, [applyProfile])

  const loadProfile = useCallback(async (userId: string, fallbackEmail = '') => {
    if (!supabase) return null

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

    try {
      return await loadProfileFromServer(fallbackEmail)
    } catch (serverError) {
      console.error('Load server profile error:', serverError)

      const savedRole =
        typeof window !== 'undefined'
          ? (window.localStorage.getItem('goodluck-user-role') as User['role'] | null)
          : null

      const fallbackUser: User = {
        id: userId,
        name: fallbackEmail ? fallbackEmail.split('@')[0] : '好運學員',
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
    let mounted = true

    const initAuth = async () => {
      if (!supabase) {
        if (mounted) setIsLoading(false)
        return
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser && mounted) {
        await loadProfile(authUser.id, authUser.email ?? '')
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
        setUser({
          id: session.user.id,
          name:
            (session.user.user_metadata?.name as string | undefined) ||
            session.user.email?.split('@')[0] ||
            '好運學員',
          email: session.user.email ?? '',
          phone: '',
          gender: 'other',
          pb: '',
          role:
            (typeof window !== 'undefined'
              ? (window.localStorage.getItem('goodluck-user-role') as User['role'] | null)
              : null) || 'student',
        })

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
  }, [loadProfile])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      if (!supabase) {
        throw new Error('Supabase 尚未設定。')
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        setUser({
          id: data.user.id,
          name:
            (data.user.user_metadata?.name as string | undefined) ||
            data.user.email?.split('@')[0] ||
            '好運學員',
          email: data.user.email ?? email,
          phone: '',
          gender: 'other',
          pb: '',
          role: 'student',
        })
        await loadProfile(data.user.id, data.user.email ?? email)
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [loadProfile])

  const logout = useCallback(() => {
    if (supabase) {
      supabase.auth.signOut()
    }
    window.localStorage.removeItem('goodluck-user-role')
    setUser(null)
  }, [])

  const register = useCallback(async (data: Omit<User, 'id'> & { password: string }) => {
    setIsLoading(true)
    try {
      if (!supabase) {
        throw new Error('Supabase 尚未設定。')
      }

      const { password, ...userData } = data
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: userData.email,
        password,
        options: {
          data: {
            name: userData.name,
          },
        },
      })

      if (error) throw error

      const authUser = signUpData.user
      if (!authUser) {
        throw new Error('註冊失敗，請稍後再試。')
      }

      if (!signUpData.session) {
        throw new Error('帳戶已建立。請先到信箱完成驗證，再回來登入。')
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: userData.name,
          email: userData.email,
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
    logout,
    register,
    updateUser,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
