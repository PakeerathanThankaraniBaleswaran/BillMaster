import Company from '../models/Company.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ErrorResponse } from '../utils/errorResponse.js'

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