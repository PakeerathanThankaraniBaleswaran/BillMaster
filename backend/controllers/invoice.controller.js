import Invoice from '../models/Invoice.model.js'
import Product from '../models/Product.model.js'
import Customer from '../models/Customer.model.js'
import InventoryItem from '../models/InventoryItem.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'

const clampPercent = (n) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.min(100, Math.max(0, v))
}

const allowedUnits = new Set(['number', 'kg', 'g', 'l', 'ml'])

const calculateTotals = async ({ userId, items = [], taxRate = 0, discountRate = 0 }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ErrorResponse('Invoice items are required', 400)
  }

  const productIds = items.map((item) => item.product).filter(Boolean)
  const products = await Product.find({ _id: { $in: productIds }, user: userId })
  const productMap = new Map(products.map((p) => [String(p._id), p]))

  let subtotal = 0
  const normalizedItems = items.map((item) => {
    const { product, quantity = 0, price, description = '', unit = 'number' } = item || {}
    if (quantity <= 0) throw new ErrorResponse('Quantity must be greater than zero', 400)

    const safeUnit = allowedUnits.has(unit) ? unit : 'number'

    let unitPrice = Number(price)
    let desc = description

    if (product) {
      const productDoc = productMap.get(String(product))
      if (!productDoc) throw new ErrorResponse('Product not found or not owned by user', 404)
      if (!desc) desc = productDoc.name
      if (!Number.isFinite(unitPrice) || unitPrice < 0) unitPrice = productDoc.price
    }

    if (!desc) throw new ErrorResponse('Description is required for each line item', 400)
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new ErrorResponse('Invalid price on item', 400)
    }

    const lineTotal = unitPrice * quantity
    subtotal += lineTotal

    return {
      product: product || null,
      description: desc,
      quantity,
      unit: safeUnit,
      price: unitPrice,
      total: lineTotal,
    }
  })

  const safeTaxRate = clampPercent(taxRate)
  const safeDiscountRate = clampPercent(discountRate)
  const taxAmount = (subtotal * safeTaxRate) / 100
  const discountAmount = (subtotal * safeDiscountRate) / 100
  const total = Math.max(0, subtotal + taxAmount - discountAmount)

  return {
    items: normalizedItems,
    subtotal,
    taxRate: safeTaxRate,
    taxAmount,
    discountRate: safeDiscountRate,
    discountAmount,
    total,
    currency: 'LKR',
  }
}

const normalizeName = (s) => String(s || '').trim()

const getLowStockWarnings = async (userId) => {
  const items = await InventoryItem.find({
    user: userId,
    minQuantity: { $gt: 0 },
  })
    .select('company product variant quantity minQuantity')
    .lean()

  return items
    .filter((e) => Number(e.quantity || 0) <= Number(e.minQuantity || 0))
    .map((e) => ({
      _id: e._id,
      company: e.company,
      product: e.product,
      variant: e.variant,
      quantity: e.quantity,
      minQuantity: e.minQuantity,
    }))
}

