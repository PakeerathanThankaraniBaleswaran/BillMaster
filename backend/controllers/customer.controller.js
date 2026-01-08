import Customer from '../models/Customer.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'

export const createCustomer = asyncHandler(async (req, res, next) => {
  const { name, email = '', phone = '', address = '', city = '', zip = '' } = req.body || {}
  if (!name) return next(new ErrorResponse('Customer name is required', 400))

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
  const customers = await Customer.find({ user: req.user.id }).sort({ createdAt: -1 })
  res.json({ success: true, data: { customers } })
})

export const updateCustomer = asyncHandler(async (req, res, next) => {
  const { id } = req.params
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
  const customer = await Customer.findOneAndDelete({ _id: id, user: req.user.id })
  if (!customer) return next(new ErrorResponse('Customer not found', 404))
  res.json({ success: true, message: 'Customer deleted' })
})
