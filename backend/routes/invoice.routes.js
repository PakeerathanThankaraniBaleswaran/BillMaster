import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import {
  createInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
} from '../controllers/invoice.controller.js'

const router = Router()

router.use(protect)

router.route('/').post(createInvoice).get(listInvoices)
router.route('/:id').get(getInvoice).put(updateInvoice).delete(deleteInvoice)

export default router
