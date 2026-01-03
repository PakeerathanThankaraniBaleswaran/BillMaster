import express from 'express'
import authRoutes from './auth.routes.js'
import companyRoutes from './company.routes.js'
import cashRoutes from './cash.routes.js'

const router = express.Router()

// Mount route modules
router.use('/auth', authRoutes)
router.use('/company', companyRoutes)
router.use('/cash-in', cashRoutes)

export default router

