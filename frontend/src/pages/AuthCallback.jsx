import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const provider = searchParams.get('provider')
  const error = searchParams.get('error')

  useEffect(() => {
    if (error) {
      // If there's an error, redirect to sign in with error message
      navigate(`/signin?error=${error}`, { replace: true })
      return
    }

    if (token) {
      // Store token in localStorage
      localStorage.setItem('token', token)
      
      // Redirect to dashboard
      navigate('/dashboard', { replace: true })
    } else {
      // No token, redirect to sign in
      navigate('/signin?error=no_token', { replace: true })
    }
  }, [token, error, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">
          {provider ? `Signing in with ${provider}...` : 'Completing sign in...'}
        </p>
      </div>
    </div>
  )
}

