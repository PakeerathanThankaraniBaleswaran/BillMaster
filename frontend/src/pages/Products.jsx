import { useEffect, useMemo, useState } from 'react'
import { inventoryAPI } from '../services/api'
import DataTable from '../components/ui/DataTable'

const formatCurrency = (value) =>
  value.toLocaleString('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function Products() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [query, setQuery] = useState('')

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
        key: 'minQuantity',
        header: 'Min',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.minQuantity ?? 0),
        render: (r) => Number(r?.minQuantity || 0) || '—',
      },
    ],
    []
  )

  const loadInventory = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await inventoryAPI.getInventory()
      const payload = res?.data || res
      const data = payload?.data || payload
      setItems(data?.items || [])
      setLowStockItems(data?.summary?.lowStockItems || [])
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventory()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((row) => {
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
  }, [items, query])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-gray-600 mt-1">Inventory items (company, product, variant, pricing).</p>
      </div>

      {lowStockItems.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">Low stock alert</div>
          <div className="mt-1 text-amber-800">
            {lowStockItems.length} item(s) are at or below the minimum limit.
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">All products</h2>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field"
              placeholder="Search products..."
            />
            <button type="button" onClick={loadInventory} className="btn-secondary" disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card text-gray-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="card text-gray-600">No products yet.</div>
        ) : (
          <DataTable columns={columns} rows={filtered} rowKey={(r) => r._id} />
        )}
      </section>
    </div>
  )
}
