import InventoryItem from '../models/InventoryItem.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'

// @desc    Create inventory item
// @route   POST /api/inventory
// @access  Private
export const createInventoryItem = asyncHandler(async (req, res, next) => {
  const {
    company,
    product,
    variant = '',
    quantity,
    purchasePrice,
    sellingPrice,
    minQuantity = 0,
    purchaseQuantityLabel = '',
    purchaseUnit = 'number',
  } = req.body || {}

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
  if (!Number.isFinite(minQuantity) || minQuantity < 0) {
    return next(new ErrorResponse('Minimum quantity must be zero or greater', 400))
  }

  const item = await InventoryItem.create({
    user: req.user.id,
    company,
    product,
    variant,
    quantity,
    purchasePrice,
    sellingPrice,
    minQuantity,
    purchaseQuantityLabel,
    purchaseUnit,
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

  const lowStockItems = items
    .filter((e) => Number(e.minQuantity || 0) > 0 && Number(e.quantity || 0) <= Number(e.minQuantity || 0))
    .map((e) => ({
      _id: e._id,
      company: e.company,
      product: e.product,
      variant: e.variant,
      quantity: e.quantity,
      minQuantity: e.minQuantity,
    }))
  const lowStockCount = lowStockItems.length

  return res.status(200).json({
    success: true,
    data: {
      items,
      summary: {
        totalProducts,
        totalStock,
        inventoryValue,
        companies,
        lowStockCount,
        lowStockItems,
      },
    },
  })
})

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private
export const updateInventoryItem = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const item = await InventoryItem.findOne({ _id: id, user: req.user.id })
  if (!item) return next(new ErrorResponse('Inventory item not found', 404))

  const {
    company,
    product,
    variant,
    quantity,
    purchasePrice,
    sellingPrice,
    minQuantity,
    purchaseQuantityLabel,
    purchaseUnit,
  } = req.body || {}

  if (company != null) item.company = company
  if (product != null) item.product = product
  if (variant != null) item.variant = variant
  if (purchaseQuantityLabel != null) item.purchaseQuantityLabel = purchaseQuantityLabel
  if (purchaseUnit != null) item.purchaseUnit = purchaseUnit

  if (quantity != null) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return next(new ErrorResponse('Quantity must be greater than zero', 400))
    }
    item.quantity = quantity
  }

  if (purchasePrice != null) {
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      return next(new ErrorResponse('Purchase price must be zero or greater', 400))
    }
    item.purchasePrice = purchasePrice
  }

  if (sellingPrice != null) {
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      return next(new ErrorResponse('Selling price must be zero or greater', 400))
    }
    item.sellingPrice = sellingPrice
  }

  if (minQuantity != null) {
    if (!Number.isFinite(minQuantity) || minQuantity < 0) {
      return next(new ErrorResponse('Minimum quantity must be zero or greater', 400))
    }
    item.minQuantity = minQuantity
  }

  await item.save()

  return res.status(200).json({
    success: true,
    data: { item },
  })
})

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private
export const deleteInventoryItem = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const item = await InventoryItem.findOneAndDelete({ _id: id, user: req.user.id })
  if (!item) return next(new ErrorResponse('Inventory item not found', 404))

  return res.status(200).json({
    success: true,
    message: 'Inventory item deleted',
  })
})
