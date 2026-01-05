import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { getDashboardSummary } from '../controllers/summary.controller.js'

const router = Router()

router.use(protect)
router.get('/', getDashboardSummary)

export default router
