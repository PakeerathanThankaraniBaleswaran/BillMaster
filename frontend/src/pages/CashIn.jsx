import { useEffect, useMemo, useState } from 'react'
import { Calendar, RotateCcw, Save, Wallet } from 'lucide-react'
import { cashInAPI } from '../services/api'

const denominations = [
  { label: '5000', value: 5000 },
  { label: '2000', value: 2000 },
  { label: '1000', value: 1000 },
  { label: '500', value: 500 },
  { label: '100', value: 100 },
  { label: '50', value: 50 },
  { label: '20', value: 20 },
  { label: '10', value: 10 },
]

const formatCurrency = (amount, opts = {}) =>
  amount.toLocaleString('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  })

const todayString = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date())

export default function CashIn() {
  const [counts, setCounts] = useState(
    () => denominations.reduce((acc, d) => ({ ...acc, [d.value]: 0 }), {})
  )
  const [notes, setNotes] = useState('')
  const [summary, setSummary] = useState({
    totalCashToday: 0,
    entryCount: 0,
    lastEntryAmount: 0,
    lastEntryTime: null,
  })

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await cashInAPI.getSummary()
        const payload = res.data || res
        const data = payload.data || payload
        setSummary({
          totalCashToday: data.totalCashToday || 0,
          entryCount: data.entryCount || 0,
          lastEntryAmount: data.lastEntry?.totalAmount || 0,
          lastEntryTime: data.lastEntry?.createdAt || null,
        })
      } catch (error) {
        console.error('Failed to load cash summary', error)
      }
    }

    fetchSummary()
  }, [])

  const totals = useMemo(() => {
    const perRow = denominations.map((d) => ({
      ...d,
      count: counts[d.value] || 0,
      subtotal: (counts[d.value] || 0) * d.value,
    }))
    const grandTotal = perRow.reduce((sum, row) => sum + row.subtotal, 0)
    return { perRow, grandTotal }
  }, [counts])

  const handleCountChange = (value, raw) => {
    const parsed = Number(raw)
    setCounts((prev) => ({ ...prev, [value]: Number.isFinite(parsed) ? Math.max(parsed, 0) : 0 }))
  }

  const handleAdjustCount = (value, delta) => {
    setCounts((prev) => {
      const current = prev[value] || 0
      const next = Math.max(current + delta, 0)
      return { ...prev, [value]: next }
    })
  }

  const handleClear = () => {
    setCounts(denominations.reduce((acc, d) => ({ ...acc, [d.value]: 0 }), {}))
    setNotes('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const payload = { denominations: counts, notes }
      const res = await cashInAPI.createEntry(payload)
      const body = res.data || res
      if (body.success) {
        alert('Cash entry saved')
      }
      setCounts(denominations.reduce((acc, d) => ({ ...acc, [d.value]: 0 }), {}))
      setNotes('')
      const summaryRes = await cashInAPI.getSummary()
      const payload2 = summaryRes.data || summaryRes
      const data2 = payload2.data || payload2
      setSummary({
        totalCashToday: data2.totalCashToday || 0,
        entryCount: data2.entryCount || 0,
        lastEntryAmount: data2.lastEntry?.totalAmount || 0,
        lastEntryTime: data2.lastEntry?.createdAt || null,
      })
    } catch (error) {
      console.error('Cash entry save failed', error)
      alert(error.response?.data?.message || 'Failed to save cash entry')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pb-10">
        <header className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-700 shadow-sm border border-primary-100">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="page-title">Cash In</h1>
              <p className="page-subtitle">Daily cash collection entry</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4 text-primary-700" />
            <span>{todayString}</span>
          </div>
        </header>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-600 via-primary-600 to-primary-700 text-white p-5 shadow-lg shadow-primary-200/60 transition-transform hover:-translate-y-0.5">
              <p className="text-sm text-primary-50">Total cash today</p>
              <p className="text-3xl font-semibold mt-2">{formatCurrency(summary.totalCashToday)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-sm p-5 shadow-md hover:shadow-lg transition-shadow">
              <p className="text-sm text-slate-500">Total entries</p>
              <p className="text-3xl font-semibold text-slate-800 mt-2">{summary.entryCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-sm p-5 shadow-md hover:shadow-lg transition-shadow">
              <p className="text-sm text-slate-500">Last entry</p>
              <p className="text-lg font-semibold mt-2 text-slate-800">
                {summary.lastEntryAmount > 0 ? formatCurrency(summary.lastEntryAmount) : 'No entries yet'}
              </p>
              {summary.lastEntryTime && (
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(summary.lastEntryTime).toLocaleString()}
                </p>
              )}
            </div>
          </div>

        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-slate-100 overflow-hidden max-w-4xl mx-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
            <div>
              <p className="text-lg font-semibold text-slate-800">New Entry</p>
              <p className="text-sm text-slate-500">Enter cash denominations</p>
            </div>
            <div className="text-sm px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100 shadow-sm">
              {formatCurrency(totals.grandTotal)}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {totals.perRow.map((row) => (
                  <div
                    key={row.value}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm hover:border-primary-200 hover:bg-white transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-[96px]">
                      <p className="text-base font-semibold text-slate-800">{row.label}</p>
                      <span className="text-slate-500">×</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAdjustCount(row.value, -1)}
                        className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        className="w-16 md:w-20 px-2.5 py-1.5 text-right text-slate-800 bg-white border border-slate-200 rounded-lg focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
                        value={row.count}
                        onChange={(e) => handleCountChange(row.value, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleAdjustCount(row.value, 1)}
                        className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      >
                        +
                      </button>
                    </div>
                    <div className="ml-auto text-right text-slate-900 font-semibold min-w-[96px]">
                      {row.subtotal === 0 ? '—' : formatCurrency(row.subtotal, { minimumFractionDigits: 0 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Remarks (Optional)</label>
              <textarea
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                rows="3"
                placeholder="Add notes about this collection..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <button
                type="button"
                onClick={handleClear}
                className="btn-secondary w-full md:w-auto"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                type="submit"
                className="btn-primary w-full md:w-auto px-6 py-3"
              >
                <Save className="h-4 w-4" />
                Save entry
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-3xl shadow-md border border-slate-100 p-6">
          <p className="text-lg font-semibold text-slate-800 mb-2">{"Today's Entries"}</p>
          <p className="text-sm text-slate-500">No entries recorded today.</p>
        </div>
    </div>
  )
}
