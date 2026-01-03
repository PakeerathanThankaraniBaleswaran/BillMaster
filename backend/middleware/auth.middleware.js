import jwt from 'jsonwebtoken'
import User from '../models/User.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'

// Protect routes - verify JWT token
export const protect = asyncHandler(async (req, res, next) => {
  let token

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401))
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret')

    // Get user from token
    req.user = await User.findById(decoded.id)

    if (!req.user) {
      return next(new ErrorResponse('User not found with this token', 401))
    }

    if (!req.user.isActive) {
      return next(new ErrorResponse('User account is deactivated', 401))
    }

    next()
  } catch (error) {
    return next(new ErrorResponse('Not authorized to access this route', 401))
  }
})

// Role-based authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role '${req.user.role}' is not authorized to access this route`,
          403
        )
      )
    }
    next()
  }
}

