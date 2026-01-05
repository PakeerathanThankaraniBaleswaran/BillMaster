import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

productSchema.index({ user: 1, sku: 1 }, { unique: false })

const Product = mongoose.model('Product', productSchema)

export default Product
