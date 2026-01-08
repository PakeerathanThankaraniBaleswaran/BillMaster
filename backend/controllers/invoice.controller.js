import Invoice from '../models/Invoice.model.js'
import Product from '../models/Product.model.js'
import Customer from '../models/Customer.model.js'
import InventoryItem from '../models/InventoryItem.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'
import { isFirebase } from '../services/datastore.js'
import {
  batchGet,
  collection,
  db,
  docToApi,
  nowTimestamp,
} from '../services/firestore.js'

const clampPercent = (n) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.min(100, Math.max(0, v))
}

const allowedUnits = new Set(['number', 'kg', 'g', 'l', 'ml'])
const allowedPaymentModes = new Set(['cash', 'card', 'upi', 'credit'])

const normalizeName = (s) => String(s || '').trim()
const normalizeLower = (s) => normalizeName(s).toLowerCase()

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

const calculateTotalsFirebase = async ({ userId, items = [], taxRate = 0, discountRate = 0 }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ErrorResponse('Invoice items are required', 400)
  }

  const productIds = items.map((item) => item.product).filter(Boolean).map(String)
  const products = await batchGet('products', productIds)
  const ownedProducts = products.filter((p) => String(p.user) === String(userId))
  const productMap = new Map(ownedProducts.map((p) => [String(p._id), p]))

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
      if (!Number.isFinite(unitPrice) || unitPrice < 0) unitPrice = Number(productDoc.price)
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

