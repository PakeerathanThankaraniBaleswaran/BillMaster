import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { customerAPI, invoiceAPI, productAPI } from '../services/api'

const newItem = () => ({ product: '', description: '', quantity: 1, unit: 'number', price: 0 })

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function Invoices() {
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)
  const [itemLookupMode, setItemLookupMode] = useState('serial')
  const [itemLookupQuery, setItemLookupQuery] = useState('')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [form, setForm] = useState({
    invoiceNumber: '',
    customer: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    taxRate: 0,
    discountRate: 0,
    status: 'draft',
    notes: '',
    items: [newItem()],
  })

  useEffect(() => {
    const load = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([customerAPI.list(), productAPI.list()])
        const custPayload = custRes.data || custRes
        const prodPayload = prodRes.data || prodRes

        setCustomers(custPayload.data?.customers || custPayload.customers || [])
        setProducts(prodPayload.data?.products || prodPayload.products || [])
      } catch (error) {
        console.error('Failed to load invoices data', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    setForm((prev) => {
      if (prev.invoiceNumber?.trim()) return prev
      return { ...prev, invoiceNumber: `INV-${Date.now()}` }
    })
  }, [])

  const totals = useMemo(() => {
    const subtotal = form.items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
      0
    )
    const safeTax = Math.min(100, Math.max(0, Number(form.taxRate || 0)))
    const safeDiscount = Math.min(100, Math.max(0, Number(form.discountRate || 0)))
    const taxAmount = (subtotal * safeTax) / 100
    const discountAmount = (subtotal * safeDiscount) / 100
    const total = Math.max(0, subtotal + taxAmount - discountAmount)
    return { subtotal, taxAmount, discountAmount, total }
  }, [form.items, form.taxRate, form.discountRate])

  const handleItemChange = (idx, field, value) => {
    setForm((prev) => {
      const items = prev.items.map((item, i) =>
        i === idx
          ? {
              ...item,
              [field]:
                field === 'quantity' || field === 'price' ? Number(value) || 0 : value,
            }
          : item
      )
      return { ...prev, items }
    })
  }

  const addProductToInvoice = (product) => {
    if (!product?._id) return
    setForm((prev) => {
      const nextLine = {
        product: product._id,
        description: product.name || '',
        quantity: 1,
        unit: product.unit || 'number',
        price: Number(product.price || 0),
      }

      const items = Array.isArray(prev.items) ? [...prev.items] : [newItem()]

      const existingIndex = items.findIndex((i) => i?.product === product._id)
      if (existingIndex >= 0) {
        const existing = items[existingIndex]
        items[existingIndex] = {
          ...existing,
          description: existing.description || nextLine.description,
          unit: existing.unit || nextLine.unit,
          price: Number(existing.price || 0) > 0 ? existing.price : nextLine.price,
          quantity: (Number(existing.quantity) || 0) + 1,
        }
        return { ...prev, items }
      }

      const emptyIndex = items.findIndex((i) => !i.product && !String(i.description || '').trim())
      if (emptyIndex >= 0) {
        items[emptyIndex] = { ...items[emptyIndex], ...nextLine }
      } else {
        items.push(nextLine)
      }
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
      discountRate: 0,
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

    const filteredItems = form.items.filter((item) => item.description && item.quantity > 0 && item.price >= 0)
    if (filteredItems.length === 0) {
      alert('Add at least one line item with description, quantity, and price')
      return
    }

    const payloadItems = filteredItems.map((item) => {
      return {
        product: item.product || undefined,
        quantity: item.quantity,
        unit: item.unit || 'number',
        price: item.price,
        description: item.description,
      }
    })

    setSaving(true)
    try {
      const res = await invoiceAPI.create({
        invoiceNumber: form.invoiceNumber,
        customer: form.customer || undefined,
        status: form.status,
        notes: form.notes,
        taxRate: Number(form.taxRate || 0),
        discountRate: Number(form.discountRate || 0),
        items: payloadItems,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate || null,
      })
      const body = res.data || res
      const invoice = body.data?.invoice || body.invoice
      const lowStock = body.warnings?.lowStock
      if (invoice) {
        resetForm()
        setForm((prev) => ({ ...prev, invoiceNumber: `INV-${Date.now()}` }))
        setItemLookupQuery('')

        if (Array.isArray(lowStock) && lowStock.length) {
          const msg = lowStock
            .slice(0, 6)
            .map((i) => `${i.product}${i.variant ? ` (${i.variant})` : ''} — ${i.quantity} (min ${i.minQuantity})`)
            .join('\n')
          alert(`Low stock alert:\n${msg}${lowStock.length > 6 ? '\n…' : ''}`)
        }
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c._id === form.customer) || null
  }, [customers, form.customer])

  const filteredProductsForLookup = useMemo(() => {
    const q = itemLookupQuery.trim().toLowerCase()
    if (!q) return products

    return products.filter((p) => {
      const name = String(p?.name || '').toLowerCase()
      const sku = String(p?.sku || '').toLowerCase()
      if (itemLookupMode === 'name') return name.includes(q)
      return sku.includes(q) || name.includes(q)
    })
  }, [products, itemLookupMode, itemLookupQuery])


  const handleCancel = () => {
    resetForm()
    setForm((prev) => ({ ...prev, invoiceNumber: `INV-${Date.now()}` }))
    setItemLookupQuery('')
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="bg-white w-full h-[calc(100vh-4rem)] rounded-none border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">Bill</div>
            <div className="text-xs font-semibold px-3 py-1 rounded-full bg-primary-600 text-white">No Tax Invoice</div>
          </div>
          <button
            type="button"
            className="text-slate-500 hover:text-slate-700"
            onClick={handleCancel}
            aria-label="Reset"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-[360px,1fr]">
            <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 p-4 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="lookupMode"
                      checked={itemLookupMode === 'serial'}
                      onChange={() => setItemLookupMode('serial')}
                    />
                    Serial No.
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="lookupMode"
                      checked={itemLookupMode === 'itemcode'}
                      onChange={() => setItemLookupMode('itemcode')}
                    />
                    Item Code
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="lookupMode"
                      checked={itemLookupMode === 'name'}
                      onChange={() => setItemLookupMode('name')}
                    />
                    Item Name
                  </label>
                </div>

                <input
                  className="input-field"
                  value={itemLookupQuery}
                  onChange={(e) => setItemLookupQuery(e.target.value)}
                  placeholder="Search product..."
                />

                <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 border-b border-slate-200">
                    Products
                  </div>
                  <div className="max-h-[calc(100vh-15rem)] overflow-y-auto">
                    {loading ? (
                      <div className="px-3 py-3 text-sm text-slate-500">Loading...</div>
                    ) : filteredProductsForLookup.length ? (
                      filteredProductsForLookup.map((p) => (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => addProductToInvoice(p)}
                          className="w-full text-left px-3 py-3 border-b border-slate-100 hover:bg-slate-50"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900 truncate">
                                {p.sku ? `${p.sku} - ` : ''}{p.name}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                Unit: {p.unit || 'number'}
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                              {formatCurrency(p.price)}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-sm text-slate-500">No products found.</div>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            <div className="p-5 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Phone No.</label>
                  <input
                    className="input-field"
                    value={selectedCustomer?.phone || ''}
                    readOnly
                    placeholder="—"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Customer</label>
                  <select
                    className="select-field"
                    value={form.customer}
                    onChange={(e) => setForm((prev) => ({ ...prev, customer: e.target.value }))}
                  >
                    <option value="">Select customer</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input-field"
                    value={form.discountRate}
                    onChange={(e) => setForm((prev) => ({ ...prev, discountRate: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Tax (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input-field"
                    value={form.taxRate}
                    onChange={(e) => setForm((prev) => ({ ...prev, taxRate: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-[1.2fr,0.25fr,0.25fr,0.4fr,0.4fr] gap-2 bg-primary-600 text-white text-xs font-semibold px-3 py-2">
                  <div>Particular / Item</div>
                  <div className="text-right">Qty</div>
                  <div>Unit</div>
                  <div className="text-right">Rate</div>
                  <div className="text-right">Amount</div>
                </div>

                <div className="p-3 space-y-3">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1.2fr,0.25fr,0.25fr,0.4fr,0.4fr] gap-2 items-end">
                      <div className="space-y-2">
                        <input
                          className="input-field"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Item name"
                          required
                        />
                      </div>

                        <div className="space-y-1">
                          <input
                            type="number"
                            min="0"
                            className="input-field text-right"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <select
                            className="select-field"
                            value={item.unit || 'number'}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            disabled={Boolean(item.product)}
                          >
                            <option value="number">number</option>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="l">l</option>
                            <option value="ml">ml</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <input
                            type="number"
                            min="0"
                            className="input-field text-right"
                            value={item.price}
                            onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                            required
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-slate-800 text-right w-full">
                            {formatCurrency(item.quantity * item.price)}
                          </div>
                          <button
                            type="button"
                            className="text-xs text-rose-600 hover:text-rose-700"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={form.items.length === 1}
                          >
                            Remove
                          </button>
                        </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between">
                    <button type="button" onClick={handleAddItem} className="btn-secondary">
                      + Add item
                    </button>
                    <div className="text-xs text-slate-500">Invoice No: {form.invoiceNumber}</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Notes</label>
                  <textarea
                    className="textarea-field"
                    rows="3"
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes"
                  />
                </div>

                <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                    <div>Savings</div>
                    <div className="text-right">{formatCurrency(totals.discountAmount)}</div>
                    <div>Round Off</div>
                    <div className="text-right">{formatCurrency(0)}</div>
                    <div>Tax</div>
                    <div className="text-right">{formatCurrency(totals.taxAmount)}</div>
                    <div className="font-semibold text-slate-900">Total</div>
                    <div className="text-right font-semibold text-slate-900">{formatCurrency(totals.total)}</div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-600">
                      Items: <span className="font-semibold">{form.items.length}</span>{' '}
                      Qty:{' '}
                      <span className="font-semibold">
                        {form.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-600">Payment Mode</label>
                      <select
                        className="select-field"
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="bank">Bank</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button type="button" onClick={handleCancel} className="btn-secondary">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md px-4 py-3 disabled:opacity-60"
                      disabled={saving}
                    >
                      {saving ? 'Generating...' : 'Generate Invoice'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
