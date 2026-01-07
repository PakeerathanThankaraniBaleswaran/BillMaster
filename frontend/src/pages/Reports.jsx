import { useEffect, useMemo, useState } from 'react'
import { reportsAPI } from '../services/api'
import DataTable from '../components/ui/DataTable'

const formatMoney = (value) => {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return '0.00'
  return n.toFixed(2)
}

const monthInputValue = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

const monthToRange = (yyyyMm) => {
  const [y, m] = String(yyyyMm || '').split('-').map((v) => Number(v))
  const safeY = Number.isFinite(y) ? y : new Date().getFullYear()
  const safeM = Number.isFinite(m) ? m : new Date().getMonth() + 1
  const from = new Date(safeY, safeM - 1, 1)
  const to = new Date(safeY, safeM, 0)
  to.setHours(23, 59, 59, 999)
  return { from, to }
}

function StatCard({ label, value }) {
  return (
    <div className="card">
      <p className="text-sm font-semibold text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function MiniBarChart({ title, rows, valueKey, labelKey }) {
  const values = rows.map((r) => Number(r?.[valueKey] || 0))
  const max = Math.max(1, ...values)

  return (
    <div className="card">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-3 h-28 flex items-end gap-1">
        {rows.map((r) => {
          const v = Number(r?.[valueKey] || 0)
          const h = Math.max(2, Math.round((v / max) * 100))
          const label = String(r?.[labelKey] || '')
          return (
            <div
              key={label}
              className="flex-1 min-w-[6px] h-full flex items-end"
              title={`${label}: ${formatMoney(v)}`}
            >
              <div className="w-full bg-primary-600 rounded-sm" style={{ height: `${h}%` }} />
            </div>
          )
        })}
      </div>
      <div className="mt-2 text-xs text-gray-500">Max: {formatMoney(max)}</div>
    </div>
  )
}

function MiniDoubleBarChart({ title, rows, valueKeyA, valueKeyB, labelKey, labelA, labelB }) {
  const values = rows.flatMap((r) => [Number(r?.[valueKeyA] || 0), Number(r?.[valueKeyB] || 0)])
  const max = Math.max(1, ...values)

  return (
    <div className="card">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-3 h-28 flex items-end gap-1">
        {rows.map((r) => {
          const a = Number(r?.[valueKeyA] || 0)
          const b = Number(r?.[valueKeyB] || 0)
          const ha = Math.max(2, Math.round((a / max) * 100))
          const hb = Math.max(2, Math.round((b / max) * 100))
          const label = String(r?.[labelKey] || '')
          return (
            <div
              key={label}
              className="flex-1 min-w-[10px] h-full flex items-end"
              title={`${label}: ${labelA} ${formatMoney(a)}, ${labelB} ${formatMoney(b)}`}
            >
              <div className="flex items-end gap-1 h-full w-full">
                <div className="w-1/2 h-full flex items-end">
                  <div className="w-full bg-primary-600 rounded-sm" style={{ height: `${ha}%` }} />
                </div>
                <div className="w-1/2 h-full flex items-end">
                  <div className="w-full bg-gray-300 rounded-sm" style={{ height: `${hb}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Max: {formatMoney(max)}</span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary-600" />{labelA}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-gray-300" />{labelB}</span>
        </span>
      </div>
    </div>
  )
}

const polarToCartesian = (cx, cy, r, angle) => {
  const a = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

const describeArc = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

function PieChartCard({ title, rows }) {
  const palette = [
    'text-primary-600',
    'text-primary-500',
    'text-primary-400',
    'text-gray-600',
    'text-gray-500',
  ]

  const modeOrder = ['cash', 'credit', 'card']

  const raw = Array.isArray(rows)
    ? rows
        .map((r) => ({
          label: String(r?.mode ?? r?._id ?? r?.paymentMode ?? '').trim().toLowerCase(),
          value: Number(r?.amount ?? r?.total ?? 0),
        }))
        .filter((r) => r.label && Number.isFinite(r.value) && r.value >= 0)
    : []

  const valueByMode = new Map()
  for (const r of raw) {
    valueByMode.set(r.label, (valueByMode.get(r.label) || 0) + r.value)
  }

  const normalized = [
    ...modeOrder.map((m) => ({ label: m, value: valueByMode.get(m) || 0 })),
    ...Array.from(valueByMode.entries())
      .filter(([m]) => !modeOrder.includes(m))
      .map(([label, value]) => ({ label, value })),
  ]

  const total = normalized.reduce((s, r) => s + Number(r.value || 0), 0)
  let start = 0

  return (
    <div className="card">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      {total <= 0 ? (
        <div className="mt-3 space-y-2 text-sm">
          {normalized.map((seg, idx) => {
            const cls = palette[idx % palette.length]
            return (
              <div key={seg.label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-sm ${cls.replace('text-', 'bg-')}`} />
                  <span className="truncate text-gray-700">{seg.label.toUpperCase()}</span>
                </div>
                <div className="text-gray-900 font-semibold tabular-nums">
                  {formatMoney(seg.value)} <span className="text-gray-500 font-normal">(0%)</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="h-32 w-32" aria-label={title}>
              {normalized
                .filter((seg) => Number(seg.value || 0) > 0)
                .map((seg, idx) => {
                const pct = seg.value / total
                const sweep = pct * 360
                const end = start + sweep
                const d = describeArc(60, 60, 50, start, end)
                const cls = palette[idx % palette.length]
                start = end
                return (
                  <path key={seg.label} d={d} className={cls} fill="currentColor" stroke="white" strokeWidth="1" />
                )
              })}
            </svg>
          </div>
          <div className="space-y-2 text-sm">
            {normalized.map((seg, idx) => {
              const cls = palette[idx % palette.length]
              const pct = (seg.value / total) * 100
              return (
                <div key={seg.label} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2.5 w-2.5 rounded-sm ${cls.replace('text-', 'bg-')}`} />
                    <span className="truncate text-gray-700">{seg.label.toUpperCase()}</span>
                  </div>
                  <div className="text-gray-900 font-semibold tabular-nums">
                    {formatMoney(seg.value)} <span className="text-gray-500 font-normal">({pct.toFixed(0)}%)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(monthInputValue(new Date()))
  const [report, setReport] = useState(null)

  const load = async (monthValue = selectedMonth) => {
    setLoading(true)
    setError('')
    try {
      const { from, to } = monthToRange(monthValue)
      const res = await reportsAPI.get({
        from: from.toISOString(),
        to: to.toISOString(),
        months: 12,
      })
      const payload = res?.data || res
      setReport(payload?.data || payload || null)
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(selectedMonth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  const dailyRows = report?.daily || []
  const monthlyRows = report?.monthly || []
  const paymentModes = report?.paymentModes || []

  const dailyTotals = useMemo(() => {
    const cashIn = dailyRows.reduce((s, r) => s + Number(r?.cashIn || 0), 0)
    const cashOut = dailyRows.reduce((s, r) => s + Number(r?.cashOut || 0), 0)
    const salesTotal = dailyRows.reduce((s, r) => s + Number(r?.salesTotal || 0), 0)
    const billCount = dailyRows.reduce((s, r) => s + Number(r?.billCount || 0), 0)
    return { cashIn, cashOut, netCash: cashIn - cashOut, salesTotal, billCount }
  }, [dailyRows])

  const dailyColumns = useMemo(
    () => [
      { key: 'day', header: 'Date', sortable: true },
      {
        key: 'cashIn',
        header: 'Cash In',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.cashIn || 0),
        render: (r) => formatMoney(r?.cashIn),
      },
      {
        key: 'cashOut',
        header: 'Cash Out',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.cashOut || 0),
        render: (r) => formatMoney(r?.cashOut),
      },
      {
        key: 'netCash',
        header: 'Net Cash',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.netCash || 0),
        render: (r) => formatMoney(r?.netCash),
      },
      {
        key: 'salesTotal',
        header: 'Sales',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.salesTotal || 0),
        render: (r) => formatMoney(r?.salesTotal),
      },
      {
        key: 'billCount',
        header: 'Bills',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.billCount || 0),
        render: (r) => String(r?.billCount ?? 0),
      },
      {
        key: 'topBill',
        header: 'Top Bill',
        sortable: false,
        render: (r) => (r?.topBill?.invoiceNumber ? `${r.topBill.invoiceNumber} (${formatMoney(r.topBill.total)})` : '—'),
      },
      {
        key: 'topProduct',
        header: 'Top Product',
        sortable: false,
        render: (r) => (r?.topProduct?.name ? `${r.topProduct.name} (Qty ${formatMoney(r.topProduct.qty)})` : '—'),
      },
    ],
    []
  )

  const monthlyColumns = useMemo(
    () => [
      { key: 'month', header: 'Month', sortable: true },
      {
        key: 'cashIn',
        header: 'Cash In',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.cashIn || 0),
        render: (r) => formatMoney(r?.cashIn),
      },
      {
        key: 'cashOut',
        header: 'Cash Out',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.cashOut || 0),
        render: (r) => formatMoney(r?.cashOut),
      },
      {
        key: 'netCash',
        header: 'Net Cash',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.netCash || 0),
        render: (r) => formatMoney(r?.netCash),
      },
      {
        key: 'salesTotal',
        header: 'Sales',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.salesTotal || 0),
        render: (r) => formatMoney(r?.salesTotal),
      },
      {
        key: 'billCount',
        header: 'Bills',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.billCount || 0),
        render: (r) => String(r?.billCount ?? 0),
      },
    ],
    []
  )

  return (
    <div className="space-y-6 rounded-2xl bg-primary-50 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Day-wise and monthly summaries.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Month</label>
            <input
              type="month"
              className="input-field"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
          <button type="button" onClick={() => load(selectedMonth)} className="btn-secondary" disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card text-gray-600">Loading...</div>
      ) : !report ? (
        <div className="card text-gray-600">No data.</div>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Cash In" value={formatMoney(dailyTotals.cashIn)} />
            <StatCard label="Cash Out" value={formatMoney(dailyTotals.cashOut)} />
            <StatCard label="Net Cash" value={formatMoney(dailyTotals.netCash)} />
            <StatCard label="Sales" value={formatMoney(dailyTotals.salesTotal)} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MiniBarChart
              title="Daily Sales (Selected Month)"
              rows={dailyRows}
              valueKey="salesTotal"
              labelKey="day"
            />
            <MiniBarChart
              title="Monthly Sales (Last 12 Months)"
              rows={monthlyRows}
              valueKey="salesTotal"
              labelKey="month"
            />
            <MiniDoubleBarChart
              title="Monthly Cash In/Out (Last 12 Months)"
              rows={monthlyRows}
              valueKeyA="cashIn"
              valueKeyB="cashOut"
              labelKey="month"
              labelA="IN"
              labelB="OUT"
            />
            <PieChartCard title="Payments (Selected Month)" rows={paymentModes} />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Day-wise</h2>
            {dailyRows.length === 0 ? (
              <div className="card text-gray-600">No daily data.</div>
            ) : (
              <DataTable columns={dailyColumns} rows={dailyRows} rowKey={(r) => r.day} />
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Monthly</h2>
            {monthlyRows.length === 0 ? (
              <div className="card text-gray-600">No monthly data.</div>
            ) : (
              <DataTable columns={monthlyColumns} rows={monthlyRows} rowKey={(r) => r.month} />
            )}
          </section>
        </>
      )}
    </div>
  )
}
