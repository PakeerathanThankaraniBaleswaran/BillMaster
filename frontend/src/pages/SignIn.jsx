import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthInput } from '@/components/auth/AuthInput'
import { PasswordInput } from '@/components/auth/PasswordInput'
import api from '@/services/api'

export default function SignInPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Check for OAuth error in URL params
  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (oauthError === 'google_oauth_not_configured') {
      setError('Google login is not configured yet. Please use email/password login.')
    } else if (oauthError === 'github_oauth_not_configured') {
      setError('GitHub login is not configured yet. Please use email/password login.')
    } else if (oauthError === 'google_auth_failed') {
      setError('Google authentication failed. Please try again or use email/password login.')
    } else if (oauthError === 'google_token_exchange_failed') {
      setError('Failed to authenticate with Google. Please try again.')
    } else if (oauthError === 'google_user_info_failed') {
      setError('Failed to get user information from Google. Please try again.')
    } else if (oauthError === 'google_email_not_provided') {
      setError('Google did not provide your email address. Please try another account or use email/password login.')
    } else if (oauthError === 'google_auth_error') {
      setError('An error occurred during Google authentication. Please try again.')
    }
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', { email, password })
      
      // Store token - interceptor already returns response.data, so access response.data directly
      const token = response.data?.token || response.token
      if (rememberMe) {
        localStorage.setItem('token', token)
      } else {
        sessionStorage.setItem('token', token)
      }

      // Redirect to dashboard or home
      navigate('/dashboard')
    } catch (err) {
      // Error structure: err.response.data.message or err.message
      setError(err.response?.data?.message || err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      // Get Google OAuth URL from backend
      const googleAuthUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`
      
      // Redirect to Google OAuth
      window.location.href = googleAuthUrl
    } catch (err) {
      setError('Google login is not configured yet. Please use email/password login.')
    }
  }

  const handleGitHubLogin = async () => {
    try {
      // Get GitHub OAuth URL from backend
      const githubAuthUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/github`
      
      // Redirect to GitHub OAuth
      window.location.href = githubAuthUrl
    } catch (err) {
      setError('GitHub login is not configured yet. Please use email/password login.')
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-600">Sign in to continue to your account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <AuthInput
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {/* Remember me & Forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 transition-all"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                Remember me
              </span>
            </label>

            <Link
              to="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700 transition-colors font-medium"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-primary-600 text-white rounded-xl font-semibold text-base
                     transition-all duration-200 
                     hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-600/20 hover:-translate-y-0.5
                     active:translate-y-0
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Social Login Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-300 rounded-xl font-medium text-sm
                     transition-all duration-200
                     hover:bg-gray-50 hover:border-gray-400 hover:shadow-md
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>
          <button
            type="button"
            onClick={handleGitHubLogin}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-300 rounded-xl font-medium text-sm
                     transition-all duration-200
                     hover:bg-gray-50 hover:border-gray-400 hover:shadow-md
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            GitHub
          </button>
        </div>

        {/* Sign up link */}
        <div className="text-center pt-2">
          <p className="text-sm text-gray-600">
            {"Don't have an account? "}
            <Link to="/signup" className="text-primary-600 hover:text-primary-700 transition-colors font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}

