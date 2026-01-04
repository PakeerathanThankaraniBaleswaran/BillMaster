import express from 'express'
import authRoutes from './auth.routes.js'
import companyRoutes from './company.routes.js'
import cashRoutes from './cash.routes.js'
import inventoryRoutes from './inventory.routes.js'

const router = express.Router()

// Mount route modules
router.use('/auth', authRoutes)
router.use('/company', companyRoutes)
router.use('/cash-in', cashRoutes)
router.use('/inventory', inventoryRoutes)

export default router

