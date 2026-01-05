import Product from '../models/Product.model.js'
import InventoryItem from '../models/InventoryItem.model.js'
import mongoose from 'mongoose'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'

export const createProduct = asyncHandler(async (req, res, next) => {
  const { name, sku = '', price, description = '' } = req.body || {}
  if (!name) return next(new ErrorResponse('Product name is required', 400))
  if (!Number.isFinite(price) || price < 0) return next(new ErrorResponse('Price must be zero or greater', 400))

  const product = await Product.create({
    user: req.user.id,
    name,
    sku,
    price,
    description,
  })

  res.status(201).json({ success: true, data: { product } })
})

export const listProducts = asyncHandler(async (req, res) => {
  const userId = req.user.id

  // Keep the product catalog in sync with inventory items so that
  // anything added to inventory is visible in the Products page.
  const existingProducts = await Product.find({ user: userId }).select('name').lean()
  const existingByLower = new Set(
    existingProducts
      .map((p) => String(p?.name || '').trim().toLowerCase())
      .filter(Boolean)
  )

  const invGroups = await InventoryItem.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $addFields: { productLower: { $toLower: '$product' } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$productLower',
        product: { $first: '$product' },
        sellingPrice: { $first: '$sellingPrice' },
      },
    },
  ])

  const toInsert = invGroups
    .map((g) => {
      const name = String(g?.product || '').trim()
      const lower = name.toLowerCase()
      const price = Number(g?.sellingPrice)
      if (!name || existingByLower.has(lower)) return null
      if (!Number.isFinite(price) || price < 0) return null
      return { name, price }
    })
    .filter(Boolean)

  if (toInsert.length) {
    await Product.bulkWrite(
      toInsert.map((p) => ({
        insertOne: {
          document: {
            user: userId,
            name: p.name,
            sku: '',
            price: p.price,
            description: '',
          },
        },
      }))
    )
  }

  const products = await Product.find({ user: userId }).sort({ createdAt: -1 })
  res.json({ success: true, data: { products } })
})

export const updateProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const updates = req.body || {}

  if (Object.prototype.hasOwnProperty.call(updates, 'price')) {
    if (updates.price == null) {
      delete updates.price
    } else if (!Number.isFinite(updates.price) || updates.price < 0) {
      return next(new ErrorResponse('Price must be zero or greater', 400))
    }
  }

  const product = await Product.findOneAndUpdate(
    { _id: id, user: req.user.id },
    updates,
    { new: true, runValidators: true }
  )
  if (!product) return next(new ErrorResponse('Product not found', 404))
  res.json({ success: true, data: { product } })
})

export const deleteProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const product = await Product.findOneAndDelete({ _id: id, user: req.user.id })
  if (!product) return next(new ErrorResponse('Product not found', 404))
  res.json({ success: true, message: 'Product deleted' })
})
