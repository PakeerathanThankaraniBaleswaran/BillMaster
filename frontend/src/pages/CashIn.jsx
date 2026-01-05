import { useEffect, useMemo, useState } from 'react'
import { Calendar, RotateCcw, Save, Wallet } from 'lucide-react'
import { cashInAPI } from '../services/api'
import AppTopbar from '@/components/layout/AppTopbar'

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
    <div className="app-page">
      <AppTopbar />
      <div className="app-container py-8">
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
            <div className="rounded-xl border border-primary-100 bg-primary-700 text-white p-5 shadow-sm">
              <p className="text-sm">Total cash today</p>
              <p className="text-3xl font-semibold mt-2">{formatCurrency(summary.totalCashToday)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-600">Total entries</p>
              <p className="text-3xl font-semibold mt-2">{summary.entryCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-600">Last entry</p>
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

        <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div>
              <p className="text-lg font-semibold text-slate-800">New Entry</p>
              <p className="text-sm text-slate-500">Enter cash denominations</p>
            </div>
            <div className="text-sm px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100 shadow-sm">
              {formatCurrency(totals.grandTotal)}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-3">
              {totals.perRow.map((row) => (
                <div
                  key={row.value}
                  className="grid grid-cols-[110px,1fr,90px] items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div>
                    <p className="text-lg font-semibold text-slate-800">{row.label}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">×</span>
                    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50">
                      <input
                        type="number"
                        min="0"
                        className="w-full md:w-28 px-3 py-2 text-right text-slate-800 bg-transparent outline-none"
                        value={row.count}
                        onChange={(e) => handleCountChange(row.value, e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="text-right text-slate-900 font-semibold">
                    {row.subtotal === 0 ? '—' : formatCurrency(row.subtotal, { minimumFractionDigits: 0 })}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Remarks (Optional)</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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

        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <p className="text-lg font-semibold text-slate-800 mb-2">{"Today's Entries"}</p>
          <p className="text-sm text-slate-500">No entries recorded today.</p>
        </div>
      </div>
    </div>
  )
}
