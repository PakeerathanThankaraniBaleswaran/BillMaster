import mongoose from 'mongoose'
import Invoice from '../models/Invoice.model.js'
import Product from '../models/Product.model.js'
import Customer from '../models/Customer.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { isFirebase } from '../services/datastore.js'
import { batchGet, collection, docToApi } from '../services/firestore.js'

const emptyBucket = () => ({ count: 0, total: 0 })

const countQuery = async (query) => {
  try {
    if (typeof query.count === 'function') {
      const agg = await query.count().get()
      const data = agg.data()
      if (typeof data?.count === 'number') return data.count
    }
  } catch {
    // fallback below
  }

  const snap = await query.get()
  return snap.size
}

export const getDashboardSummary = asyncHandler(async (req, res) => {
  if (isFirebase()) {
    const userId = String(req.user.id)

    const invoicesSnap = await collection('invoices')
      .where('user', '==', userId)
      .select('status', 'total')
      .get()

    const buckets = {
      draft: emptyBucket(),
      sent: emptyBucket(),
      paid: emptyBucket(),
      overdue: emptyBucket(),
    }

    for (const doc of invoicesSnap.docs) {
      const inv = docToApi(doc)
      const key = String(inv.status || '')
      if (buckets[key]) {
        buckets[key].count += 1
        buckets[key].total += Number(inv.total || 0)
      }
    }

    const totalInvoices = Object.values(buckets).reduce((sum, b) => sum + b.count, 0)
    const paidTotal = buckets.paid.total
    const outstandingTotal = buckets.sent.total + buckets.overdue.total

    const [productsCount, customersCount] = await Promise.all([
      countQuery(collection('products').where('user', '==', userId)),
      countQuery(collection('customers').where('user', '==', userId)),
    ])

    const recentSnap = await collection('invoices')
      .where('user', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .select('invoiceNumber', 'status', 'total', 'subtotal', 'customer', 'createdAt')
      .get()

    const recentRaw = recentSnap.docs.map(docToApi)
    const customerIds = Array.from(
      new Set(recentRaw.map((i) => i.customer).filter(Boolean).map(String))
    )
    const customers = await batchGet('customers', customerIds)
    const customerMap = new Map(customers.map((c) => [String(c._id), c]))

    const recentInvoices = recentRaw.map((inv) => {
      const customer = inv.customer ? customerMap.get(String(inv.customer)) : null
      return {
        ...inv,
        customer: customer ? { _id: customer._id, name: customer.name } : null,
      }
    })

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
  }

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
