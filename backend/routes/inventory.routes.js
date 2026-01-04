import express from 'express'
import { createInventoryItem, getInventory } from '../controllers/inventory.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/', protect, createInventoryItem)
router.get('/', protect, getInventory)

export default router
