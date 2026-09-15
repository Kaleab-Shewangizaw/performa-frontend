import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { api, storage } from '@/lib/api'

const AuthContext = createContext(null)

// Same limit for every role — an hour with none of these events ends the
// session, matching the sliding refresh-token window the backend enforces.
const IDLE_LIMIT_MS = 60 * 60 * 1000
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'wheel', 'touchstart']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storage.user)
  const idleTimer = useRef(null)

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

  // Proactively sign out after an hour of no interaction, rather than
  // waiting for the next request to fail against an expired refresh token.
  useEffect(() => {
    if (!user) return undefined
    const resetTimer = () => {
      clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(logout, IDLE_LIMIT_MS)
    }
    resetTimer()
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer))
    return () => {
      clearTimeout(idleTimer.current)
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer))
    }
  }, [user, logout])

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
