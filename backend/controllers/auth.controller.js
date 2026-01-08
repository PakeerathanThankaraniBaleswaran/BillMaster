import User from '../models/User.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { isFirebase } from '../services/datastore.js'
import { collection, docToApi, nowTimestamp } from '../services/firestore.js'

const sanitizeUserForResponse = (user) => {
  if (!user) return user
  const out = { ...user }
  delete out.password
  delete out.passwordHash
  return out
}

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'default-secret', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  })

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body

  if (isFirebase()) {
    const emailLower = normalizeEmail(email)
    if (!name) return next(new ErrorResponse('Please provide a name', 400))
    if (!emailLower) return next(new ErrorResponse('Please provide an email', 400))
    if (!password || String(password).length < 6) {
      return next(new ErrorResponse('Password must be at least 6 characters', 400))
    }

    const existingSnap = await collection('users').where('email', '==', emailLower).limit(1).get()
    if (!existingSnap.empty) {
      return next(new ErrorResponse('User already exists with this email', 400))
    }

    const passwordHash = await bcrypt.hash(String(password), 12)

    const ref = await collection('users').add({
      name: String(name).trim(),
      email: emailLower,
      passwordHash,
      isOAuthUser: false,
      oAuthProvider: null,
      role: 'user',
      isActive: true,
      createdAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    })

    const created = await ref.get()
    const user = sanitizeUserForResponse(docToApi(created))
    const token = signToken(user._id)

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user, token },
    })
  }

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
  const token = signToken(user._id)

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

  if (isFirebase()) {
    const emailLower = normalizeEmail(email)
    if (!emailLower || !password) {
      return next(new ErrorResponse('Please provide email and password', 400))
    }

    const snap = await collection('users').where('email', '==', emailLower).limit(1).get()
    if (snap.empty) return next(new ErrorResponse('Invalid credentials', 401))

    const doc = snap.docs[0]
    const user = docToApi(doc)

    if (!user.isActive) {
      return next(new ErrorResponse('Account is deactivated', 401))
    }

    if (user.isOAuthUser) {
      return next(new ErrorResponse('Please sign in with Google', 401))
    }

    const ok = await bcrypt.compare(String(password), String(user.passwordHash || ''))
    if (!ok) return next(new ErrorResponse('Invalid credentials', 401))

    const token = signToken(user._id)

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: sanitizeUserForResponse(user),
        token,
      },
    })
  }

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
  const token = signToken(user._id)

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
  if (isFirebase()) {
    const snap = await collection('users').doc(String(req.user.id)).get()
    if (!snap.exists) return next(new ErrorResponse('User not found', 404))
    const user = sanitizeUserForResponse(docToApi(snap))
    return res.status(200).json({
      success: true,
      data: { user },
    })
  }

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
    const frontendUrl = (process.env.CORS_ORIGIN || '')
      .split(',')[0]
      ?.trim() || 'http://localhost:5173'
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
  const frontendUrl = (process.env.CORS_ORIGIN || '')
    .split(',')[0]
    ?.trim() || 'http://localhost:5173'

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
    const emailLower = normalizeEmail(email)
    let userId

    if (isFirebase()) {
      const snap = await collection('users').where('email', '==', emailLower).limit(1).get()

      if (snap.empty) {
        const ref = await collection('users').add({
          name: String(name || emailLower.split('@')[0]).trim(),
          email: emailLower,
          avatarUrl: picture || '',
          isOAuthUser: true,
          oAuthProvider: 'google',
          role: 'user',
          isActive: true,
          createdAt: nowTimestamp(),
          updatedAt: nowTimestamp(),
        })
        userId = ref.id
      } else {
        const existing = snap.docs[0]
        userId = existing.id
        const existingUser = docToApi(existing)
        if (!existingUser.isOAuthUser || existingUser.oAuthProvider !== 'google') {
          await collection('users').doc(existing.id).update({
            isOAuthUser: true,
            oAuthProvider: 'google',
            avatarUrl: picture || existingUser.avatarUrl || '',
            updatedAt: nowTimestamp(),
          })
        }
      }
    } else {
      let user = await User.findOne({ email: emailLower })

      if (!user) {
        // Create new user for OAuth (no password required)
        user = await User.create({
          name: name || emailLower.split('@')[0],
          email: emailLower,
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

      userId = user._id
    }

    // Step 4: Generate JWT token
    const token = signToken(userId)

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
    const frontendUrl = (process.env.CORS_ORIGIN || '')
      .split(',')[0]
      ?.trim() || 'http://localhost:5173'
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
