import mongoose from 'mongoose'

const inventoryItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    product: {
      type: String,
      required: true,
      trim: true,
    },
    variant: {
      type: String,
      trim: true,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    profit: {
      type: Number,
      default: 0,
    },
    profitPct: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

inventoryItemSchema.pre('save', function (next) {
  const profit = (this.sellingPrice || 0) - (this.purchasePrice || 0)
  this.profit = profit
  this.profitPct = this.purchasePrice > 0 ? (profit / this.purchasePrice) * 100 : 0
  next()
})

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema)

export default InventoryItem
