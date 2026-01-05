import express from 'express'
import {
	createInventoryItem,
	deleteInventoryItem,
	getInventory,
	updateInventoryItem,
} from '../controllers/inventory.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/', protect, createInventoryItem)
router.get('/', protect, getInventory)
router.put('/:id', protect, updateInventoryItem)
router.delete('/:id', protect, deleteInventoryItem)

export default router