const deductInventoryForInvoice = async ({ userId, invoiceItems }) => {
  // Invoice items don't include variant/company; deduct from any matching inventory product name.
  // Deduct newest stock first.
  const productIds = invoiceItems.map((i) => i.product).filter(Boolean)
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds }, user: userId }).select('name')
    : []
  const productMap = new Map(products.map((p) => [String(p._id), p]))

  for (const item of invoiceItems) {
    const qty = Number(item.quantity || 0)
    if (!Number.isFinite(qty) || qty <= 0) continue

    const productName = item.product
      ? normalizeName(productMap.get(String(item.product))?.name)
      : normalizeName(item.description)

    if (!productName) continue

    let remaining = qty
    const candidates = await InventoryItem.find({
      user: userId,
      product: { $regex: new RegExp(`^${productName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i') },
      quantity: { $gt: 0 },
    })
      .sort({ createdAt: -1 })

    const availableTotal = candidates.reduce((sum, c) => sum + Number(c.quantity || 0), 0)
    if (availableTotal < remaining) {
      throw new ErrorResponse(`Insufficient stock for ${productName} (needed ${qty}, available ${availableTotal})`, 400)
    }

    for (const stock of candidates) {
      if (remaining <= 0) break
      const available = Number(stock.quantity || 0)
      if (available <= 0) continue
      const take = Math.min(available, remaining)
      stock.quantity = available - take
      await stock.save()
      remaining -= take
    }
  }
}

export const createInvoice = asyncHandler(async (req, res, next) => {
  const {
    invoiceNumber,
    customer: customerId,
    items = [],
    status = 'draft',
    notes = '',
    invoiceDate,
    dueDate,
    taxRate = 0,
    discountRate = 0,
  } = req.body || {}

  if (!invoiceNumber) return next(new ErrorResponse('Invoice number is required', 400))

  let customer = null
  if (customerId) {
    customer = await Customer.findOne({ _id: customerId, user: req.user.id })
    if (!customer) return next(new ErrorResponse('Customer not found', 404))
  }

  const computed = await calculateTotals({ userId: req.user.id, items, taxRate, discountRate })

  if (status === 'paid') {
    await deductInventoryForInvoice({ userId: req.user.id, invoiceItems: computed.items })
  }

  const created = await Invoice.create({
    user: req.user.id,
    customer: customer?._id || null,
    invoiceNumber,
    items: computed.items,
    status,
    notes,
    currency: computed.currency,
    subtotal: computed.subtotal,
    taxRate: computed.taxRate,
    taxAmount: computed.taxAmount,
    discountRate: computed.discountRate,
    discountAmount: computed.discountAmount,
    total: computed.total,
    invoiceDate: invoiceDate || Date.now(),
    dueDate: dueDate || null,
  })

  const warnings = await getLowStockWarnings(req.user.id)

  res.status(201).json({
    success: true,
    data: { invoice: created },
    warnings: warnings.length ? { lowStock: warnings } : undefined,
  })
})

export const listInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ user: req.user.id })
    .populate('customer', 'name email phone')
    .populate('items.product', 'name price')
    .sort({ createdAt: -1 })
  res.json({ success: true, data: { invoices } })
})

export const getInvoice = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const invoice = await Invoice.findOne({ _id: id, user: req.user.id })
    .populate('customer', 'name email phone address city zip')
    .populate('items.product', 'name price')
  if (!invoice) return next(new ErrorResponse('Invoice not found', 404))
  res.json({ success: true, data: { invoice } })
})

export const updateInvoice = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const { items, customer: customerId, taxRate, discountRate } = req.body || {}

  const existingInvoice = await Invoice.findOne({ _id: id, user: req.user.id })
  if (!existingInvoice) return next(new ErrorResponse('Invoice not found', 404))

  // Prevent changing paid invoices to avoid double-deducting stock or inconsistencies.
  if (existingInvoice.status === 'paid') {
    if (req.body?.status && req.body.status !== 'paid') {
      return next(new ErrorResponse('Paid invoices cannot be changed', 400))
    }
    if (req.body?.items) {
      return next(new ErrorResponse('Paid invoices cannot be changed', 400))
    }
  }

  if (customerId) {
    const customer = await Customer.findOne({ _id: customerId, user: req.user.id })
    if (!customer) return next(new ErrorResponse('Customer not found', 404))
  }

  let computed = {}
  if (items || taxRate != null || discountRate != null) {
    const effectiveItems = items || existingInvoice.items || []
    const effectiveTax = taxRate != null ? taxRate : existingInvoice.taxRate || 0
    const effectiveDiscount = discountRate != null ? discountRate : existingInvoice.discountRate || 0
    computed = await calculateTotals({
      userId: req.user.id,
      items: effectiveItems,
      taxRate: effectiveTax,
      discountRate: effectiveDiscount,
    })
  }

  const nextStatus = req.body?.status || existingInvoice.status
  const shouldDeduct = existingInvoice.status !== 'paid' && nextStatus === 'paid'

  if (shouldDeduct) {
    const invoiceItemsToUse = computed.items || existingInvoice.items
    await deductInventoryForInvoice({ userId: req.user.id, invoiceItems: invoiceItemsToUse })
  }

  const updatedInvoice = await Invoice.findOneAndUpdate(
    { _id: id, user: req.user.id },
    { ...req.body, ...computed },
    { new: true }
  )
  if (!updatedInvoice) return next(new ErrorResponse('Invoice not found', 404))

  const warnings = await getLowStockWarnings(req.user.id)

  const invoice = await Invoice.findOne({ _id: updatedInvoice._id, user: req.user.id })
    .populate('customer', 'name email phone address city zip')
    .populate('items.product', 'name price')
  if (!invoice) return next(new ErrorResponse('Invoice not found', 404))

  res.json({
    success: true,
    data: { invoice },
    warnings: warnings.length ? { lowStock: warnings } : undefined,
  })
})

export const deleteInvoice = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const invoice = await Invoice.findOneAndDelete({ _id: id, user: req.user.id })
  if (!invoice) return next(new ErrorResponse('Invoice not found', 404))
  res.json({ success: true, message: 'Invoice deleted' })
})
