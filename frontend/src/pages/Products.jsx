import { useEffect, useMemo, useState } from 'react'
import { productAPI } from '../services/api'
import DataTable from '../components/ui/DataTable'

export default function Products() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState({
    name: '',
    sku: '',
    price: '',
    description: '',
  })

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'sku', header: 'SKU', sortable: true },
      {
        key: 'price',
        header: 'Price',
        sortable: true,
        align: 'right',
        sortValue: (r) => Number(r?.price ?? 0),
        render: (r) => {
          const n = Number(r?.price)
          return Number.isFinite(n) ? n.toFixed(2) : '—'
        },
      },
      { key: 'description', header: 'Description' },
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
                  name: row.name || '',
                  sku: row.sku || '',
                  price: row.price ?? '',
                  description: row.description || '',
                })
                setError('')
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                if (!window.confirm('Delete this product?')) return
                try {
                  await productAPI.remove(row._id)
                  setProducts((prev) => prev.filter((p) => p._id !== row._id))
                  if (editingId === row._id) {
                    setEditingId(null)
                    reset()
                  }
                } catch (e) {
                  setError(e?.response?.data?.error || e?.message || 'Failed to delete product')
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

  const loadProducts = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await productAPI.list()
      const payload = res?.data || res
      setProducts(payload?.data?.products || payload?.products || [])
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const onChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const reset = () => {
    setForm({ name: '', sku: '', price: '', description: '' })
    setEditingId(null)
  }

  const onCreate = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Name is required')
      return
    }

    const priceNumber = form.price === '' ? undefined : Number(form.price)
    if (priceNumber != null && !Number.isFinite(priceNumber)) {
      setError('Price must be a number')
      return
    }

    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        price: priceNumber,
        description: form.description.trim() || undefined,
      }

      if (editingId) {
        const res = await productAPI.update(editingId, payload)
        const body = res?.data || res
        const updated = body?.data?.product || body?.product
        if (updated) {
          setProducts((prev) => prev.map((p) => (p._id === editingId ? updated : p)))
        } else {
          await loadProducts()
        }
      } else {
        const res = await productAPI.create(payload)
        const body = res?.data || res
        const created = body?.data?.product || body?.product
        if (created) {
          setProducts((prev) => [created, ...prev])
        } else {
          await loadProducts()
        }
      }

      reset()
    } catch (e2) {
      setError(
        e2?.response?.data?.error ||
          e2?.response?.data?.message ||
          e2?.message ||
          (editingId ? 'Failed to update product' : 'Failed to create product')
      )
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => {
      const hay = [p.name, p.sku, p.description, p.price]
        .filter((v) => v != null)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [products, query])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-gray-600 mt-1">Create and manage product catalog items.</p>
      </div>

      <section className="card">
        <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit product' : 'Add product'}</h2>
        <form onSubmit={onCreate} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700">Name *</label>
            <input value={form.name} onChange={onChange('name')} className="input-field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700">SKU</label>
            <input value={form.sku} onChange={onChange('sku')} className="input-field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700">Price</label>
            <input
              value={form.price}
              onChange={onChange('price')}
              inputMode="decimal"
              className="input-field mt-1"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700">Description</label>
            <input
              value={form.description}
              onChange={onChange('description')}
              className="input-field mt-1"
            />
          </div>

          {error ? (
            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <button type="button" onClick={reset} className="btn-secondary">
              Clear
            </button>
            <button type="submit" className="btn-primary">
              {editingId ? 'Save changes' : 'Add product'}
            </button>
          </div>
        </form>
      </section>

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
            <button type="button" onClick={loadProducts} className="btn-secondary" disabled={loading}>
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
