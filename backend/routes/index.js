import express from 'express'
import authRoutes from './auth.routes.js'
import companyRoutes from './company.routes.js'

const router = express.Router()

// Mount route modules
router.use('/auth', authRoutes)
router.use('/company', companyRoutes)

export default router

