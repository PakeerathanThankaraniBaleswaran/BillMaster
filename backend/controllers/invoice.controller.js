import Invoice from '../models/Invoice.model.js'
import Product from '../models/Product.model.js'
import Customer from '../models/Customer.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'

const clampPercent = (n) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.min(100, Math.max(0, v))
}

const calculateTotals = async ({ userId, items = [], taxRate = 0, discountRate = 0 }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ErrorResponse('Invoice items are required', 400)
  }

  const productIds = items.map((item) => item.product).filter(Boolean)
  const products = await Product.find({ _id: { $in: productIds }, user: userId })
  const productMap = new Map(products.map((p) => [String(p._id), p]))

  let subtotal = 0
  const normalizedItems = items.map((item) => {
    const { product, quantity = 0, price, description = '' } = item || {}
    if (quantity <= 0) throw new ErrorResponse('Quantity must be greater than zero', 400)

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
  if (!customerId) return next(new ErrorResponse('Customer is required', 400))

  const customer = await Customer.findOne({ _id: customerId, user: req.user.id })
  if (!customer) return next(new ErrorResponse('Customer not found', 404))

  const computed = await calculateTotals({ userId: req.user.id, items, taxRate, discountRate })

  const invoice = await Invoice.create({
    user: req.user.id,
    customer: customer._id,
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

  res.status(201).json({ success: true, data: { invoice } })
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

  if (customerId) {
    const customer = await Customer.findOne({ _id: customerId, user: req.user.id })
    if (!customer) return next(new ErrorResponse('Customer not found', 404))
  }

  let computed = {}
  if (items || taxRate != null || discountRate != null) {
    const existing = await Invoice.findOne({ _id: id, user: req.user.id }).lean()
    if (!existing) return next(new ErrorResponse('Invoice not found', 404))

    const effectiveItems = items || existing.items || []
    const effectiveTax = taxRate != null ? taxRate : existing.taxRate || 0
    const effectiveDiscount = discountRate != null ? discountRate : existing.discountRate || 0
    computed = await calculateTotals({
      userId: req.user.id,
      items: effectiveItems,
      taxRate: effectiveTax,
      discountRate: effectiveDiscount,
    })
  }

  const invoice = await Invoice.findOneAndUpdate(
    { _id: id, user: req.user.id },
    { ...req.body, ...computed },
    { new: true }
  )
    .populate('customer', 'name email phone address city zip')
    .populate('items.product', 'name price')
  if (!invoice) return next(new ErrorResponse('Invoice not found', 404))

  res.json({ success: true, data: { invoice } })
})

export const deleteInvoice = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const invoice = await Invoice.findOneAndDelete({ _id: id, user: req.user.id })
  if (!invoice) return next(new ErrorResponse('Invoice not found', 404))
  res.json({ success: true, message: 'Invoice deleted' })
})
