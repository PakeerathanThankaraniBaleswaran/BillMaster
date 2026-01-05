import { useEffect, useMemo, useState } from 'react'
import { productAPI } from '../services/api'
import DataTable from '../components/ui/DataTable'

export default function Products() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])

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
    ],
    []
  )

  const loadProducts = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await productAPI.getAll()
      setProducts(res?.data || [])
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
      await productAPI.create({
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        price: priceNumber,
        description: form.description.trim() || undefined,
      })
      reset()
      await loadProducts()
    } catch (e2) {
      setError(e2?.response?.data?.error || e2?.message || 'Failed to create product')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-gray-600 mt-1">Create and manage product catalog items.</p>
      </div>

      <section className="card">
        <h2 className="text-lg font-semibold text-gray-900">Add product</h2>
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
              Add product
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">All products</h2>
          <button type="button" onClick={loadProducts} className="btn-secondary" disabled={loading}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="card text-gray-600">Loading...</div>
        ) : products.length === 0 ? (
          <div className="card text-gray-600">No products yet.</div>
        ) : (
          <DataTable columns={columns} rows={products} />
        )}
      </section>
    </div>
  )
}
