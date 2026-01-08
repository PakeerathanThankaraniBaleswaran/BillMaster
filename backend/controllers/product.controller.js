import Product from '../models/Product.model.js'
import InventoryItem from '../models/InventoryItem.model.js'
import mongoose from 'mongoose'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'
import { isFirebase } from '../services/datastore.js'
import { collection, docToApi, nowTimestamp } from '../services/firestore.js'

const allowedUnits = new Set(['number', 'kg', 'g', 'l', 'ml'])
const normalizeName = (s) => String(s || '').trim()

export const createProduct = asyncHandler(async (req, res, next) => {
  const { name, sku = '', price, description = '', unit = 'number' } = req.body || {}
  if (!name) return next(new ErrorResponse('Product name is required', 400))
  if (!Number.isFinite(price) || price < 0) return next(new ErrorResponse('Price must be zero or greater', 400))

  const safeUnit = allowedUnits.has(unit) ? unit : 'number'

  if (isFirebase()) {
    const safeName = normalizeName(name)
    const ref = await collection('products').add({
      user: String(req.user.id),
      name: safeName,
      nameLower: safeName.toLowerCase(),
      sku: String(sku || '').trim(),
      unit: safeUnit,
      price: Number(price),
      description: String(description || '').trim(),
      createdAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    })
    const snap = await ref.get()
    const product = docToApi(snap)
    return res.status(201).json({ success: true, data: { product } })
  }

  const product = await Product.create({
    user: req.user.id,
    name,
    sku,
    unit: safeUnit,
    price,
    description,
  })

  res.status(201).json({ success: true, data: { product } })
})

export const listProducts = asyncHandler(async (req, res) => {
  const userId = req.user.id

  if (isFirebase()) {
    const productsSnap = await collection('products')
      .where('user', '==', String(userId))
      .orderBy('createdAt', 'desc')
      .get()

    const existingProducts = productsSnap.docs.map(docToApi)
    const existingByLower = new Set(
      existingProducts
        .map((p) => String(p?.name || '').trim().toLowerCase())
        .filter(Boolean)
    )

    const invSnap = await collection('inventoryItems')
      .where('user', '==', String(userId))
      .orderBy('createdAt', 'desc')
      .get()
    const invItems = invSnap.docs.map(docToApi)

    const groups = new Map()
    for (const it of invItems) {
      const n = normalizeName(it.product)
      if (!n) continue
      const lower = n.toLowerCase()
      if (!groups.has(lower)) {
        groups.set(lower, {
          name: n,
          sellingPrice: Number(it.sellingPrice),
          purchaseUnit: it.purchaseUnit,
        })
      }
    }

    const toInsert = []
    for (const [lower, g] of groups.entries()) {
      if (existingByLower.has(lower)) continue
      const price = Number(g.sellingPrice)
      const unit = allowedUnits.has(g.purchaseUnit) ? g.purchaseUnit : 'number'
      if (!Number.isFinite(price) || price < 0) continue
      toInsert.push({ lower, name: g.name, price, unit })
    }

    if (toInsert.length) {
      const batch = collection('products').firestore.batch()
      for (const p of toInsert) {
        const ref = collection('products').doc()
        batch.set(ref, {
          user: String(userId),
          name: p.name,
          nameLower: p.lower,
          sku: '',
          unit: p.unit,
          price: p.price,
          description: '',
          createdAt: nowTimestamp(),
          updatedAt: nowTimestamp(),
        })
      }
      await batch.commit()
    }

    const refreshed = await collection('products')
      .where('user', '==', String(userId))
      .orderBy('createdAt', 'desc')
      .get()
    const products = refreshed.docs.map(docToApi)
    return res.json({ success: true, data: { products } })
  }

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
        purchaseUnit: { $first: '$purchaseUnit' },
      },
    },
  ])

  const toInsert = invGroups
    .map((g) => {
      const name = String(g?.product || '').trim()
      const lower = name.toLowerCase()
      const price = Number(g?.sellingPrice)
      const unit = allowedUnits.has(g?.purchaseUnit) ? g.purchaseUnit : 'number'
      if (!name || existingByLower.has(lower)) return null
      if (!Number.isFinite(price) || price < 0) return null
      return { name, price, unit }
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
            unit: p.unit,
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

  if (isFirebase()) {
    if (Object.prototype.hasOwnProperty.call(updates, 'unit')) {
      if (updates.unit == null || updates.unit === '') {
        delete updates.unit
      } else if (!allowedUnits.has(updates.unit)) {
        return next(new ErrorResponse('Invalid unit', 400))
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'price')) {
      if (updates.price == null) {
        delete updates.price
      } else if (!Number.isFinite(updates.price) || updates.price < 0) {
        return next(new ErrorResponse('Price must be zero or greater', 400))
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
      const safeName = normalizeName(updates.name)
      if (!safeName) return next(new ErrorResponse('Product name is required', 400))
      updates.name = safeName
      updates.nameLower = safeName.toLowerCase()
    }

    updates.updatedAt = nowTimestamp()

    const ref = collection('products').doc(String(id))
    const snap = await ref.get()
    if (!snap.exists) return next(new ErrorResponse('Product not found', 404))
    const existing = docToApi(snap)
    if (String(existing.user) !== String(req.user.id)) {
      return next(new ErrorResponse('Product not found', 404))
    }

    await ref.update(updates)
    const nextSnap = await ref.get()
    const product = docToApi(nextSnap)
    return res.json({ success: true, data: { product } })
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'unit')) {
    if (updates.unit == null || updates.unit === '') {
      delete updates.unit
    } else if (!allowedUnits.has(updates.unit)) {
      return next(new ErrorResponse('Invalid unit', 400))
    }
  }

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

  if (isFirebase()) {
    const ref = collection('products').doc(String(id))
    const snap = await ref.get()
    if (!snap.exists) return next(new ErrorResponse('Product not found', 404))
    const existing = docToApi(snap)
    if (String(existing.user) !== String(req.user.id)) {
      return next(new ErrorResponse('Product not found', 404))
    }
    await ref.delete()
    return res.json({ success: true, message: 'Product deleted' })
  }
  const product = await Product.findOneAndDelete({ _id: id, user: req.user.id })
  if (!product) return next(new ErrorResponse('Product not found', 404))
  res.json({ success: true, message: 'Product deleted' })
})
