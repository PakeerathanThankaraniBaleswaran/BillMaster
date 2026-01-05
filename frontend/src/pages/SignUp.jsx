import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthInput } from '@/components/auth/AuthInput'
import { PasswordInput } from '@/components/auth/PasswordInput'
import api from '@/services/api'

export default function SignUpPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    let strength = 0
    if (pass.length >= 8) strength++
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength++
    if (/\d/.test(pass)) strength++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) strength++
    return strength
  }

  const passwordStrength = getPasswordStrength(password)
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong']
  const strengthColors = ['bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (passwordStrength < 2) {
      setError('Password is too weak. Please use a stronger password.')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/register', { name, email, password })
      
      // Store token - interceptor already returns response.data, so access response.data directly
      const token = response.data?.token || response.token
      if (rememberMe) {
        localStorage.setItem('token', token)
      } else {
        sessionStorage.setItem('token', token)
      }

      // Ensure setup is not complete
      localStorage.setItem('setupComplete', 'false')

      // Redirect to company setup page
      window.location.href = '/company-setup'
    } catch (err) {
      // Error structure: err.response.data.message or err.message
      setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-600">Get started with your free account today</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthInput
            label="Full Name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <AuthInput
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div>
            <PasswordInput
              label="Password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* Password strength indicator */}
            {password && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-1.5">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        i < passwordStrength
                          ? strengthColors[passwordStrength - 1]
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Password strength:{' '}
                  <span className="font-semibold text-gray-700">
                    {passwordStrength > 0 ? strengthLabels[passwordStrength - 1] : 'Too weak'}
                  </span>
                </p>

                {/* Password requirements */}
                <div className="space-y-1.5 pt-1">
                  <PasswordRequirement met={password.length >= 8} text="At least 8 characters" />
                  <PasswordRequirement
                    met={/[a-z]/.test(password) && /[A-Z]/.test(password)}
                    text="Upper & lowercase letters"
                  />
                  <PasswordRequirement met={/\d/.test(password)} text="At least one number" />
                </div>
              </div>
            )}
          </div>

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
          />

          {/* Remember me */}
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Terms agreement */}
        <p className="text-xs text-center text-gray-500 leading-relaxed">
          By creating an account, you agree to our{' '}
          <Link to="/terms" className="text-primary-600 hover:text-primary-700 transition-colors font-medium">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-primary-600 hover:text-primary-700 transition-colors font-medium">
            Privacy Policy
          </Link>
        </p>

        {/* Sign in link */}
        <div className="text-center pt-2 border-t border-gray-300">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/signin" className="text-primary-600 hover:text-primary-700 transition-colors font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}

// Helper component for password requirements
function PasswordRequirement({ met, text }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 ${
          met ? 'bg-primary-600' : 'bg-gray-300'
        }`}
      >
        {met && <Check className="w-3 h-3 text-white" />}
      </div>
      <span
        className={`text-xs transition-colors duration-200 ${met ? 'text-gray-900' : 'text-gray-500'}`}
      >
        {text}
      </span>
    </div>
  )
}

