import Company from '../models/Company.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'
import { isFirebase } from '../services/datastore.js'
import { collection, docToApi, nowTimestamp } from '../services/firestore.js'

const normalizeTaxId = (v) => String(v || '').trim()

// @desc    Setup company profile
// @route   POST /api/company/setup
// @access  Private
export const setupCompany = asyncHandler(async (req, res, next) => {
  const {
    businessName,
    address,
    country,
    state,
    city,
    email,
    phoneNo,
    administrativeRegion,
    taxIdentificationNo,
    companyLogo,
    enableManufacturing,
  } = req.body

  if (isFirebase()) {
    const userId = String(req.user.id)
    const taxId = normalizeTaxId(taxIdentificationNo)
    const taxIdLower = taxId.toLowerCase()

    const companyRef = collection('companies').doc(userId)
    const existingCompanySnap = await companyRef.get()
    if (existingCompanySnap.exists) {
      return next(new ErrorResponse('Company profile already exists for this user', 400))
    }

    if (taxIdLower) {
      const existingTaxSnap = await collection('companies')
        .where('taxIdLower', '==', taxIdLower)
        .limit(1)
        .get()
      if (!existingTaxSnap.empty) {
        return next(new ErrorResponse('Tax identification number is already in use', 400))
      }
    }

    await companyRef.set({
      user: userId,
      businessName,
      address,
      country,
      state,
      city,
      email,
      phoneNo,
      administrativeRegion,
      taxIdentificationNo: taxId,
      taxIdLower,
      companyLogo,
      enableManufacturing,
      isSetupComplete: true,
      createdAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    })

    const created = await companyRef.get()
    const company = docToApi(created)

    return res.status(201).json({
      success: true,
      message: 'Company setup completed successfully',
      data: { company },
    })
  }

  // Check if user already has a company
  const existingCompany = await Company.findOne({ user: req.user.id })
  if (existingCompany) {
    return next(new ErrorResponse('Company profile already exists for this user', 400))
  }

  // Check if tax ID is already in use
  const existingTaxId = await Company.findOne({ taxIdentificationNo })
  if (existingTaxId) {
    return next(new ErrorResponse('Tax identification number is already in use', 400))
  }

  // Create company
  const company = await Company.create({
    user: req.user.id,
    businessName,
    address,
    country,
    state,
    city,
    email,
    phoneNo,
    administrativeRegion,
    taxIdentificationNo,
    companyLogo,
    enableManufacturing,
    isSetupComplete: true,
  })

  res.status(201).json({
    success: true,
    message: 'Company setup completed successfully',
    data: {
      company,
    },
  })
})

// @desc    Get company profile
// @route   GET /api/company/profile
// @access  Private
export const getCompanyProfile = asyncHandler(async (req, res, next) => {
  if (isFirebase()) {
    const snap = await collection('companies').doc(String(req.user.id)).get()
    if (!snap.exists) {
      return next(new ErrorResponse('Company profile not found', 404))
    }
    const company = docToApi(snap)
    return res.status(200).json({
      success: true,
      data: { company },
    })
  }

  const company = await Company.findOne({ user: req.user.id })

  if (!company) {
    return next(new ErrorResponse('Company profile not found', 404))
  }

  res.status(200).json({
    success: true,
    data: {
      company,
    },
  })
})

// @desc    Update company profile
// @route   PUT /api/company/profile
// @access  Private
export const updateCompanyProfile = asyncHandler(async (req, res, next) => {
  const {
    businessName,
    address,
    country,
    state,
    city,
    email,
    phoneNo,
    administrativeRegion,
    taxIdentificationNo,
    companyLogo,
    enableManufacturing,
  } = req.body

  if (isFirebase()) {
    const userId = String(req.user.id)
    const companyRef = collection('companies').doc(userId)
    const snap = await companyRef.get()
    if (!snap.exists) {
      return next(new ErrorResponse('Company profile not found', 404))
    }

    const existing = docToApi(snap)
    const nextTaxId = normalizeTaxId(taxIdentificationNo)
    const nextTaxLower = nextTaxId.toLowerCase()

    if (nextTaxLower && nextTaxLower !== String(existing.taxIdLower || '')) {
      const taxSnap = await collection('companies')
        .where('taxIdLower', '==', nextTaxLower)
        .limit(2)
        .get()
      const conflict = taxSnap.docs.find((d) => d.id !== userId)
      if (conflict) {
        return next(new ErrorResponse('Tax identification number is already in use', 400))
      }
    }

    await companyRef.update({
      businessName,
      address,
      country,
      state,
      city,
      email,
      phoneNo,
      administrativeRegion,
      taxIdentificationNo: nextTaxId,
      taxIdLower: nextTaxLower,
      companyLogo,
      enableManufacturing,
      updatedAt: nowTimestamp(),
    })

    const updated = await companyRef.get()
    const company = docToApi(updated)

    return res.status(200).json({
      success: true,
      message: 'Company profile updated successfully',
      data: { company },
    })
  }

  const company = await Company.findOne({ user: req.user.id })

  if (!company) {
    return next(new ErrorResponse('Company profile not found', 404))
  }

  // Check if tax ID is already in use by another company
  if (taxIdentificationNo !== company.taxIdentificationNo) {
    const existingTaxId = await Company.findOne({
      taxIdentificationNo,
      _id: { $ne: company._id }
    })
    if (existingTaxId) {
      return next(new ErrorResponse('Tax identification number is already in use', 400))
    }
  }

  // Update company
  const updatedCompany = await Company.findByIdAndUpdate(
    company._id,
    {
      businessName,
      address,
      country,
      state,
      city,
      email,
      phoneNo,
      administrativeRegion,
      taxIdentificationNo,
      companyLogo,
      enableManufacturing,
    },
    { new: true, runValidators: true }
  )

  res.status(200).json({
    success: true,
    message: 'Company profile updated successfully',
    data: {
      company: updatedCompany,
    },
  })
})