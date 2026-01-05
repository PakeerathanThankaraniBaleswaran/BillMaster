import mongoose from 'mongoose'

const customerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    zip: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

customerSchema.index({ user: 1, email: 1 }, { unique: false })

const Customer = mongoose.model('Customer', customerSchema)

export default Customer
