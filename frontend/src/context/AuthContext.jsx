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
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const users = userService.list()
        users.then((rows) => {
          const validUser = rows.find((u) => String(u.id) === String(parsed.id) && String(u.username || '').toLowerCase() === String(parsed.username || '').toLowerCase())
          if (!validUser) {
            localStorage.removeItem(SESSION_KEY)
            setUser(null)
          } else {
            setUser(validUser)
          }
        })
      } catch {
        localStorage.removeItem(SESSION_KEY)
        setUser(null)
      }
    }
    setReady(true)
  }, [])

  async function login(username, password) {
    // Demo authentication: any seeded username with a 4+ character password
    // unless the account has a saved password from Settings.
    const users = await userService.list()
    const matches = users.filter((u) => u.username && u.username.toLowerCase() === username.trim().toLowerCase())
    const match = [...matches].sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)) || a.id - b.id)[0]

    if (!match) throw new Error('No account found for that username.')
    if (!match.active) throw new Error('This account has been deactivated.')
    if (match.password) {
      if (password !== match.password) throw new Error('Incorrect password.')
    } else if (!password || password.length < 4) {
      throw new Error('Password must be at least 4 characters.')
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(match))
    setUser(match)
    return match
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  function updateUser(updates) {
    setUser((current) => {
      const nextUser = { ...(current || {}), ...updates }
      if (nextUser) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser))
      }
      return nextUser
    })
  }

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: Boolean(user),
      login,
      logout,
      updateUser,
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
