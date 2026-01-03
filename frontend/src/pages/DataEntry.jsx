import { useMemo, useState } from 'react'

const emptyForm = {
  company: '',
  product: '',
  variant: '',
  quantity: 0,
  purchasePrice: 0,
  sellingPrice: 0,
}

const formatCurrency = (value) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function DataEntry() {
  const [form, setForm] = useState(emptyForm)
  const [entries, setEntries] = useState([])

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
    const numericFields = ['quantity', 'purchasePrice', 'sellingPrice']
    setForm((prev) => ({
      ...prev,
      [field]: numericFields.includes(field) ? Number(value) || 0 : value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.company || !form.product) {
      alert('Please fill company and product name')
      return
    }
    if (form.quantity <= 0) {
      alert('Quantity must be greater than zero')
      return
    }
    const newEntry = { ...form, profit, profitPct }
    setEntries((prev) => [...prev, newEntry])
    alert('Entry saved!')
    setForm(emptyForm)
  }

  const handleReset = () => {
    setForm(emptyForm)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Inventory Manager</p>
            <h1 className="text-2xl font-semibold text-slate-900">Smart data entry & stock tracking</h1>
          </div>
        </header>

        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold">
            <span>📊</span>
            <span>Overview</span>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <StatCard label="Total Products" value={totals.totalProducts} icon="📦" theme="blue" />
            <StatCard label="Companies" value={totals.companies} icon="🏢" theme="emerald" />
            <StatCard label="Total Stock" value={totals.totalStock} icon="📈" theme="amber" />
            <StatCard label="Inventory Value" value={formatCurrency(totals.inventoryValue)} icon="💵" theme="green" />
          </div>
        </section>

        <div className="grid md:grid-cols-[1.05fr,1.4fr] gap-5">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">+</span>
              <h2 className="text-lg font-semibold text-slate-900">Add New Product</h2>
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
                  <label className="text-sm font-medium text-slate-700">Purchase Quantity</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={form.quantity}
                    onChange={(e) => handleChange('quantity', e.target.value)}
                  />
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
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <span>↺</span>
                  <span>Reset</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-white font-semibold shadow-sm hover:bg-emerald-700"
                >
                  <span>💾</span>
                  <span>Save Entry</span>
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
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Purchase $</th>
                    <th className="px-4 py-2 text-right">Selling $</th>
                    <th className="px-4 py-2 text-right">Profit</th>
                    <th className="px-4 py-2 text-right">Profit %</th>
                    <th className="px-4 py-2 text-right">Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                        No products found. Add your first product to get started.
                      </td>
                    </tr>
                  ) : (
                    entries.map((row, idx) => (
                      <tr key={`${row.product}-${idx}`} className="border-t border-slate-100">
                        <td className="px-4 py-2">{row.company || '—'}</td>
                        <td className="px-4 py-2">{row.product}</td>
                        <td className="px-4 py-2">{row.variant || '—'}</td>
                        <td className="px-4 py-2 text-right">{row.quantity}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(row.purchasePrice)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(row.sellingPrice)}</td>
                        <td className="px-4 py-2 text-right text-emerald-700">{formatCurrency(row.profit)}</td>
                        <td className="px-4 py-2 text-right text-emerald-700">{row.profitPct.toFixed(1)}%</td>
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
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
      </div>
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg font-semibold ${themeMap[theme]}`}>
        {icon}
      </div>
    </div>
  )
}
