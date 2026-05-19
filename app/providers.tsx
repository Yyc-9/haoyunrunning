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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string, fallbackEmail = '') => {
    if (!supabase) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Load profile error:', error)
      return null
    }

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
        loadProfile(session.user.id, session.user.email ?? '')
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
        await loadProfile(data.user.id, data.user.email ?? email)
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    if (supabase) {
      supabase.auth.signOut()
    }
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
        throw profileError
      }

      await loadProfile(authUser.id, userData.email)
    } catch (error) {
      console.error('Register error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [loadProfile])

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : null)
  }, [])

  const value: AuthContextType = {
    user,
    isLoggedIn: user !== null,
    isLoading,
    login,
    logout,
    register,
    updateUser
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
