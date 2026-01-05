import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [setupComplete, setSetupComplete] = useState(false)

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const setup = localStorage.getItem('setupComplete') === 'true'
    setSetupComplete(setup)
    
    if (token) {
      // Fetch user profile
      api.get('/auth/profile')
        .then((response) => {
          setUser(response.data.user)
        })
        .catch(() => {
          // Token is invalid, clear it
          localStorage.removeItem('token')
          sessionStorage.removeItem('token')
          setSetupComplete(false)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password, rememberMe = false) => {
    const response = await api.post('/auth/login', { email, password })
    const token = response.data?.token || response.token

    if (rememberMe) {
      localStorage.setItem('token', token)
    } else {
      sessionStorage.setItem('token', token)
    }

    setUser(response.data?.user || response.user)
    return response
  }

  const logout = () => {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    setUser(null)
  }

  const value = {
    user,
    loading,
    setupComplete,
    login,
    logout,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

