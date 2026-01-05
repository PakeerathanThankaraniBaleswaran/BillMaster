import mongoose from 'mongoose'

const invoiceItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      default: 'number',
      enum: ['number', 'kg', 'g', 'l', 'ml'],
    },
    price: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

const invoiceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    invoiceNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue'],
      default: 'draft',
    },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null },
    items: { type: [invoiceItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    discountRate: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'LKR' },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

invoiceSchema.index({ user: 1, invoiceNumber: 1 }, { unique: true })

const Invoice = mongoose.model('Invoice', invoiceSchema)

export default Invoice
