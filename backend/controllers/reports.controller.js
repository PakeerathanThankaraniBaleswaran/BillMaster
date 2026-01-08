import mongoose from 'mongoose'
import Invoice from '../models/Invoice.model.js'
import CashEntry from '../models/CashEntry.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { isFirebase } from '../services/datastore.js'
import { collection, docToApi } from '../services/firestore.js'

const TZ = 'Asia/Colombo'

const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const monthFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
})

const toDayStringTZ = (d) => dayFmt.format(d)
const toMonthStringTZ = (d) => monthFmt.format(d)

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

const dayRangeTZ = (from, to) => {
  const days = []
  let cur = startOfDay(from)
  const end = startOfDay(to)
  while (cur <= end) {
    days.push(toDayStringTZ(cur))
    cur = new Date(cur)
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export const getReports = asyncHandler(async (req, res) => {
  if (isFirebase()) {
    const userId = String(req.user.id)

    const now = new Date()
    const defaultFrom = monthStart(now)
    const defaultTo = endOfDay(now)

    const from = startOfDay(parseDate(req.query.from, defaultFrom))
    const to = endOfDay(parseDate(req.query.to, defaultTo))

    const months = Math.min(24, Math.max(1, Number(req.query.months || 12) || 12))
    const { start: monthAggStart, months: monthLabels } = monthRange(to, months)

    const [cashSnap, invoiceSnap, invoiceMonthSnap, cashMonthSnap] = await Promise.all([
      collection('cashEntries')
        .where('user', '==', userId)
        .where('createdAt', '>=', from)
        .where('createdAt', '<=', to)
        .orderBy('createdAt', 'asc')
        .get(),
      collection('invoices')
        .where('user', '==', userId)
        .where('invoiceDate', '>=', from)
        .where('invoiceDate', '<=', to)
        .orderBy('invoiceDate', 'asc')
        .get(),
      collection('invoices')
        .where('user', '==', userId)
        .where('invoiceDate', '>=', monthAggStart)
        .where('invoiceDate', '<=', to)
        .orderBy('invoiceDate', 'asc')
        .get(),
      collection('cashEntries')
        .where('user', '==', userId)
        .where('createdAt', '>=', monthAggStart)
        .where('createdAt', '<=', to)
        .orderBy('createdAt', 'asc')
        .get(),
    ])

    const cashEntries = cashSnap.docs.map(docToApi)
    const invoices = invoiceSnap.docs.map(docToApi)

    const days = dayRangeTZ(from, to)

    const cashDayMap = new Map()
    for (const e of cashEntries) {
      const date = e?.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt)
      const day = toDayStringTZ(date)
      const type = e?.type === 'out' ? 'out' : 'in'
      const existing = cashDayMap.get(day) || { cashIn: 0, cashOut: 0 }
      if (type === 'out') existing.cashOut += Number(e.totalAmount || 0)
      else existing.cashIn += Number(e.totalAmount || 0)
      cashDayMap.set(day, existing)
    }

    const invoiceDayMap = new Map()
    const topBillMap = new Map()
    const topProductAgg = new Map() // day -> Map(name -> {qty, amount})

    const paymentModeAgg = new Map()

    for (const inv of invoices) {
      const dt = inv?.invoiceDate?.toDate ? inv.invoiceDate.toDate() : new Date(inv.invoiceDate)
      const day = toDayStringTZ(dt)

      const existing = invoiceDayMap.get(day) || { salesTotal: 0, billCount: 0 }
      existing.salesTotal += Number(inv.total || 0)
      existing.billCount += 1
      invoiceDayMap.set(day, existing)

      const existingTop = topBillMap.get(day)
      if (!existingTop || Number(inv.total || 0) > Number(existingTop.total || 0)) {
        topBillMap.set(day, { invoiceNumber: inv.invoiceNumber || '', total: Number(inv.total || 0) })
      }

      const mode = String(inv.paymentMode || 'cash')
      const pm = paymentModeAgg.get(mode) || { amount: 0, count: 0 }
      pm.amount += Number(inv.total || 0)
      pm.count += 1
      paymentModeAgg.set(mode, pm)

      const items = Array.isArray(inv.items) ? inv.items : []
      if (!topProductAgg.has(day)) topProductAgg.set(day, new Map())
      const byName = topProductAgg.get(day)
      for (const it of items) {
        const name = String(it?.description || '').trim()
        if (!name) continue
        const row = byName.get(name) || { qty: 0, amount: 0 }
        row.qty += Number(it.quantity || 0)
        row.amount += Number(it.total || 0)
        byName.set(name, row)
      }
    }

    const topProductMap = new Map()
    for (const [day, byName] of topProductAgg.entries()) {
      let best = null
      for (const [name, row] of byName.entries()) {
        if (!best || row.qty > best.qty) best = { name, qty: row.qty, amount: row.amount }
      }
      if (best) topProductMap.set(day, best)
    }

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
        topBill: topBill ? { invoiceNumber: topBill.invoiceNumber || '', total: Number(topBill.total || 0) } : null,
        topProduct: topProd ? { name: topProd.name || '', qty: Number(topProd.qty || 0), amount: Number(topProd.amount || 0) } : null,
      }
    })

    const cashMonthlyEntries = cashMonthSnap.docs.map(docToApi)
    const invoiceMonthlyEntries = invoiceMonthSnap.docs.map(docToApi)

    const cashMonthMap = new Map()
    for (const e of cashMonthlyEntries) {
      const date = e?.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt)
      const month = toMonthStringTZ(date)
      const type = e?.type === 'out' ? 'out' : 'in'
      const existing = cashMonthMap.get(month) || { cashIn: 0, cashOut: 0 }
      if (type === 'out') existing.cashOut += Number(e.totalAmount || 0)
      else existing.cashIn += Number(e.totalAmount || 0)
      cashMonthMap.set(month, existing)
    }

    const invoiceMonthMap = new Map()
    for (const inv of invoiceMonthlyEntries) {
      const dt = inv?.invoiceDate?.toDate ? inv.invoiceDate.toDate() : new Date(inv.invoiceDate)
      const month = toMonthStringTZ(dt)
      const existing = invoiceMonthMap.get(month) || { salesTotal: 0, billCount: 0 }
      existing.salesTotal += Number(inv.total || 0)
      existing.billCount += 1
      invoiceMonthMap.set(month, existing)
    }

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

    const paymentModes = Array.from(paymentModeAgg.entries())
      .map(([mode, row]) => ({ mode, amount: Number(row.amount || 0), count: Number(row.count || 0) }))
      .sort((a, b) => b.amount - a.amount)

    return res.status(200).json({
      success: true,
      data: {
        range: { from, to },
        daily,
        monthly,
        paymentModes,
      },
    })
  }

  const userId = new mongoose.Types.ObjectId(req.user.id)

  const now = new Date()
  const defaultFrom = monthStart(now)
  const defaultTo = endOfDay(now)

  const from = startOfDay(parseDate(req.query.from, defaultFrom))
  const to = endOfDay(parseDate(req.query.to, defaultTo))

  const months = Math.min(24, Math.max(1, Number(req.query.months || 12) || 12))
  const { start: monthAggStart, months: monthLabels } = monthRange(to, months)

  const [
    cashDailyAgg,
    invoiceDailyAgg,
    topBillDailyAgg,
    topProductDailyAgg,
    cashMonthlyAgg,
    invoiceMonthlyAgg,
    paymentModeAgg,
  ] = await Promise.all([
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
      Invoice.aggregate([
        { $match: { user: userId, invoiceDate: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { $ifNull: ['$paymentMode', 'cash'] },
            amount: { $sum: '$total' },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
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

  const paymentModes = Array.isArray(paymentModeAgg)
    ? paymentModeAgg.map((r) => ({
        mode: String(r?._id || 'cash'),
        amount: Number(r?.amount || 0),
        count: Number(r?.count || 0),
      }))
    : []

  res.status(200).json({
    success: true,
    data: {
      range: { from, to },
      daily,
      monthly,
      paymentModes,
    },
  })
})
