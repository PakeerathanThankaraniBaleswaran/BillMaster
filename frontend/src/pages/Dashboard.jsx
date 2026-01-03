import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check if user is authenticated and verify token
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      navigate('/signin')
      return
    }

    // Verify token by fetching user profile
    api.get('/auth/profile')
      .then((response) => {
        setUser(response.data.user)
      })
      .catch(() => {
        // Token is invalid, redirect to sign in
        navigate('/signin')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <p className="text-gray-600">
          Welcome{user ? `, ${user.name}` : ''} to your BillMaster dashboard!
        </p>
        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <p className="text-gray-700">Your dashboard content will go here.</p>
        </div>
      </div>
    </div>
  )
}

