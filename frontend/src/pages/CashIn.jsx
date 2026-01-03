import { useMemo, useState } from 'react'

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
}).format(new Date('2026-01-03'))

export default function CashIn() {
  const [counts, setCounts] = useState(
    () => denominations.reduce((acc, d) => ({ ...acc, [d.value]: 0 }), {})
  )
  const [notes, setNotes] = useState('')

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

  const handleSubmit = (e) => {
    e.preventDefault()
    alert('Entry submitted. (Stub) Connect to backend when ready.')
  }

  return (
    <div className="min-h-screen bg-[#f7f9f8] text-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm">
              <span className="text-xl">💵</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Cash In Entry</h1>
              <p className="text-sm text-slate-500">Daily cash collection management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="text-emerald-600">📅</span>
            <span>{todayString}</span>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-5 shadow-sm">
            <p className="text-sm flex items-center gap-2">⬆️ Total Cash Today</p>
            <p className="text-3xl font-semibold mt-2">{formatCurrency(totals.grandTotal)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm flex items-center gap-2 text-slate-600">⏺️ Total Entries</p>
            <p className="text-3xl font-semibold mt-2">0</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm flex items-center gap-2 text-slate-600">🔄 Last Entry</p>
            <p className="text-lg font-semibold mt-2 text-slate-800">No entries yet</p>
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
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <span>↺</span>
                <span>Reset</span>
              </button>
              <button
                type="submit"
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-8 py-3 font-semibold shadow-md hover:bg-emerald-700 transition"
              >
                <span>💾</span>
                <span>Save Entry</span>
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <p className="text-lg font-semibold text-slate-800 mb-2">Today's Entries</p>
          <p className="text-sm text-slate-500">No entries recorded today.</p>
        </div>
      </div>
    </div>
  )
}
