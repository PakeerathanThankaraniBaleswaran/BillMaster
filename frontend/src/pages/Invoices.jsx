import { useEffect, useMemo, useState } from 'react'
import { FileText, Plus, X } from 'lucide-react'
import { invoiceAPI, customerAPI } from '../services/api'
import AppTopbar from '@/components/layout/AppTopbar'

const newItem = () => ({ description: '', quantity: 1, price: 0 })

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const statusColors = {
  draft: 'bg-slate-100 text-slate-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-rose-100 text-rose-800',
}

export default function Invoices() {
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    invoiceNumber: '',
    customer: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    taxRate: 0,
    status: 'draft',
    notes: '',
    items: [newItem()],
  })

  useEffect(() => {
    const load = async () => {
      try {
        const [custRes, invRes] = await Promise.all([
          customerAPI.list(),
          invoiceAPI.list(),
        ])
        const custPayload = custRes.data || custRes
        const invPayload = invRes.data || invRes

        setCustomers(custPayload.data?.customers || custPayload.customers || [])
        setInvoices(invPayload.data?.invoices || invPayload.invoices || [])
      } catch (error) {
        console.error('Failed to load invoices data', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totals = useMemo(() => {
    const subtotal = form.items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
      0
    )
    const taxAmount = (subtotal * Number(form.taxRate || 0)) / 100
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }, [form.items, form.taxRate])

  const handleItemChange = (idx, field, value) => {
    setForm((prev) => {
      const items = prev.items.map((item, i) =>
        i === idx
          ? {
              ...item,
              [field]: field === 'quantity' || field === 'price' ? Number(value) || 0 : value,
            }
          : item
      )
      return { ...prev, items }
    })
  }

  const handleAddItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, newItem()] }))
  }

  const handleRemoveItem = (idx) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))
  }

  const resetForm = () => {
    setForm({
      invoiceNumber: '',
      customer: '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      taxRate: 0,
      status: 'draft',
      notes: '',
      items: [newItem()],
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.invoiceNumber.trim()) {
      alert('Invoice number is required')
      return
    }
    if (!form.customer) {
      alert('Please select a customer')
      return
    }

    const filteredItems = form.items.filter((item) => item.description && item.quantity > 0 && item.price >= 0)
    if (filteredItems.length === 0) {
      alert('Add at least one line item with description, quantity, and price')
      return
    }

    const payloadItems = filteredItems.map((item) => {
      return {
        quantity: item.quantity,
        price: item.price,
        description: item.description,
      }
    })

    setSaving(true)
    try {
      const res = await invoiceAPI.create({
        invoiceNumber: form.invoiceNumber,
        customer: form.customer,
        status: form.status,
        notes: form.notes,
        items: payloadItems,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate || null,
      })
      const body = res.data || res
      const invoice = body.data?.invoice || body.invoice
      if (invoice) {
        setInvoices((prev) => [invoice, ...prev])
        setShowModal(false)
        resetForm()
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  const emptyState = !loading && invoices.length === 0

  return (
    <div className="app-page">
      <AppTopbar />
      <div className="app-container py-8 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Billing</p>
            <h1 className="text-3xl font-semibold text-slate-900">Invoices</h1>
            <p className="text-sm text-slate-600 mt-1">Create and manage your invoices</p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            New invoice
          </button>
        </header>

        {emptyState ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">No invoices yet</h2>
              <p className="text-slate-600 mt-1">Create your first invoice to get started</p>
            </div>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="btn-primary"
            >
              Create Invoice
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">All invoices</h2>
              <div className="text-sm text-slate-500">Total: {invoices.length}</div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="min-w-full text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Invoice #</th>
                    <th className="px-4 py-2 text-left">Customer</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-right">Subtotal</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-6 text-center text-slate-500">Loading...</td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv._id} className="border-t border-slate-100">
                        <td className="px-4 py-2 font-semibold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="px-4 py-2 text-slate-700">{inv.customer?.name || '—'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[inv.status] || statusColors.draft}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">{formatCurrency(inv.subtotal)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(inv.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Create New Invoice</h3>
                <p className="text-sm text-slate-600">Fill in the invoice details below</p>
              </div>
              <button
                className="text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Invoice Number</label>
                  <input
                    className="input-field"
                    value={form.invoiceNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="e.g., INV-2026-001"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Customer</label>
                  <select
                    className="select-field"
                    value={form.customer}
                    onChange={(e) => setForm((prev) => ({ ...prev, customer: e.target.value }))}
                    required
                  >
                    <option value="">Select a customer</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  {customers.length === 0 && (
                    <p className="text-xs text-amber-600">Add a customer first.</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Invoice Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={form.invoiceDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, invoiceDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Due Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={form.dueDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={form.taxRate}
                    onChange={(e) => setForm((prev) => ({ ...prev, taxRate: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Invoice Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-sm text-primary-700 hover:text-primary-800 font-semibold"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1.2fr,0.6fr,0.6fr,0.4fr] gap-2 items-end">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Item name</label>
                        <input
                          className="input-field"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Enter item name"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Qty</label>
                        <input
                          type="number"
                          min="0"
                          className="input-field"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Price (LKR)</label>
                        <input
                          type="number"
                          min="0"
                          className="input-field"
                          value={item.price}
                          onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex items-center justify-between pb-1">
                        <div className="text-sm font-semibold text-slate-800">{formatCurrency(item.quantity * item.price)}</div>
                        <button
                          type="button"
                          className="text-sm text-rose-600 hover:text-rose-700"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={form.items.length === 1}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  className="textarea-field"
                  rows="3"
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Payment terms or delivery notes"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                <div className="text-sm text-slate-600 space-y-1">
                  <p>Subtotal: <span className="font-semibold text-slate-900">{formatCurrency(totals.subtotal)}</span></p>
                  <p>Tax ({form.taxRate}%): <span className="font-semibold text-slate-900">{formatCurrency(totals.taxAmount)}</span></p>
                  <p className="text-base font-semibold text-slate-900">Total: {formatCurrency(totals.total)}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? 'Saving...' : 'Create Invoice'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
