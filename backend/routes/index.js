import express from 'express'
import authRoutes from './auth.routes.js'
import companyRoutes from './company.routes.js'
import cashRoutes from './cash.routes.js'
import inventoryRoutes from './inventory.routes.js'
import productRoutes from './product.routes.js'
import customerRoutes from './customer.routes.js'
import invoiceRoutes from './invoice.routes.js'
import summaryRoutes from './summary.routes.js'
import reportsRoutes from './reports.routes.js'

const router = express.Router()

// Mount route modules
router.use('/auth', authRoutes)
router.use('/company', companyRoutes)
router.use('/cash-in', cashRoutes)
router.use('/cash-out', cashRoutes)
router.use('/inventory', inventoryRoutes)
router.use('/products', productRoutes)
router.use('/customers', customerRoutes)
router.use('/invoices', invoiceRoutes)
router.use('/summary', summaryRoutes)
router.use('/reports', reportsRoutes)

export default router

