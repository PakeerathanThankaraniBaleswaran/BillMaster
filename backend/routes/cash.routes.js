import express from 'express'
import { createCashEntry, createCashOutEntry, getCashSummary } from '../controllers/cash.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/', protect, createCashEntry)
router.get('/summary', protect, getCashSummary)

// Alias route for cash-out entries
router.post('/out', protect, createCashOutEntry)

export default router
