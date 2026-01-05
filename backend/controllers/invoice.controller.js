import Invoice from '../models/Invoice.model.js'
import Product from '../models/Product.model.js'
import Customer from '../models/Customer.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'

const calculateTotals = async ({ userId, items = [] }) => {
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

  return { items: normalizedItems, subtotal, total: subtotal, currency: 'LKR' }
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
  } = req.body || {}

  if (!invoiceNumber) return next(new ErrorResponse('Invoice number is required', 400))
  if (!customerId) return next(new ErrorResponse('Customer is required', 400))

  const customer = await Customer.findOne({ _id: customerId, user: req.user.id })
  if (!customer) return next(new ErrorResponse('Customer not found', 404))

  const { items: normalizedItems, subtotal, total, currency } = await calculateTotals({ userId: req.user.id, items })

  const invoice = await Invoice.create({
    user: req.user.id,
    customer: customer._id,
    invoiceNumber,
    items: normalizedItems,
    status,
    notes,
    currency,
    subtotal,
    total,
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
  const { items, customer: customerId } = req.body || {}

  if (customerId) {
    const customer = await Customer.findOne({ _id: customerId, user: req.user.id })
    if (!customer) return next(new ErrorResponse('Customer not found', 404))
  }

  let computed = {}
  if (items) {
    computed = await calculateTotals({ userId: req.user.id, items })
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
