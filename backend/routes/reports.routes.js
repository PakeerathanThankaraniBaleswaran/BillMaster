import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { getReports } from '../controllers/reports.controller.js'

const router = Router()

router.use(protect)
router.get('/', getReports)

export default router
