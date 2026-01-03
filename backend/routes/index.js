import express from 'express'
import authRoutes from './auth.routes.js'

const router = express.Router()

// Mount route modules
router.use('/auth', authRoutes)

export default router

