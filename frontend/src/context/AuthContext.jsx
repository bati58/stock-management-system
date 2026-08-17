import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { seedDatabase } from '../services/seed'
import { userService, auditService } from '../services'

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
    const inputName = String(username || '').trim()
    const users = await userService.list()
    const matches = users.filter((u) => u.username && u.username.toLowerCase() === inputName.toLowerCase())
    const match = [...matches].sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)) || a.id - b.id)[0]

    if (!match) {
      await auditService.log({
        actorId: 'ANON',
        actorName: inputName || 'Unknown user',
        actorRole: 'Unauthenticated',
        action: 'LOGIN_FAILED',
        module: 'Authentication',
        entityType: 'User',
        entityId: inputName || 'unknown-user',
        entityReference: inputName || 'unknown-user',
        description: `Login attempt failed because no user was found for ${inputName || 'an empty username'}.`,
        outcome: 'FAILED',
        ipAddress: 'N/A',
        userAgent: navigator?.userAgent || 'Frontend (Browser)',
        metadata: { reason: 'Unknown user' }
      })
      throw new Error('No account found for that username.')
    }
    if (!match.active) {
      await auditService.log({
        actorId: match.id,
        actorName: match.name,
        actorRole: match.role,
        action: 'ACCOUNT_LOCKED',
        module: 'Authentication',
        entityType: 'User',
        entityId: match.id,
        entityReference: match.username,
        description: `User ${match.username} attempted to sign in but the account is deactivated.`,
        outcome: 'FAILED',
        ipAddress: 'N/A',
        userAgent: navigator?.userAgent || 'Frontend (Browser)',
        metadata: { username: match.username }
      })
      throw new Error('This account has been deactivated.')
    }
    if (match.password) {
      if (password !== match.password) {
        await auditService.log({
          actorId: match.id,
          actorName: match.name,
          actorRole: match.role,
          action: 'LOGIN_FAILED',
          module: 'Authentication',
          entityType: 'User',
          entityId: match.id,
          entityReference: match.username,
          description: `Login attempt failed for ${match.username} due to an incorrect password.`,
          outcome: 'FAILED',
          ipAddress: 'N/A',
          userAgent: navigator?.userAgent || 'Frontend (Browser)',
          metadata: { username: match.username }
        })
        throw new Error('Incorrect password.')
      }
    } else if (!password || password.length < 4) {
      await auditService.log({
        actorId: match.id,
        actorName: match.name,
        actorRole: match.role,
        action: 'LOGIN_FAILED',
        module: 'Authentication',
        entityType: 'User',
        entityId: match.id,
        entityReference: match.username,
        description: `Login attempt failed for ${match.username} because the submitted password was too short.`,
        outcome: 'FAILED',
        ipAddress: 'N/A',
        userAgent: navigator?.userAgent || 'Frontend (Browser)',
        metadata: { username: match.username }
      })
      throw new Error('Password must be at least 4 characters.')
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(match))
    setUser(match)

    await auditService.log({
      actorId: match.id,
      actorName: match.name,
      actorRole: match.role,
      action: 'LOGIN_SUCCESS',
      module: 'Authentication',
      entityType: 'User',
      entityId: match.id,
      entityReference: match.username,
      description: `${match.name} logged in successfully to the stock management system.`,
      outcome: 'SUCCESS',
      ipAddress: 'N/A',
      userAgent: navigator?.userAgent || 'Frontend (Browser)',
      metadata: { username: match.username, role: match.role }
    })

    return match
  }

  async function logout() {
    const currentUser = user
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
    if (!currentUser) return

    await auditService.log({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'LOGOUT',
      module: 'Authentication',
      entityType: 'User',
      entityId: currentUser.id,
      entityReference: currentUser.username,
      description: `${currentUser.name} logged out of the stock management system.`,
      outcome: 'SUCCESS',
      ipAddress: 'N/A',
      userAgent: navigator?.userAgent || 'Frontend (Browser)',
      metadata: { username: currentUser.username }
    })
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
