import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { seedDatabase } from '../services/seed'
import { userService } from '../services'

const AuthContext = createContext(null)
const SESSION_KEY = 'sms_session_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    seedDatabase()
    const saved = localStorage.getItem(SESSION_KEY)
    if (saved) setUser(JSON.parse(saved))
    setReady(true)
  }, [])

  async function login(username, password) {
    // Demo authentication: any seeded username with password "sms1234" logs in.
    // Replace this body with api.login({ username, password }) once the
    // Express auth endpoint exists.
    if (!password || password.length < 4) {
      throw new Error('Password must be at least 4 characters.')
    }
    const users = await userService.list()
    const match = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase())
    if (!match) throw new Error('No account found for that username.')
    if (!match.active) throw new Error('This account has been deactivated.')
    localStorage.setItem(SESSION_KEY, JSON.stringify(match))
    setUser(match)
    return match
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: Boolean(user),
      login,
      logout,
      hasRole: (...roles) => Boolean(user) && roles.includes(user.role)
    }),
    [user, ready]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
