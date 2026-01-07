import mongoose from 'mongoose'

const cashEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['in', 'out'],
      default: 'in',
    },
    denominations: {
      type: Map,
      of: {
        type: Number,
        min: 0,
        default: 0,
      },
      default: {},
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

const CashEntry = mongoose.model('CashEntry', cashEntrySchema)

export default CashEntry
