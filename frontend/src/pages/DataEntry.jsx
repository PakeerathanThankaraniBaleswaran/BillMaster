import { useEffect, useMemo, useState } from 'react'
import { Boxes, Building2, RotateCcw, Save, TrendingUp, Wallet } from 'lucide-react'
import { inventoryAPI } from '../services/api'
import DataTable from '../components/ui/DataTable'

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
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState(null)

  const totals = useMemo(() => {
    const totalProducts = entries.length
    const totalStock = entries.reduce((sum, e) => sum + (Number(e.quantity) || 0), 0)
    const inventoryValue = entries.reduce(
      (sum, e) => sum + (Number(e.quantity) || 0) * (Number(e.sellingPrice) || 0),
      0
    )
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

  const reset = () => {
    setForm(emptyForm)
    setEditingId(null)
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

    setSaving(true)
    try {
      const payload = {
        company: form.company,
        product: form.product,
        variant: form.variant,
        quantity: quantityNumber,
        purchasePrice: form.purchasePrice,
        sellingPrice: form.sellingPrice,
        purchaseQuantityLabel: label,
        purchaseUnit: form.purchaseUnit,
      }

      const res = editingId
        ? await inventoryAPI.updateItem(editingId, payload)
        : await inventoryAPI.createItem(payload)
      const body = res.data || res
      const item = body.data?.item || body.item

      if (item) {
        setEntries((prev) => {
          if (editingId) return prev.map((e) => (e._id === editingId ? item : e))
          return [item, ...prev]
        })
        reset()
      } else {
        // Fallback: reload list if response shape changes
        const reload = await inventoryAPI.getInventory()
        const payload2 = reload.data || reload
        const data2 = payload2.data || payload2
        setEntries(data2.items || [])
        reset()
      }
    } catch (error) {
      console.error('Failed to save item', error)
      alert(error.response?.data?.message || 'Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((row) => {
      const hay = [
        row.company,
        row.product,
        row.variant,
        row.purchaseQuantityLabel,
        row.purchaseUnit,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [entries, query])

  const columns = useMemo(
    () => [
      { key: 'company', header: 'Company', sortable: true },
      { key: 'product', header: 'Product', sortable: true },
      { key: 'variant', header: 'Variant', sortable: true, render: (r) => r.variant || '—' },
      {
        key: 'purchaseQuantityLabel',
        header: 'Purchase Qty',
        sortable: true,
        align: 'right',
        render: (r) => r.purchaseQuantityLabel || r.quantity,
      },
      {
        key: 'purchasePrice',
        header: 'Purchase',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.purchasePrice ?? 0),
        render: (r) => formatCurrency(Number(r?.purchasePrice || 0)),
      },
      {
        key: 'sellingPrice',
        header: 'Selling',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.sellingPrice ?? 0),
        render: (r) => formatCurrency(Number(r?.sellingPrice || 0)),
      },
      {
        key: 'profit',
        header: 'Profit',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.profit ?? 0),
        render: (r) => (
          <span className="font-semibold text-emerald-700">{formatCurrency(Number(r?.profit || 0))}</span>
        ),
      },
      {
        key: 'profitPct',
        header: 'Profit %',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.profitPct ?? 0),
        render: (r) => (
          <span className="font-semibold text-emerald-700">{Number(r?.profitPct || 0).toFixed(1)}%</span>
        ),
      },
      {
        key: 'stockValue',
        header: 'Stock Value',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.quantity ?? 0) * Number(r?.sellingPrice ?? 0),
        render: (r) => formatCurrency((Number(r?.quantity || 0) * Number(r?.sellingPrice || 0)) || 0),
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
                setEditingId(row._id)
                setForm({
                  company: row.company || '',
                  product: row.product || '',
                  variant: row.variant || '',
                  purchaseQuantityValue: Number(row.quantity || 0),
                  purchaseUnit: row.purchaseUnit || 'number',
                  purchasePrice: Number(row.purchasePrice || 0),
                  sellingPrice: Number(row.sellingPrice || 0),
                })
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                if (!window.confirm('Delete this inventory item?')) return
                try {
                  await inventoryAPI.removeItem(row._id)
                  setEntries((prev) => prev.filter((e) => e._id !== row._id))
                  if (editingId === row._id) reset()
                } catch (err) {
                  alert(err?.response?.data?.message || err?.message || 'Failed to delete item')
                }
              }}
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [editingId]
  )

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">Inventory</p>
          <h1 className="page-title">Stock</h1>
          <p className="page-subtitle">Add products and track stock value</p>
        </div>
      </header>

      <section>
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
        <section className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-8 w-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-semibold border border-primary-100">+</span>
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit item' : 'Add item'}</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Company Name</label>
                <input
                  className="input-field"
                  placeholder="Enter company name"
                  value={form.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Product Name</label>
                <input
                  className="input-field"
                  placeholder="Enter product name"
                  value={form.product}
                  onChange={(e) => handleChange('product', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Variant</label>
                <input
                  className="input-field"
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
                      className="input-field"
                      placeholder="Enter the quantity of stock purchased"
                      value={form.purchaseQuantityValue}
                      onChange={(e) => handleChange('purchaseQuantityValue', e.target.value)}
                    />
                    <select
                      className="select-field min-w-[90px]"
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
                    className="input-field"
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
                    className="input-field"
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
                  onClick={reset}
                  className="btn-secondary"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : editingId ? 'Save changes' : 'Save'}
                </button>
              </div>
            </form>
          </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Inventory</h2>
              <p className="text-sm text-gray-600">{entries.length} items</p>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field w-full max-w-xs"
              placeholder="Search inventory..."
            />
          </div>

          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-gray-600">No inventory items yet.</div>
          ) : (
            <DataTable columns={columns} rows={filteredEntries} rowKey={(r) => r._id} />
          )}
        </section>
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
