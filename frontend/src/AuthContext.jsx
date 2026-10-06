import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api'

// Context = a "global variable" for React components.
// Any component can call useAuth() to get the user, login() and logout().
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true while we check a saved token

  // On page load/refresh: if we have a saved token, ask the backend who we are
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setLoading(false)
      return
    }
    api('/me.php')
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const data = await api('/login.php', { method: 'POST', body: { email, password } })
    localStorage.setItem('token', data.token)
    setUser(data.user)
  }

  async function logout() {
    try {
      await api('/logout.php', { method: 'POST' })
    } finally {
      localStorage.removeItem('token')
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
