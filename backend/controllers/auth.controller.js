import User from '../models/User.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'
import jwt from 'jsonwebtoken'

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body

  // Check if user already exists
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    return next(new ErrorResponse('User already exists with this email', 400))
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
  })

  // Generate JWT token
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  )

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token,
    },
  })
})

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body

  // Validate email and password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide email and password', 400))
  }

  // Find user and include password (since it's select: false)
  const user = await User.findOne({ email }).select('+password')

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401))
  }

  // Check if user is active
  if (!user.isActive) {
    return next(new ErrorResponse('Account is deactivated', 401))
  }

  // Check password
  const isPasswordMatch = await user.comparePassword(password)
  if (!isPasswordMatch) {
    return next(new ErrorResponse('Invalid credentials', 401))
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  )

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      token,
    },
  })
})

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = asyncHandler(async (req, res, next) => {
  // req.user is set by auth middleware
  const user = await User.findById(req.user.id)

  if (!user) {
    return next(new ErrorResponse('User not found', 404))
  }

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  })
})

// @desc    Google OAuth Login - Redirect to Google
// @route   GET /api/auth/google
// @access  Public
export const googleAuth = asyncHandler(async (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID) {
    // Redirect back to frontend with error message
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000'
    return res.redirect(`${frontendUrl}/signin?error=google_oauth_not_configured`)
  }
  
  // Redirect to Google OAuth
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile email&access_type=offline&prompt=consent`
  
  res.redirect(googleAuthUrl)
})

// @desc    Google OAuth Callback
// @route   GET /api/auth/google/callback
// @access  Public
export const googleCallback = asyncHandler(async (req, res, next) => {
  const { code } = req.query
  const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000'

  if (!code) {
    return res.redirect(`${frontendUrl}/signin?error=google_auth_failed`)
  }

  try {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${frontendUrl}/signin?error=google_oauth_not_configured`)
    }

    // Step 1: Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback',
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      return res.redirect(`${frontendUrl}/signin?error=google_token_exchange_failed`)
    }

    const tokenData = await tokenResponse.json()
    const { access_token } = tokenData

    // Step 2: Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      return res.redirect(`${frontendUrl}/signin?error=google_user_info_failed`)
    }

    const googleUser = await userInfoResponse.json()
    const { email, name, picture } = googleUser

    if (!email) {
      return res.redirect(`${frontendUrl}/signin?error=google_email_not_provided`)
    }

    // Step 3: Find or create user in database
    let user = await User.findOne({ email })

    if (!user) {
      // Create new user for OAuth (no password required)
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        isOAuthUser: true,
        oAuthProvider: 'google',
        password: undefined, // No password for OAuth users
      })
    } else {
      // Update existing user if they don't have OAuth info
      if (!user.isOAuthUser) {
        user.isOAuthUser = true
        user.oAuthProvider = 'google'
        await user.save()
      }
    }

    // Step 4: Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    )

    // Step 5: Redirect to frontend with token
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=google`)
  } catch (error) {
    console.error('Google OAuth Error:', error)
    return res.redirect(`${frontendUrl}/signin?error=google_auth_error`)
  }
})

// @desc    GitHub OAuth Login - Redirect to GitHub
// @route   GET /api/auth/github
// @access  Public
export const githubAuth = asyncHandler(async (req, res, next) => {
  // Check if GitHub OAuth is configured
  if (!process.env.GITHUB_CLIENT_ID) {
    // Redirect back to frontend with error message
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000'
    return res.redirect(`${frontendUrl}/signin?error=github_oauth_not_configured`)
  }
  
  // Redirect to GitHub OAuth
  const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:5000/api/auth/github/callback'
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`
  
  res.redirect(githubAuthUrl)
})

// @desc    GitHub OAuth Callback
// @route   GET /api/auth/github/callback
// @access  Public
export const githubCallback = asyncHandler(async (req, res, next) => {
  // TODO: Implement GitHub OAuth callback
  res.status(501).json({
    success: false,
    message: 'GitHub OAuth is not yet configured. Please use email/password login.',
  })
})
