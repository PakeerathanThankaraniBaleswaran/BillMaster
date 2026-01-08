import Customer from '../models/Customer.model.js'
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

export const createCustomer = asyncHandler(async (req, res, next) => {
  const { name, email = '', phone = '', address = '', city = '', zip = '' } = req.body || {}
  if (!name) return next(new ErrorResponse('Customer name is required', 400))

  if (isFirebase()) {
    const ref = await collection('customers').add({
      user: String(req.user.id),
      name: String(name).trim(),
      email: String(email || '').trim(),
      phone: String(phone || '').trim(),
      address: String(address || '').trim(),
      city: String(city || '').trim(),
      zip: String(zip || '').trim(),
      createdAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    })
    const snap = await ref.get()
    const customer = docToApi(snap)

    return res.status(201).json({ success: true, data: { customer } })
  }

  const customer = await Customer.create({
    user: req.user.id,
    name,
    email,
    phone,
    address,
    city,
    zip,
  })

  res.status(201).json({ success: true, data: { customer } })
})

export const listCustomers = asyncHandler(async (req, res) => {
  if (isFirebase()) {
    const snap = await collection('customers')
      .where('user', '==', String(req.user.id))
      .orderBy('createdAt', 'desc')
      .get()
    const customers = snap.docs.map(docToApi)
    return res.json({ success: true, data: { customers } })
  }

  const customers = await Customer.find({ user: req.user.id }).sort({ createdAt: -1 })
  res.json({ success: true, data: { customers } })
})

export const updateCustomer = asyncHandler(async (req, res, next) => {
  const { id } = req.params

  if (isFirebase()) {
    const updates = { ...(req.body || {}) }
    if (Object.prototype.hasOwnProperty.call(updates, 'name') && !updates.name) {
      return next(new ErrorResponse('Customer name is required', 400))
    }

    const customer = await updateByIdOwned('customers', id, req.user.id, updates)
    if (!customer) return next(new ErrorResponse('Customer not found', 404))
    return res.json({ success: true, data: { customer } })
  }

  const customer = await Customer.findOneAndUpdate(
    { _id: id, user: req.user.id },
    req.body,
    { new: true }
  )
  if (!customer) return next(new ErrorResponse('Customer not found', 404))
  res.json({ success: true, data: { customer } })
})

export const deleteCustomer = asyncHandler(async (req, res, next) => {
  const { id } = req.params

  if (isFirebase()) {
    const deleted = await deleteByIdOwned('customers', id, req.user.id)
    if (!deleted) return next(new ErrorResponse('Customer not found', 404))
    return res.json({ success: true, message: 'Customer deleted' })
  }

  const customer = await Customer.findOneAndDelete({ _id: id, user: req.user.id })
  if (!customer) return next(new ErrorResponse('Customer not found', 404))
  res.json({ success: true, message: 'Customer deleted' })
})
