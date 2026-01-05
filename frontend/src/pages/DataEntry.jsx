import { useEffect, useMemo, useState } from 'react'
import { Boxes, Building2, RotateCcw, Save, TrendingUp, Wallet } from 'lucide-react'
import { inventoryAPI } from '../services/api'
import AppTopbar from '@/components/layout/AppTopbar'

const emptyForm = {
  company: '',
  product: '',
  variant: '',
  purchaseQuantityValue: 0,
  purchaseUnit: 'number',
  purchasePrice: 0,
  sellingPrice: 0,
}

const formatCurrency = (value) =>
  value.toLocaleString('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function DataEntry() {
  const [form, setForm] = useState(emptyForm)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const totals = useMemo(() => {
    const totalProducts = entries.length
    const totalStock = entries.reduce((sum, e) => sum + e.quantity, 0)
    const inventoryValue = entries.reduce((sum, e) => sum + e.quantity * e.sellingPrice, 0)
    const companies = new Set(entries.map((e) => e.company)).size
    return { totalProducts, totalStock, inventoryValue, companies }
  }, [entries])

  const profit = useMemo(() => form.sellingPrice - form.purchasePrice, [form.purchasePrice, form.sellingPrice])
  const profitPct = useMemo(
    () => (form.purchasePrice > 0 ? (profit / form.purchasePrice) * 100 : 0),
    [profit, form.purchasePrice]
  )

  const handleChange = (field, value) => {
    const numericFields = ['purchasePrice', 'sellingPrice', 'purchaseQuantityValue']
    setForm((prev) => ({
      ...prev,
      [field]: numericFields.includes(field) ? Number(value) || 0 : value,
    }))
  }

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const res = await inventoryAPI.getInventory()
        const payload = res.data || res
        const data = payload.data || payload
        setEntries(data.items || [])
      } catch (error) {
        console.error('Failed to load inventory', error)
      } finally {
        setLoading(false)
      }
    }
    loadInventory()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.company || !form.product) {
      alert('Please fill company and product name')
      return
    }
    const quantityNumber = Number(form.purchaseQuantityValue)

    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
      alert('Quantity must be greater than zero (e.g., 25 kg, 10 bags)')
      return
    }

    const label = form.purchaseUnit === 'number'
      ? `${quantityNumber}`
      : `${quantityNumber} ${form.purchaseUnit}`

    try {
      const res = await inventoryAPI.createItem({
        company: form.company,
        product: form.product,
        variant: form.variant,
        quantity: quantityNumber,
        purchasePrice: form.purchasePrice,
        sellingPrice: form.sellingPrice,
        purchaseQuantityLabel: label,
        purchaseUnit: form.purchaseUnit,
      })
      const body = res.data || res
      const item = body.data?.item || body.item
      if (item) {
        setEntries((prev) => [item, ...prev])
        alert('Entry saved!')
        setForm(emptyForm)
      } else {
        alert('Saved, but could not read response item.')
      }
    } catch (error) {
      console.error('Failed to save item', error)
      alert(error.response?.data?.message || 'Failed to save item')
    }
  }

  const handleReset = () => {
    setForm(emptyForm)
  }

  return (
    <div className="app-page">
      <AppTopbar />
      <div className="app-container py-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">Inventory</p>
            <h1 className="page-title">Data entry</h1>
            <p className="page-subtitle">Add products and track stock value</p>
          </div>
        </header>

        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold">
            <TrendingUp className="h-4 w-4 text-primary-700" />
            <span className="text-gray-800">Overview</span>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <StatCard label="Total Products" value={totals.totalProducts} icon={<Boxes className="h-5 w-5" />} theme="primary" />
            <StatCard label="Companies" value={totals.companies} icon={<Building2 className="h-5 w-5" />} theme="primarySoft" />
            <StatCard label="Total Stock" value={totals.totalStock} icon={<TrendingUp className="h-5 w-5" />} theme="neutral" />
            <StatCard label="Inventory Value" value={formatCurrency(totals.inventoryValue)} icon={<Wallet className="h-5 w-5" />} theme="neutral" />
          </div>
        </section>

        <div className="grid md:grid-cols-[1.05fr,1.4fr] gap-5">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-8 w-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-semibold border border-primary-100">+</span>
              <h2 className="text-lg font-semibold text-gray-900">Add product</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Company Name</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter company name"
                  value={form.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Product Name</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter product name"
                  value={form.product}
                  onChange={(e) => handleChange('product', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Variant</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., 500ml, Red, Large"
                  value={form.variant}
                  onChange={(e) => handleChange('variant', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Stock Purchased (Qty)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter the quantity of stock purchased"
                      value={form.purchaseQuantityValue}
                      onChange={(e) => handleChange('purchaseQuantityValue', e.target.value)}
                    />
                    <select
                      className="min-w-[90px] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={form.purchaseUnit}
                      onChange={(e) => handleChange('purchaseUnit', e.target.value)}
                    >
                      <option value="number">number</option>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Purchase Price</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={form.purchasePrice}
                    onChange={(e) => handleChange('purchasePrice', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Selling Price</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={form.sellingPrice}
                    onChange={(e) => handleChange('sellingPrice', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Profit (auto)</label>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner text-sm font-semibold text-emerald-700">
                    <span>{formatCurrency(profit)}</span>
                    <span>{profitPct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-secondary"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
              </div>
            </form>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">📦</span>
                <span>Inventory</span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-1">{entries.length} items</span>
              </div>
              <div className="w-60">
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Search products..."
                  disabled
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="min-w-full text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Company</th>
                    <th className="px-4 py-2 text-left">Product</th>
                    <th className="px-4 py-2 text-left">Variant</th>
                    <th className="px-4 py-2 text-right">Purchase Qty</th>
                    <th className="px-4 py-2 text-right">Purchase (LKR)</th>
                    <th className="px-4 py-2 text-right">Selling (LKR)</th>
                    <th className="px-4 py-2 text-right">Profit</th>
                    <th className="px-4 py-2 text-right">Profit %</th>
                    <th className="px-4 py-2 text-right">Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-6 text-center text-slate-500">Loading...</td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                        No products found. Add your first product to get started.
                      </td>
                    </tr>
                  ) : (
                    entries.map((row, idx) => (
                      <tr key={`${row._id || row.product}-${idx}`} className="border-t border-slate-100">
                        <td className="px-4 py-2">{row.company || '—'}</td>
                        <td className="px-4 py-2">{row.product}</td>
                        <td className="px-4 py-2">{row.variant || '—'}</td>
                        <td className="px-4 py-2 text-right">{row.purchaseQuantityLabel || row.quantity}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(row.purchasePrice)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(row.sellingPrice)}</td>
                        <td className="px-4 py-2 text-right text-emerald-700">{formatCurrency(row.profit)}</td>
                        <td className="px-4 py-2 text-right text-emerald-700">{(row.profitPct || 0).toFixed(1)}%</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(row.quantity * row.sellingPrice)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, theme }) {
  const themeMap = {
    primary: 'bg-primary-600 text-white',
    primarySoft: 'bg-primary-50 text-primary-700 border border-primary-100',
    neutral: 'bg-gray-100 text-gray-700',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
      </div>
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${themeMap[theme] || themeMap.neutral}`}>
        {icon}
      </div>
    </div>
  )
}
