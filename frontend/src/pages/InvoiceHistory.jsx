import { useEffect, useMemo, useState } from 'react'
import { companyAPI, invoiceAPI } from '../services/api'
import DataTable from '../components/ui/DataTable'
import { openReceiptPrintWindow } from '@/utils/receiptPrint'
import { useAuth } from '../hooks/useAuth'

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

const statusBadgeClass = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'paid') return 'bg-primary-100 text-primary-900'
  if (s === 'sent') return 'bg-primary-50 text-primary-800'
  if (s === 'overdue') return 'bg-primary-200 text-primary-900'
  return 'bg-gray-100 text-gray-800'
}

export default function InvoiceHistory() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [company, setCompany] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const [invRes, companyRes] = await Promise.all([
        invoiceAPI.list(),
        companyAPI.getCompanyProfile().catch(() => null),
      ])

      const invPayload = invRes?.data || invRes
      setInvoices(invPayload?.data?.invoices || invPayload?.invoices || [])

      if (companyRes) {
        const compPayload = companyRes?.data || companyRes
        setCompany(compPayload?.data?.company || compPayload?.company || null)
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return invoices

    return invoices.filter((inv) => {
      const customerName = inv?.customer?.name || ''
      const customerPhone = inv?.customer?.phone || ''
      const hay = [
        inv?.invoiceNumber,
        inv?.status,
        inv?.paymentMode,
        customerName,
        customerPhone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return hay.includes(q)
    })
  }, [invoices, query])

  const columns = useMemo(
    () => [
      {
        key: 'createdAt',
        header: 'Date',
        sortable: true,
        sortValue: (r) => new Date(r?.invoiceDate || r?.createdAt || 0).getTime(),
        render: (r) => formatDateTime(r?.invoiceDate || r?.createdAt),
      },
      { key: 'invoiceNumber', header: 'Bill No', sortable: true },
      {
        key: 'customer',
        header: 'Customer',
        sortable: true,
        sortValue: (r) => String(r?.customer?.name || ''),
        render: (r) => r?.customer?.name || 'Walk-in',
      },
      {
        key: 'paymentMode',
        header: 'Payment',
        sortable: true,
        render: (r) => String(r?.paymentMode || 'cash').toUpperCase(),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (r) => (
          <span
            className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${statusBadgeClass(
              r?.status
            )}`}
          >
            {String(r?.status || 'draft').toUpperCase()}
          </span>
        ),
      },
      {
        key: 'total',
        header: 'Total',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.total || 0),
        render: (r) => formatCurrency(r?.total),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <div className="inline-flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                openReceiptPrintWindow({
                  invoice: row,
                  company,
                  customer: row?.customer || null,
                  cashierName: user?.name || user?.email || '',
                  paymentMode: row?.paymentMode || 'cash',
                })
              }}
            >
              Print
            </button>
          </div>
        ),
      },
    ],
    [company, user]
  )

  return (
    <div className="space-y-6 rounded-2xl bg-primary-50 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice History</h1>
          <p className="text-gray-600 mt-1">View and print previous bills.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field"
            placeholder="Search bill no, customer, status..."
          />
          <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="card text-gray-600">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-gray-600">No invoices yet.</div>
      ) : (
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r._id} />
      )}
    </div>
  )
}