const getLowStockWarningsFirebase = async (userId) => {
  const snap = await collection('inventoryItems')
    .where('user', '==', String(userId))
    .orderBy('createdAt', 'desc')
    .get()
  const items = snap.docs.map(docToApi)

  return items
    .filter((e) => Number(e.minQuantity || 0) > 0)
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

const deductInventoryForInvoiceFirebase = async ({ userId, invoiceItems }) => {
  const productIds = invoiceItems.map((i) => i.product).filter(Boolean).map(String)
  const products = await batchGet('products', productIds)
  const productMap = new Map(
    products
      .filter((p) => String(p.user) === String(userId))
      .map((p) => [String(p._id), p])
  )

  // Group required deductions by productLower
  const requiredByProductLower = new Map()
  for (const item of invoiceItems) {
    const qty = Number(item.quantity || 0)
    if (!Number.isFinite(qty) || qty <= 0) continue

    const productName = item.product
      ? normalizeName(productMap.get(String(item.product))?.name)
      : normalizeName(item.description)

    if (!productName) continue
    const key = productName.toLowerCase()
    requiredByProductLower.set(key, (requiredByProductLower.get(key) || 0) + qty)
  }

  await db().runTransaction(async (tx) => {
    for (const [productLower, requiredQty] of requiredByProductLower.entries()) {
      const q = collection('inventoryItems')
        .where('user', '==', String(userId))
        .where('productLower', '==', String(productLower))
        .orderBy('createdAt', 'desc')

      const snap = await tx.get(q)
      const candidates = snap.docs
        .map((d) => ({ ref: d.ref, data: docToApi(d) }))
        .filter((x) => Number(x.data.quantity || 0) > 0)

      const availableTotal = candidates.reduce((sum, c) => sum + Number(c.data.quantity || 0), 0)
      if (availableTotal < requiredQty) {
        const displayName = productLower
        throw new ErrorResponse(
          `Insufficient stock for ${displayName} (needed ${requiredQty}, available ${availableTotal})`,
          400
        )
      }

      let remaining = requiredQty
      for (const stock of candidates) {
        if (remaining <= 0) break
        const available = Number(stock.data.quantity || 0)
        const take = Math.min(available, remaining)
        tx.update(stock.ref, { quantity: available - take, updatedAt: nowTimestamp() })
        remaining -= take
      }
    }
  })
}

const hydrateInvoiceForResponseFirebase = async (invoice) => {
  const customerId = invoice?.customer ? String(invoice.customer) : null
  const customerDocs = customerId ? await batchGet('customers', [customerId]) : []
  const customer = customerDocs.length ? customerDocs[0] : null

  const productIds = Array.isArray(invoice?.items)
    ? invoice.items.map((i) => i?.product).filter(Boolean).map(String)
    : []
  const products = await batchGet('products', productIds)
  const productMap = new Map(products.map((p) => [String(p._id), p]))

  const items = Array.isArray(invoice?.items)
    ? invoice.items.map((it) => {
        const pid = it?.product ? String(it.product) : null
        const prod = pid ? productMap.get(pid) : null
        return {
          ...it,
          product: prod
            ? { _id: prod._id, name: prod.name, price: prod.price }
            : null,
        }
      })
    : []

  return {
    ...invoice,
    customer: customer
      ? { _id: customer._id, name: customer.name, email: customer.email, phone: customer.phone, address: customer.address, city: customer.city, zip: customer.zip }
      : null,
    items,
  }
}

export const createInvoice = asyncHandler(async (req, res, next) => {
  const {
    invoiceNumber,
    customer: customerId,
    items = [],
    status = 'draft',
    notes = '',
    paymentMode = 'cash',
    invoiceDate,
    dueDate,
    taxRate = 0,
    discountRate = 0,
  } = req.body || {}

  if (!invoiceNumber) return next(new ErrorResponse('Invoice number is required', 400))

  if (isFirebase()) {
    let customer = null
    if (customerId) {
      const snap = await collection('customers').doc(String(customerId)).get()
      if (!snap.exists) return next(new ErrorResponse('Customer not found', 404))
      const obj = docToApi(snap)
      if (String(obj.user) !== String(req.user.id)) {
        return next(new ErrorResponse('Customer not found', 404))
      }
      customer = obj
    }

    const computed = await calculateTotalsFirebase({
      userId: req.user.id,
      items,
      taxRate,
      discountRate,
    })

    const nextStatus = String(status || 'draft')
    if (nextStatus === 'paid') {
      await deductInventoryForInvoiceFirebase({ userId: req.user.id, invoiceItems: computed.items })
    }

    const normalizedPaymentMode = allowedPaymentModes.has(String(paymentMode || '').toLowerCase())
      ? String(paymentMode).toLowerCase()
      : 'cash'

    const ref = await collection('invoices').add({
      user: String(req.user.id),
      customer: customer?._id || null,
      invoiceNumber,
      items: computed.items,
      status: nextStatus,
      paymentMode: normalizedPaymentMode,
      notes,
      currency: computed.currency,
      subtotal: computed.subtotal,
      taxRate: computed.taxRate,
      taxAmount: computed.taxAmount,
      discountRate: computed.discountRate,
      discountAmount: computed.discountAmount,
      total: computed.total,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      createdAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    })

    const createdSnap = await ref.get()
    const createdInvoice = docToApi(createdSnap)
    const invoice = await hydrateInvoiceForResponseFirebase(createdInvoice)
    const warnings = await getLowStockWarningsFirebase(req.user.id)

    return res.status(201).json({
      success: true,
      data: { invoice },
      warnings: warnings.length ? { lowStock: warnings } : undefined,
    })
  }

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
    paymentMode: allowedPaymentModes.has(String(paymentMode || '').toLowerCase())
      ? String(paymentMode).toLowerCase()
      : 'cash',
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
  if (isFirebase()) {
    const snap = await collection('invoices')
      .where('user', '==', String(req.user.id))
      .orderBy('createdAt', 'desc')
      .get()
    const invoicesRaw = snap.docs.map(docToApi)

    const customerIds = Array.from(
      new Set(invoicesRaw.map((i) => i.customer).filter(Boolean).map(String))
    )
    const customers = await batchGet('customers', customerIds)
    const customerMap = new Map(customers.map((c) => [String(c._id), c]))

    const productIds = Array.from(
      new Set(
        invoicesRaw
          .flatMap((inv) => (Array.isArray(inv.items) ? inv.items : []))
          .map((it) => it?.product)
          .filter(Boolean)
          .map(String)
      )
    )
    const products = await batchGet('products', productIds)
    const productMap = new Map(products.map((p) => [String(p._id), p]))

    const invoices = invoicesRaw.map((inv) => {
      const customer = inv.customer ? customerMap.get(String(inv.customer)) : null
      const items = Array.isArray(inv.items)
        ? inv.items.map((it) => {
            const pid = it?.product ? String(it.product) : null
            const prod = pid ? productMap.get(pid) : null
            return {
              ...it,
              product: prod ? { _id: prod._id, name: prod.name, price: prod.price } : null,
            }
          })
        : []
      return {
        ...inv,
        customer: customer ? { _id: customer._id, name: customer.name, email: customer.email, phone: customer.phone } : null,
        items,
      }
    })

    return res.json({ success: true, data: { invoices } })
  }

  const invoices = await Invoice.find({ user: req.user.id })
    .populate('customer', 'name email phone')
    .populate('items.product', 'name price')
    .sort({ createdAt: -1 })
  res.json({ success: true, data: { invoices } })
})

export const getInvoice = asyncHandler(async (req, res, next) => {
  const { id } = req.params

  if (isFirebase()) {
    const snap = await collection('invoices').doc(String(id)).get()
    if (!snap.exists) return next(new ErrorResponse('Invoice not found', 404))
    const invoiceRaw = docToApi(snap)
    if (String(invoiceRaw.user) !== String(req.user.id)) {
      return next(new ErrorResponse('Invoice not found', 404))
    }
    const invoice = await hydrateInvoiceForResponseFirebase(invoiceRaw)
    return res.json({ success: true, data: { invoice } })
  }
  const invoice = await Invoice.findOne({ _id: id, user: req.user.id })
    .populate('customer', 'name email phone address city zip')
    .populate('items.product', 'name price')
  if (!invoice) return next(new ErrorResponse('Invoice not found', 404))
  res.json({ success: true, data: { invoice } })
})

export const updateInvoice = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const { items, customer: customerId, taxRate, discountRate } = req.body || {}

  if (isFirebase()) {
    const ref = collection('invoices').doc(String(id))
    const snap = await ref.get()
    if (!snap.exists) return next(new ErrorResponse('Invoice not found', 404))
    const existingInvoice = docToApi(snap)
    if (String(existingInvoice.user) !== String(req.user.id)) {
      return next(new ErrorResponse('Invoice not found', 404))
    }

    if (existingInvoice.status === 'paid') {
      if (req.body?.status && req.body.status !== 'paid') {
        return next(new ErrorResponse('Paid invoices cannot be changed', 400))
      }
      if (req.body?.items) {
        return next(new ErrorResponse('Paid invoices cannot be changed', 400))
      }
    }

    if (customerId) {
      const cs = await collection('customers').doc(String(customerId)).get()
      if (!cs.exists) return next(new ErrorResponse('Customer not found', 404))
      const c = docToApi(cs)
      if (String(c.user) !== String(req.user.id)) {
        return next(new ErrorResponse('Customer not found', 404))
      }
    }

    let computed = {}
    if (items || taxRate != null || discountRate != null) {
      const effectiveItems = items || existingInvoice.items || []
      const effectiveTax = taxRate != null ? taxRate : existingInvoice.taxRate || 0
      const effectiveDiscount = discountRate != null ? discountRate : existingInvoice.discountRate || 0
      computed = await calculateTotalsFirebase({
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
      await deductInventoryForInvoiceFirebase({ userId: req.user.id, invoiceItems: invoiceItemsToUse })
    }

    const normalizedPaymentMode =
      req.body?.paymentMode != null
        ? allowedPaymentModes.has(String(req.body.paymentMode || '').toLowerCase())
          ? String(req.body.paymentMode).toLowerCase()
          : 'cash'
        : undefined

    const updates = {
      ...(req.body || {}),
      ...(normalizedPaymentMode ? { paymentMode: normalizedPaymentMode } : {}),
      ...computed,
      updatedAt: nowTimestamp(),
    }
    await ref.update(updates)

    const updatedSnap = await ref.get()
    const updatedInvoice = docToApi(updatedSnap)
    const invoice = await hydrateInvoiceForResponseFirebase(updatedInvoice)
    const warnings = await getLowStockWarningsFirebase(req.user.id)

    return res.json({
      success: true,
      data: { invoice },
      warnings: warnings.length ? { lowStock: warnings } : undefined,
    })
  }

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

  const normalizedPaymentMode =
    req.body?.paymentMode != null
      ? allowedPaymentModes.has(String(req.body.paymentMode || '').toLowerCase())
        ? String(req.body.paymentMode).toLowerCase()
        : 'cash'
      : undefined

  const updatedInvoice = await Invoice.findOneAndUpdate(
    { _id: id, user: req.user.id },
    { ...req.body, ...(normalizedPaymentMode ? { paymentMode: normalizedPaymentMode } : {}), ...computed },
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

  if (isFirebase()) {
    const ref = collection('invoices').doc(String(id))
    const snap = await ref.get()
    if (!snap.exists) return next(new ErrorResponse('Invoice not found', 404))
    const existing = docToApi(snap)
    if (String(existing.user) !== String(req.user.id)) {
      return next(new ErrorResponse('Invoice not found', 404))
    }
    await ref.delete()
    return res.json({ success: true, message: 'Invoice deleted' })
  }

  const invoice = await Invoice.findOneAndDelete({ _id: id, user: req.user.id })
  if (!invoice) return next(new ErrorResponse('Invoice not found', 404))
  res.json({ success: true, message: 'Invoice deleted' })
})
