import InventoryItem from '../models/InventoryItem.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'

// @desc    Create inventory item
// @route   POST /api/inventory
// @access  Private
export const createInventoryItem = asyncHandler(async (req, res, next) => {
  const { company, product, variant = '', quantity, purchasePrice, sellingPrice } = req.body || {}

  if (!company || !product) {
    return next(new ErrorResponse('Company and product are required', 400))
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return next(new ErrorResponse('Quantity must be greater than zero', 400))
  }
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return next(new ErrorResponse('Purchase price must be zero or greater', 400))
  }
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
    return next(new ErrorResponse('Selling price must be zero or greater', 400))
  }

  const item = await InventoryItem.create({
    user: req.user.id,
    company,
    product,
    variant,
    quantity,
    purchasePrice,
    sellingPrice,
  })

  return res.status(201).json({
    success: true,
    data: { item },
  })
})

// @desc    Get inventory summary and list
// @route   GET /api/inventory
// @access  Private
export const getInventory = asyncHandler(async (req, res) => {
  const items = await InventoryItem.find({ user: req.user.id }).sort({ createdAt: -1 }).lean()

  const totalProducts = items.length
  const totalStock = items.reduce((sum, e) => sum + (e.quantity || 0), 0)
  const inventoryValue = items.reduce((sum, e) => sum + (e.quantity || 0) * (e.sellingPrice || 0), 0)
  const companies = new Set(items.map((e) => e.company || '')).size

  return res.status(200).json({
    success: true,
    data: {
      items,
      summary: {
        totalProducts,
        totalStock,
        inventoryValue,
        companies,
      },
    },
  })
})
