import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, LogOut, PlusCircle } from 'lucide-react'
import api, { summaryAPI } from '@/services/api'
import AppTopbar from '@/components/layout/AppTopbar'

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summary, setSummary] = useState({
    invoices: {
      total: 0,
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
      paidTotal: 0,
      outstandingTotal: 0,
      totalsByStatus: { draft: 0, sent: 0, paid: 0, overdue: 0 },
    },
    counts: { products: 0, customers: 0 },
    recentInvoices: [],
  })

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) {
        navigate('/signin')
        return
      }

      try {
        const profileRes = await api.get('/auth/profile')
        setUser(profileRes.data.user)

        await api.get('/company/profile')
        localStorage.setItem('setupComplete', 'true')

        const summaryRes = await summaryAPI.get()
        const payload = summaryRes.data || summaryRes
        const data = payload.data || payload
        setSummary((prev) => ({
          invoices: data.invoices || prev.invoices,
          counts: data.counts || prev.counts,
          recentInvoices: data.recentInvoices || [],
        }))
      } catch (error) {
        if (error.response?.status === 404) {
          navigate('/company-setup')
        } else {
          navigate('/signin')
        }
      } finally {
        setLoading(false)
        setSummaryLoading(false)
      }
    }

    load()
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    localStorage.removeItem('setupComplete')
    navigate('/signin')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-page">
      <AppTopbar>
        <button type="button" onClick={handleLogout} className="btn-secondary">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </AppTopbar>

      <div className="app-container py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Welcome{user ? `, ${user.name}` : ''}. Here’s your business snapshot.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/cash-in')} className="btn-primary">
              <PlusCircle className="h-4 w-4" />
              Cash In
            </button>
            <button type="button" onClick={() => navigate('/data-entry')} className="btn-secondary">
              <PlusCircle className="h-4 w-4" />
              Data Entry
            </button>
            <button type="button" onClick={() => navigate('/invoices')} className="btn-secondary">
              <FileText className="h-4 w-4" />
              Invoices
            </button>
          </div>
        </div>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <StatCard label="Paid revenue" value={formatCurrency(summary.invoices.paidTotal)} accent="bg-emerald-600" loading={summaryLoading} />
          <StatCard label="Outstanding" value={formatCurrency(summary.invoices.outstandingTotal)} accent="bg-amber-500" loading={summaryLoading} />
          <StatCard label="Total invoices" value={summary.invoices.total} accent="bg-indigo-600" loading={summaryLoading} />
        </div>

        <div className="mt-4 grid md:grid-cols-4 gap-3">
          <Pill label="Draft" value={summary.invoices.draft} color="bg-slate-100 text-slate-800" loading={summaryLoading} />
          <Pill label="Sent" value={summary.invoices.sent} color="bg-blue-100 text-blue-800" loading={summaryLoading} />
          <Pill label="Paid" value={summary.invoices.paid} color="bg-emerald-100 text-emerald-800" loading={summaryLoading} />
          <Pill label="Overdue" value={summary.invoices.overdue} color="bg-rose-100 text-rose-800" loading={summaryLoading} />
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <CountCard label="Customers" value={summary.counts.customers} color="text-emerald-700" loading={summaryLoading} />
          <CountCard label="Products" value={summary.counts.products} color="text-indigo-700" loading={summaryLoading} />
        </div>

        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-gray-700">Quick actions</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/cash-in')}
                className="btn-primary"
              >
                <PlusCircle className="h-4 w-4" />
                Cash In
              </button>
              <button
                type="button"
                onClick={() => navigate('/data-entry')}
                className="btn-secondary"
              >
                <PlusCircle className="h-4 w-4" />
                Data Entry
              </button>
                <button
                  type="button"
                  onClick={() => navigate('/invoices')}
                  className="btn-secondary"
                >
                  <FileText className="h-4 w-4" />
                  Invoices
                </button>
            </div>
          </div>
        </div>

        <div className="mt-6 p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent invoices</h2>
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="text-sm text-indigo-700 hover:text-indigo-800 font-semibold"
            >
              View all
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="min-w-full text-sm text-gray-700">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left">Invoice #</th>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {summaryLoading ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : summary.recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center text-gray-500">No invoices yet.</td>
                  </tr>
                ) : (
                  summary.recentInvoices.map((inv) => (
                    <tr key={inv._id} className="border-t border-gray-100">
                      <td className="px-4 py-2 font-semibold text-gray-900">{inv.invoiceNumber}</td>
                      <td className="px-4 py-2 text-gray-700">{inv.customer?.name || '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{formatCurrency(inv.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent, loading }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-1">{loading ? '—' : value}</p>
      </div>
      <div className={`h-10 w-10 rounded-lg ${accent} text-white flex items-center justify-center font-semibold`}>LKR</div>
    </div>
  )
}

function Pill({ label, value, color, loading }) {
  return (
    <div className="px-4 py-3 rounded-lg border border-gray-200 bg-white flex items-center justify-between text-sm">
      <span className="font-semibold text-gray-700">{label}</span>
      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
        {loading ? '—' : value}
      </span>
    </div>
  )
}

function CountCard({ label, value, color, loading }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-1">{loading ? '—' : value}</p>
      </div>
      <div className={`text-lg font-semibold ${color}`}>＋</div>
    </div>
  )
}

const statusBadge = (status) => {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-800'
    case 'sent':
      return 'bg-blue-100 text-blue-800'
    case 'overdue':
      return 'bg-rose-100 text-rose-800'
    default:
      return 'bg-slate-100 text-slate-800'
  }
}

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

