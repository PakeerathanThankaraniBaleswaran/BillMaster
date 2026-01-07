import CashEntry from '../models/CashEntry.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'

const allowedDenoms = [5000, 2000, 1000, 500, 100, 50, 20, 10]

const computeTotal = (denominations = {}) => {
  let total = 0
  for (const [key, rawCount] of Object.entries(denominations)) {
    const denom = Number(key)
    const count = Number(rawCount)
    if (!allowedDenoms.includes(denom)) continue
    if (!Number.isFinite(count) || count < 0) continue
    total += denom * count
  }
  return total
}

// @desc    Create cash-in entry
// @route   POST /api/cash-in
// @access  Private
export const createCashEntry = asyncHandler(async (req, res, next) => {
  const { denominations = {}, notes = '', type = 'in' } = req.body || {}

  const safeType = type === 'out' ? 'out' : 'in'

  const totalAmount = computeTotal(denominations)

  if (totalAmount <= 0) {
    return next(new ErrorResponse('Total amount must be greater than zero', 400))
  }

  const entry = await CashEntry.create({
    user: req.user.id,
    type: safeType,
    denominations,
    totalAmount,
    notes,
  })

  return res.status(201).json({
    success: true,
    data: {
      entry,
    },
  })
})

// @desc    Create cash-out entry
// @route   POST /api/cash-out
// @access  Private
export const createCashOutEntry = asyncHandler(async (req, res, next) => {
  req.body = { ...(req.body || {}), type: 'out' }
  return createCashEntry(req, res, next)
})

// @desc    Get today summary for cash-in
// @route   GET /api/cash-in/summary
// @access  Private
export const getCashSummary = asyncHandler(async (req, res) => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  const entries = await CashEntry.find({
    user: req.user.id,
    createdAt: { $gte: start, $lte: end },
  })
    .sort({ createdAt: -1 })
    .lean()

  const totalCashToday = entries.reduce((sum, e) => sum + (e.totalAmount || 0), 0)
  const entryCount = entries.length
  const lastEntry = entries[0] || null

  return res.status(200).json({
    success: true,
    data: {
      totalCashToday,
      entryCount,
      lastEntry,
      entries,
    },
  })
})
