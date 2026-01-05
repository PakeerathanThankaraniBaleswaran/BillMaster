import { useEffect, useMemo, useState } from 'react'
import { customerAPI } from '../services/api'
import DataTable from '../components/ui/DataTable'

export default function Customers() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [customers, setCustomers] = useState([])

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
  })

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'email', header: 'Email', sortable: true },
      { key: 'phone', header: 'Phone', sortable: true },
      { key: 'city', header: 'City', sortable: true },
      { key: 'zip', header: 'ZIP', sortable: true, align: 'right' },
    ],
    []
  )

  const loadCustomers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await customerAPI.getAll()
      setCustomers(res?.data || [])
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  const onChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const reset = () => {
    setForm({ name: '', email: '', phone: '', address: '', city: '', zip: '' })
  }

  const onCreate = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Name is required')
      return
    }

    try {
      await customerAPI.create({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        zip: form.zip.trim() || undefined,
      })
      reset()
      await loadCustomers()
    } catch (e2) {
      setError(e2?.response?.data?.error || e2?.message || 'Failed to create customer')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customer list and contact details.</p>
        </div>
      </div>

      <section className="card">
        <h2 className="text-lg font-semibold text-gray-900">Add customer</h2>
        <form onSubmit={onCreate} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700">Name *</label>
            <input value={form.name} onChange={onChange('name')} className="input-field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700">Email</label>
            <input
              value={form.email}
              onChange={onChange('email')}
              type="email"
              className="input-field mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700">Phone</label>
            <input value={form.phone} onChange={onChange('phone')} className="input-field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700">City</label>
            <input value={form.city} onChange={onChange('city')} className="input-field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700">Address</label>
            <input value={form.address} onChange={onChange('address')} className="input-field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700">ZIP</label>
            <input value={form.zip} onChange={onChange('zip')} className="input-field mt-1" />
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
              Add customer
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">All customers</h2>
          <button type="button" onClick={loadCustomers} className="btn-secondary" disabled={loading}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="card text-gray-600">Loading...</div>
        ) : customers.length === 0 ? (
          <div className="card text-gray-600">No customers yet.</div>
        ) : (
          <DataTable columns={columns} rows={customers} />
        )}
      </section>
    </div>
  )
}
