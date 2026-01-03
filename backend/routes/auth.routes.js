import express from 'express'
import { 
  register, 
  login, 
  getProfile, 
  googleAuth, 
  googleCallback,
  githubAuth,
  githubCallback
} from '../controllers/auth.controller.js'
import { protect } from '../middleware/auth.middleware.js'
import { validateRegister, validateLogin } from '../middleware/validate.middleware.js'

const router = express.Router()

router.post('/register', validateRegister, register)
router.post('/login', validateLogin, login)
router.get('/profile', protect, getProfile)

// OAuth routes
router.get('/google', googleAuth)
router.get('/google/callback', googleCallback)
router.get('/github', githubAuth)
router.get('/github/callback', githubCallback)

export default router

