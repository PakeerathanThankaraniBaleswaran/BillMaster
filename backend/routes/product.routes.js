import { Router } from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { createProduct, listProducts, updateProduct, deleteProduct } from '../controllers/product.controller.js'

const router = Router()

router.use(protect)

router.route('/').post(createProduct).get(listProducts)
router.route('/:id').put(updateProduct).delete(deleteProduct)

export default router
