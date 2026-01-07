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
    <div className="space-y-6 max-w-5xl mx-auto rounded-2xl bg-primary-50 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-primary-700 shadow-sm border border-slate-200">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Cash In</h1>
            <p className="text-sm text-slate-500">Daily cash collection entry</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-primary-700 bg-primary-50 border border-primary-100 rounded-full px-3 py-1.5 shadow-sm w-fit">
          <Calendar className="h-4 w-4 text-primary-600" />
          <span>{todayString}</span>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total cash today</p>
          <p className="text-3xl font-semibold text-slate-900 mt-2">{formatCurrency(summary.totalCashToday)}</p>
          <div className="mt-3 h-1.5 w-20 rounded-full bg-primary-100" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total entries</p>
          <p className="text-3xl font-semibold text-slate-900 mt-2">{summary.entryCount}</p>
          <div className="mt-3 h-1.5 w-14 rounded-full bg-slate-100" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Last entry</p>
          <p className="text-lg font-semibold mt-2 text-slate-900">
                {summary.lastEntryAmount > 0 ? formatCurrency(summary.lastEntryAmount) : 'No entries yet'}
              </p>
              {summary.lastEntryTime && (
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(summary.lastEntryTime).toLocaleString()}
                </p>
              )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl mx-auto">
        <div className="flex items-start sm:items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
          <div>
            <p className="text-lg font-semibold text-slate-900">New Entry</p>
            <p className="text-sm text-slate-500">Enter cash denominations</p>
          </div>
          <div className="text-sm px-3 py-2 rounded-xl bg-primary-50 text-primary-700 font-semibold border border-primary-100">
            {formatCurrency(totals.grandTotal)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {totals.perRow.map((row) => {
              const hasValue = row.subtotal > 0
              return (
                <div
                  key={row.value}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 min-w-[76px] px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                        <p className="text-base font-semibold text-slate-900">{row.label}</p>
                      </div>
                      <span className="text-slate-400">×</span>
                    </div>
                    <div
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        hasValue
                          ? 'bg-primary-50 text-primary-700 border-primary-100'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      {hasValue
                        ? formatCurrency(row.subtotal, { minimumFractionDigits: 0 })
                        : 'Subtotal —'}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleAdjustCount(row.value, -1)}
                          className="h-9 w-9 text-slate-600 hover:bg-primary-50"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        className="h-9 w-16 md:w-20 px-2 text-right text-slate-900 bg-transparent outline-none"
                        value={row.count}
                        onChange={(e) => handleCountChange(row.value, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleAdjustCount(row.value, 1)}
                          className="h-9 w-9 text-slate-600 hover:bg-primary-50"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-xs text-slate-500">Count</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Remarks (Optional)</label>
            <textarea
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm shadow-sm focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
              rows="3"
              placeholder="Add notes about this collection..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <button type="button" onClick={handleClear} className="btn-secondary w-full md:w-auto">
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button type="submit" className="btn-primary w-full md:w-auto px-6 py-3">
              <Save className="h-4 w-4" />
              Save entry
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-4xl mx-auto">
        <p className="text-lg font-semibold text-slate-900 mb-2">{"Today's Entries"}</p>
        <p className="text-sm text-slate-500">No entries recorded today.</p>
      </div>
    </div>
  )
}
