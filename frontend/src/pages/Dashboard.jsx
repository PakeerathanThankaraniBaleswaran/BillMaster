import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, PlusCircle, DollarSign, AlertCircle, Package, Users, TrendingUp } from 'lucide-react'
import api, { summaryAPI } from '@/services/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [error, setError] = useState(null)
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
        setError(null)
      } catch (error) {
        if (error.response?.status === 404) {
          navigate('/company-setup')
        } else if (error.response?.status === 401) {
          navigate('/signin')
        } else {
          setError('Unable to load dashboard data. Please refresh the page.')
          console.error('Dashboard load error:', error)
        }
      } finally {
        setLoading(false)
        setSummaryLoading(false)
      }
    }

    load()
  }, [navigate])

  if (loading) {
    return (
      <div className="space-y-6 rounded-2xl bg-primary-50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-100 rounded-lg"></div>
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
          <div className="h-48 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card max-w-2xl mx-auto text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Oops! Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 rounded-2xl bg-primary-50 p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Welcome back{user ? `, ${user.name}` : ''}! 👋</h1>
          <p className="page-subtitle">Here's what's happening with your business today</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            type="button" 
            onClick={() => navigate('/cash-in')} 
            className="btn-primary hover:scale-105 transition-transform"
            title="Record cash payment"
          >
            <DollarSign className="h-4 w-4" />
            Cash In
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/data-entry')} 
            className="btn-secondary hover:scale-105 transition-transform"
            title="Add inventory stock"
          >
            <Package className="h-4 w-4" />
            Add Stock
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/invoices')} 
            className="btn-secondary hover:scale-105 transition-transform"
            title="View all invoices"
          >
            <FileText className="h-4 w-4" />
            Invoices
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(summary.invoices.paidTotal)}
          accent="bg-gradient-to-br from-primary-500 to-primary-600"
          icon={<TrendingUp className="h-5 w-5" />}
          loading={summaryLoading}
        />
        <StatCard
          label="Outstanding Amount"
          value={formatCurrency(summary.invoices.outstandingTotal)}
          accent="bg-gradient-to-br from-primary-600 to-primary-700"
          icon={<AlertCircle className="h-5 w-5" />}
          loading={summaryLoading}
        />
        <StatCard
          label="Total Invoices"
          value={summary.invoices.total}
          accent="bg-gradient-to-br from-primary-700 to-primary-800"
          icon={<FileText className="h-5 w-5" />}
          loading={summaryLoading}
        />
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Pill label="Draft" value={summary.invoices.draft} color="bg-primary-50 text-primary-800" loading={summaryLoading} />
        <Pill label="Sent" value={summary.invoices.sent} color="bg-primary-100 text-primary-900" loading={summaryLoading} />
        <Pill label="Paid" value={summary.invoices.paid} color="bg-primary-200 text-primary-900" loading={summaryLoading} />
        <Pill label="Overdue" value={summary.invoices.overdue} color="bg-primary-300 text-primary-900" loading={summaryLoading} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <CountCard 
          label="Total Customers" 
          value={summary.counts.customers} 
          color="text-primary-700" 
          bgColor="bg-primary-50"
          icon={<Users className="h-6 w-6" />}
          loading={summaryLoading} 
          onClick={() => navigate('/customers')}
        />
        <CountCard 
          label="Total Products" 
          value={summary.counts.products} 
          color="text-primary-700" 
          bgColor="bg-primary-50"
          icon={<Package className="h-6 w-6" />}
          loading={summaryLoading} 
          onClick={() => navigate('/products')}
        />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="text-sm text-primary-700 hover:text-primary-800 font-semibold hover:underline transition-all"
          >
            View all →
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Invoice #</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {summaryLoading ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8">
                    <div className="flex items-center justify-center space-x-2 text-gray-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                      <span>Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : summary.recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-12 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No invoices yet</p>
                    <p className="text-sm text-gray-400 mt-1">Create your first invoice to get started</p>
                    <button
                      onClick={() => navigate('/invoices')}
                      className="mt-4 btn-primary inline-flex"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Create Invoice
                    </button>
                  </td>
                </tr>
              ) : (
                summary.recentInvoices.map((inv) => (
                  <tr 
                    key={inv._id} 
                    className="border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/invoices`)}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{inv.customer?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(inv.status)}`}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(inv.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent, icon, loading }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-2">{label}</p>
          {loading ? (
            <div className="h-8 w-32 bg-gray-100 rounded animate-pulse"></div>
          ) : (
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          )}
        </div>
        <div className={`h-12 w-12 rounded-lg ${accent} text-white flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function Pill({ label, value, color, loading }) {
  return (
    <div className="px-4 py-3 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow flex items-center justify-between text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      {loading ? (
        <div className="h-6 w-12 bg-gray-100 rounded-full animate-pulse"></div>
      ) : (
        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${color}`}>
          {value}
        </span>
      )}
    </div>
  )
}

function CountCard({ label, value, color, bgColor, icon, loading, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-2">{label}</p>
          {loading ? (
            <div className="h-8 w-20 bg-gray-100 rounded animate-pulse"></div>
          ) : (
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          )}
        </div>
        <div className={`${bgColor} ${color} p-3 rounded-full group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3 group-hover:text-primary-600 transition-colors">
        Click to view all →
      </p>
    </div>
  )
}

const statusBadge = (status) => {
  switch (status) {
    case 'paid':
      return 'bg-primary-100 text-primary-900'
    case 'sent':
      return 'bg-primary-50 text-primary-800'
    case 'overdue':
      return 'bg-primary-200 text-primary-900'
    default:
      return 'bg-primary-50 text-primary-800'
  }
}

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

