import { createContext, useContext, useState, useCallback } from 'react'
import { api, storage } from '@/lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storage.user)

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    storage.setSession(data)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', { refreshToken: storage.refreshToken })
    } catch {
      // Best effort — clear the local session regardless.
    }
    storage.clear()
    setUser(null)
  }, [])

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    role: user?.role,
    isAdmin: user?.role === 'admin',
    isSupervisor: user?.role === 'supervisor',
    isSales: user?.role === 'sales',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
