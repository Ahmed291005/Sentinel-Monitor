import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('sentinel_user')
    const token  = localStorage.getItem('sentinel_token')
    if (stored && token) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const res = await authAPI.login({ username, password })
    const { token, user } = res.data
    localStorage.setItem('sentinel_token', token)
    localStorage.setItem('sentinel_user',  JSON.stringify(user))
    setUser(user)
    return user
  }

  const logout = async () => {
    try { await authAPI.logout() } catch {}
    localStorage.removeItem('sentinel_token')
    localStorage.removeItem('sentinel_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
