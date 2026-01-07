import mongoose from 'mongoose'
import Invoice from '../models/Invoice.model.js'
import CashEntry from '../models/CashEntry.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const TZ = 'Asia/Colombo'

const parseDate = (value, fallback) => {
  if (!value) return fallback
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? fallback : d
}

const startOfDay = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

const endOfDay = (d) => {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1)

const addMonths = (d, n) => {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}

const toDayString = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const dayRange = (from, to) => {
  const days = []
  let cur = startOfDay(from)
  const end = startOfDay(to)
  while (cur <= end) {
    days.push(toDayString(cur))
    cur = new Date(cur)
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

const toMonthString = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

const monthRange = (endDate, months) => {
  const endMonth = monthStart(endDate)
  const startMonthDate = addMonths(endMonth, -(months - 1))
  const out = []
  let cur = monthStart(startMonthDate)
  while (cur <= endMonth) {
    out.push(toMonthString(cur))
    cur = addMonths(cur, 1)
  }
  return { start: startMonthDate, months: out }
}

export const getReports = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id)

  const now = new Date()
  const defaultFrom = monthStart(now)
  const defaultTo = endOfDay(now)

  const from = startOfDay(parseDate(req.query.from, defaultFrom))
  const to = endOfDay(parseDate(req.query.to, defaultTo))

  const months = Math.min(24, Math.max(1, Number(req.query.months || 12) || 12))
  const { start: monthAggStart, months: monthLabels } = monthRange(to, months)

  const [cashDailyAgg, invoiceDailyAgg, topBillDailyAgg, topProductDailyAgg, cashMonthlyAgg, invoiceMonthlyAgg] =
    await Promise.all([
      CashEntry.aggregate([
        { $match: { user: userId, createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: {
              day: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt',
                  timezone: TZ,
                },
              },
              type: { $ifNull: ['$type', 'in'] },
            },
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Invoice.aggregate([
        { $match: { user: userId, invoiceDate: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$invoiceDate',
                timezone: TZ,
              },
            },
            salesTotal: { $sum: '$total' },
            billCount: { $sum: 1 },
          },
        },
      ]),
      Invoice.aggregate([
        { $match: { user: userId, invoiceDate: { $gte: from, $lte: to } } },
        {
          $addFields: {
            day: {
              $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate', timezone: TZ },
            },
          },
        },
        { $sort: { day: 1, total: -1 } },
        {
          $group: {
            _id: '$day',
            invoiceNumber: { $first: '$invoiceNumber' },
            total: { $first: '$total' },
          },
        },
      ]),
      Invoice.aggregate([
        { $match: { user: userId, invoiceDate: { $gte: from, $lte: to } } },
        { $unwind: '$items' },
        {
          $addFields: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate', timezone: TZ } },
            name: '$items.description',
          },
        },
        {
          $group: {
            _id: { day: '$day', name: '$name' },
            qty: { $sum: '$items.quantity' },
            amount: { $sum: '$items.total' },
          },
        },
        { $sort: { '_id.day': 1, qty: -1 } },
        {
          $group: {
            _id: '$_id.day',
            name: { $first: '$_id.name' },
            qty: { $first: '$qty' },
            amount: { $first: '$amount' },
          },
        },
      ]),
      CashEntry.aggregate([
        { $match: { user: userId, createdAt: { $gte: monthAggStart, $lte: to } } },
        {
          $group: {
            _id: {
              month: {
                $dateToString: {
                  format: '%Y-%m',
                  date: '$createdAt',
                  timezone: TZ,
                },
              },
              type: { $ifNull: ['$type', 'in'] },
            },
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Invoice.aggregate([
        { $match: { user: userId, invoiceDate: { $gte: monthAggStart, $lte: to } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: '$invoiceDate',
                timezone: TZ,
              },
            },
            salesTotal: { $sum: '$total' },
            billCount: { $sum: 1 },
          },
        },
      ]),
    ])

  const days = dayRange(from, to)

  const cashDayMap = new Map()
  for (const row of cashDailyAgg) {
    const day = row?._id?.day
    if (!day) continue
    const type = row?._id?.type === 'out' ? 'out' : 'in'
    const existing = cashDayMap.get(day) || { cashIn: 0, cashOut: 0 }
    if (type === 'out') existing.cashOut += Number(row.total || 0)
    else existing.cashIn += Number(row.total || 0)
    cashDayMap.set(day, existing)
  }

  const invoiceDayMap = new Map(invoiceDailyAgg.map((r) => [r._id, r]))
  const topBillMap = new Map(topBillDailyAgg.map((r) => [r._id, r]))
  const topProductMap = new Map(topProductDailyAgg.map((r) => [r._id, r]))

  const daily = days.map((day) => {
    const cash = cashDayMap.get(day) || { cashIn: 0, cashOut: 0 }
    const inv = invoiceDayMap.get(day) || { salesTotal: 0, billCount: 0 }
    const topBill = topBillMap.get(day) || null
    const topProd = topProductMap.get(day) || null

    const cashIn = Number(cash.cashIn || 0)
    const cashOut = Number(cash.cashOut || 0)
    const salesTotal = Number(inv.salesTotal || 0)

    return {
      day,
      cashIn,
      cashOut,
      netCash: cashIn - cashOut,
      salesTotal,
      billCount: Number(inv.billCount || 0),
      topBill: topBill
        ? { invoiceNumber: topBill.invoiceNumber || '', total: Number(topBill.total || 0) }
        : null,
      topProduct: topProd
        ? { name: topProd.name || '', qty: Number(topProd.qty || 0), amount: Number(topProd.amount || 0) }
        : null,
    }
  })

  const cashMonthMap = new Map()
  for (const row of cashMonthlyAgg) {
    const month = row?._id?.month
    if (!month) continue
    const type = row?._id?.type === 'out' ? 'out' : 'in'
    const existing = cashMonthMap.get(month) || { cashIn: 0, cashOut: 0 }
    if (type === 'out') existing.cashOut += Number(row.total || 0)
    else existing.cashIn += Number(row.total || 0)
    cashMonthMap.set(month, existing)
  }

  const invoiceMonthMap = new Map(invoiceMonthlyAgg.map((r) => [r._id, r]))

  const monthly = monthLabels.map((m) => {
    const cash = cashMonthMap.get(m) || { cashIn: 0, cashOut: 0 }
    const inv = invoiceMonthMap.get(m) || { salesTotal: 0, billCount: 0 }

    const cashIn = Number(cash.cashIn || 0)
    const cashOut = Number(cash.cashOut || 0)
    const salesTotal = Number(inv.salesTotal || 0)

    return {
      month: m,
      cashIn,
      cashOut,
      netCash: cashIn - cashOut,
      salesTotal,
      billCount: Number(inv.billCount || 0),
    }
  })

  res.status(200).json({
    success: true,
    data: {
      range: { from, to },
      daily,
      monthly,
    },
  })
})
