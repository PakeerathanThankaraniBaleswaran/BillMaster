import express from 'express'
import { createCashEntry, getCashSummary } from '../controllers/cash.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/', protect, createCashEntry)
router.get('/summary', protect, getCashSummary)

export default router
