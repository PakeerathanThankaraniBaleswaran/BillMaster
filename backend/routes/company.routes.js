import express from 'express'
import {
  setupCompany,
  getCompanyProfile,
  updateCompanyProfile,
} from '../controllers/company.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/setup', protect, setupCompany)
router.get('/profile', protect, getCompanyProfile)
router.put('/profile', protect, updateCompanyProfile)

export default router