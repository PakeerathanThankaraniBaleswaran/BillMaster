import { useEffect, useMemo, useState } from 'react'
import { summaryAPI } from '../services/api'
import DataTable from '../components/ui/DataTable'

const toCsv = (rows, columns) => {
  const escapeCell = (v) => {
    const s = v == null ? '' : String(v)
    const needsQuotes = /[",\n]/.test(s)
    const escaped = s.replaceAll('"', '""')
    return needsQuotes ? `"${escaped}"` : escaped
  }

  const header = columns.map((c) => escapeCell(c.header)).join(',')
  const body = rows
    .map((r) => columns.map((c) => escapeCell(typeof c.value === 'function' ? c.value(r) : r?.[c.key])).join(','))
    .join('\n')
  return `${header}\n${body}`
}

const downloadText = (filename, text) => {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function StatCard({ label, value }) {
  return (
    <div className="card">
      <p className="text-sm font-semibold text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)

  const invoiceColumns = useMemo(
    () => [
      { key: 'invoiceNumber', header: 'Invoice #', sortable: true },
      {
        key: 'customerName',
        header: 'Customer',
        sortable: true,
        render: (r) => r?.customer?.name || r?.customerName || '—',
        sortValue: (r) => r?.customer?.name || r?.customerName || '',
      },
      { key: 'status', header: 'Status', sortable: true },
      {
        key: 'total',
        header: 'Total',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.total ?? 0),
        render: (r) => {
          const n = Number(r?.total)
          return Number.isFinite(n) ? n.toFixed(2) : '—'
        },
      },
      {
        key: 'createdAt',
        header: 'Date',
        sortable: true,
        sortValue: (r) => (r?.createdAt ? new Date(r.createdAt).getTime() : 0),
        render: (r) => (r?.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'),
      },
    ],
    []
  )

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await summaryAPI.get()
      setSummary(res?.data || null)
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const counts = summary?.counts || {}
  const invoiceAgg = summary?.invoices || {}
  const recent = summary?.recentInvoices || []

  const handleExportRecent = () => {
    const exportCols = [
      { key: 'invoiceNumber', header: 'Invoice #', value: (r) => r?.invoiceNumber || '' },
      { key: 'customer', header: 'Customer', value: (r) => r?.customer?.name || r?.customerName || '' },
      { key: 'status', header: 'Status', value: (r) => r?.status || '' },
      { key: 'total', header: 'Total', value: (r) => r?.total ?? '' },
      { key: 'createdAt', header: 'Date', value: (r) => (r?.createdAt ? new Date(r.createdAt).toISOString() : '') },
    ]
    const csv = toCsv(recent, exportCols)
    downloadText(`recent-invoices-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Key business metrics and recent activity.</p>
        </div>
        <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card text-gray-600">Loading...</div>
      ) : !summary ? (
        <div className="card text-gray-600">No data.</div>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Customers" value={counts.customers ?? 0} />
            <StatCard label="Products" value={counts.products ?? 0} />
            <StatCard label="Invoices" value={counts.invoices ?? 0} />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Draft" value={invoiceAgg.draft ?? 0} />
            <StatCard label="Sent" value={invoiceAgg.sent ?? 0} />
            <StatCard label="Overdue" value={invoiceAgg.overdue ?? 0} />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Recent invoices</h2>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleExportRecent}
                disabled={recent.length === 0}
              >
                Export CSV
              </button>
            </div>
            {recent.length === 0 ? (
              <div className="card text-gray-600">No recent invoices.</div>
            ) : (
              <DataTable columns={invoiceColumns} rows={recent} rowKey={(r) => r._id} />
            )}
          </section>
        </>
      )}
    </div>
  )
}
