import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { createCustomer, listCustomers, updateCustomer, deleteCustomer } from '../controllers/customer.controller.js'

const router = Router()

router.use(protect)

router.route('/').post(createCustomer).get(listCustomers)
router.route('/:id').put(updateCustomer).delete(deleteCustomer)

export default router
