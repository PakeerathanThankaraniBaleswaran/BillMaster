import InventoryItem from '../models/InventoryItem.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'
import { isFirebase } from '../services/datastore.js'
import {
  collection,
  docToApi,
  nowTimestamp,
  updateByIdOwned,
  deleteByIdOwned,
} from '../services/firestore.js'

const normalizeName = (s) => String(s || '').trim()

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

  if (isFirebase()) {
    const safeProduct = normalizeName(product)
    const ref = await collection('inventoryItems').add({
      user: String(req.user.id),
      company: normalizeName(company),
      product: safeProduct,
      productLower: safeProduct.toLowerCase(),
      variant: normalizeName(variant),
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      minQuantity: Number(minQuantity || 0),
      purchaseQuantityLabel: String(purchaseQuantityLabel || '').trim(),
      purchaseUnit: purchaseUnit || 'number',
      createdAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    })
    const snap = await ref.get()
    const item = docToApi(snap)
    return res.status(201).json({ success: true, data: { item } })
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
  if (isFirebase()) {
    const snap = await collection('inventoryItems')
      .where('user', '==', String(req.user.id))
      .orderBy('createdAt', 'desc')
      .get()
    const items = snap.docs.map(docToApi)

    const totalProducts = items.length
    const totalStock = items.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0)
    const inventoryValue = items.reduce(
      (sum, e) => sum + (Number(e.quantity) || 0) * (Number(e.sellingPrice) || 0),
      0
    )
    const companies = new Set(items.map((e) => e.company || '')).size

    const lowStockItems = items
      .filter(
        (e) =>
          Number(e.minQuantity || 0) > 0 &&
          Number(e.quantity || 0) <= Number(e.minQuantity || 0)
      )
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
  }

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

  if (isFirebase()) {
    const updates = { ...(req.body || {}) }

    if (Object.prototype.hasOwnProperty.call(updates, 'quantity')) {
      if (!Number.isFinite(updates.quantity) || updates.quantity <= 0) {
        return next(new ErrorResponse('Quantity must be greater than zero', 400))
      }
      updates.quantity = Number(updates.quantity)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'purchasePrice')) {
      if (!Number.isFinite(updates.purchasePrice) || updates.purchasePrice < 0) {
        return next(new ErrorResponse('Purchase price must be zero or greater', 400))
      }
      updates.purchasePrice = Number(updates.purchasePrice)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'sellingPrice')) {
      if (!Number.isFinite(updates.sellingPrice) || updates.sellingPrice < 0) {
        return next(new ErrorResponse('Selling price must be zero or greater', 400))
      }
      updates.sellingPrice = Number(updates.sellingPrice)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'minQuantity')) {
      if (!Number.isFinite(updates.minQuantity) || updates.minQuantity < 0) {
        return next(new ErrorResponse('Minimum quantity must be zero or greater', 400))
      }
      updates.minQuantity = Number(updates.minQuantity)
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'product')) {
      const safeProduct = normalizeName(updates.product)
      updates.product = safeProduct
      updates.productLower = safeProduct.toLowerCase()
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'company')) {
      updates.company = normalizeName(updates.company)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'variant')) {
      updates.variant = normalizeName(updates.variant)
    }

    const item = await updateByIdOwned('inventoryItems', id, req.user.id, updates)
    if (!item) return next(new ErrorResponse('Inventory item not found', 404))

    return res.status(200).json({
      success: true,
      data: { item },
    })
  }
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

  if (isFirebase()) {
    const deleted = await deleteByIdOwned('inventoryItems', id, req.user.id)
    if (!deleted) return next(new ErrorResponse('Inventory item not found', 404))

    return res.status(200).json({
      success: true,
      message: 'Inventory item deleted',
    })
  }
  const item = await InventoryItem.findOneAndDelete({ _id: id, user: req.user.id })
  if (!item) return next(new ErrorResponse('Inventory item not found', 404))

  return res.status(200).json({
    success: true,
    message: 'Inventory item deleted',
  })
})
