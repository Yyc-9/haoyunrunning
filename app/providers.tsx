'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  gender: 'male' | 'female' | 'other'
  pb: string
  avatar?: string
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
  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // TODO: 集成真实的 API
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 500))

      // 模拟登录成功
      setUser({
        id: '1',
        name: '跑步爱好者',
        email,
        phone: '13800138000',
        gender: 'male',
        pb: '42:30',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
      })
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const register = useCallback(async (data: Omit<User, 'id'> & { password: string }) => {
    setIsLoading(true)
    try {
      // TODO: 集成真实的 API
      await new Promise(resolve => setTimeout(resolve, 500))

      const { password, ...userData } = data
      setUser({
        ...userData,
        id: Math.random().toString(36).substr(2, 9),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name}`
      })
    } catch (error) {
      console.error('Register error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

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
