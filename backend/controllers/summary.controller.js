import mongoose from 'mongoose'
import Invoice from '../models/Invoice.model.js'
import Product from '../models/Product.model.js'
import Customer from '../models/Customer.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const emptyBucket = () => ({ count: 0, total: 0 })

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id)

  const [invoiceAgg, productsCount, customersCount, recentInvoices] = await Promise.all([
    Invoice.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } },
    ]),
    Product.countDocuments({ user: req.user.id }),
    Customer.countDocuments({ user: req.user.id }),
    Invoice.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('invoiceNumber status total subtotal customer createdAt')
      .populate('customer', 'name')
      .lean(),
  ])

  const buckets = {
    draft: emptyBucket(),
    sent: emptyBucket(),
    paid: emptyBucket(),
    overdue: emptyBucket(),
  }

  for (const row of invoiceAgg) {
    const key = row._id
    if (buckets[key]) {
      buckets[key].count = row.count
      buckets[key].total = row.total
    }
  }

  const totalInvoices = Object.values(buckets).reduce((sum, b) => sum + b.count, 0)
  const paidTotal = buckets.paid.total
  const outstandingTotal = buckets.sent.total + buckets.overdue.total

  return res.status(200).json({
    success: true,
    data: {
      invoices: {
        total: totalInvoices,
        draft: buckets.draft.count,
        sent: buckets.sent.count,
        paid: buckets.paid.count,
        overdue: buckets.overdue.count,
        totalsByStatus: {
          draft: buckets.draft.total,
          sent: buckets.sent.total,
          paid: buckets.paid.total,
          overdue: buckets.overdue.total,
        },
        paidTotal,
        outstandingTotal,
      },
      counts: {
        products: productsCount,
        customers: customersCount,
      },
      recentInvoices,
    },
  })
})
