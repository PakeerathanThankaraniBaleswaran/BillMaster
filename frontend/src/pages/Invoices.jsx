import { useEffect, useMemo, useState } from 'react'
import { companyAPI, customerAPI, invoiceAPI, productAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { Search, Package, Plus, Trash2, Receipt, User, Phone, CreditCard, CheckCircle, AlertCircle, ShoppingCart } from 'lucide-react'
import { openReceiptPrintWindow } from '@/utils/receiptPrint'

const newItem = () => ({ product: '', description: '', quantity: 1, unit: 'number', price: 0 })

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-LK', { style:'currency', currency:'LKR', minimumFractionDigits:2 })

const formatUnitLabel = (unit) => {
  const u = String(unit || '').toLowerCase()
  if (!u || u === 'number') return 'nos'
  return u
}

export default function Invoices() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState(null)
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)
  const [itemLookupQuery, setItemLookupQuery] = useState('')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState('')
  const [form, setForm] = useState({
    invoiceNumber: '',
    customer: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    status: 'draft',
    items: [newItem()],
  })

  // Load products, customers, company
  useEffect(() => {
    const load = async () => {
      try {
        const [custRes, prodRes, companyRes] = await Promise.all([
          customerAPI.list(),
          productAPI.list(),
          companyAPI.getCompanyProfile().catch(() => null),
        ])
        const custPayload = custRes.data || custRes
        const prodPayload = prodRes.data || prodRes
        setCustomers(custPayload.data?.customers || custPayload.customers || [])
        setProducts(prodPayload.data?.products || prodPayload.products || [])
        if (companyRes) {
          const companyPayload = companyRes.data || companyRes
          setCompany(companyPayload.data?.company || companyPayload.company || null)
        }
      } catch (e) { console.error('Load error', e) } finally { setLoading(false) }
    }
    load()
  }, [])

  // Auto-generate invoice number
  useEffect(() => {
    setForm((prev) => prev.invoiceNumber?.trim() ? prev : { ...prev, invoiceNumber:`INV-${Date.now()}` })
  }, [])

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum,i)=>sum+(Number(i.quantity)||0)*(Number(i.price)||0),0)
    return { total: Math.max(0, subtotal) }
  }, [form.items])

  const handleItemChange = (idx, field, value) => {
    setForm(prev => {
      const items = prev.items.map((i,iidx) => iidx===idx ? { ...i, [field]: field==='quantity'||field==='price'?Number(value)||0:value } : i)
      return { ...prev, items }
    })
  }

  const addProductToInvoice = (product) => {
    if (!product?._id) return
    setForm(prev => {
      const nextLine = { product: product._id, description: product.name, quantity:1, unit:product.unit||'number', price:Number(product.price||0) }
      const items = [...prev.items]
      const existingIndex = items.findIndex(i=>i?.product===product._id)
      if (existingIndex>=0) { items[existingIndex].quantity +=1; return {...prev, items} }
      const emptyIndex = items.findIndex(i=>!i.product && !i.description.trim())
      if (emptyIndex>=0) { items[emptyIndex] = { ...items[emptyIndex], ...nextLine } } else { items.push(nextLine) }
      return {...prev, items}
    })
  }

  const handleAddItem = () => setForm(prev => ({ ...prev, items:[...prev.items, newItem()] }))
  const handleRemoveItem = idx => setForm(prev=>({ ...prev, items: prev.items.filter((_,i)=>i!==idx) }))
  const resetForm = () => setForm({ invoiceNumber:`INV-${Date.now()}`, customer:'', invoiceDate:new Date().toISOString().slice(0,10), status:'draft', items:[newItem()] })

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.invoiceNumber.trim()) { alert('Bill No required'); return }
    const filteredItems = form.items.filter(i=>i.description && i.quantity>0 && i.price>=0)
    if (!filteredItems.length) { alert('Add at least one item'); return }
    if (paymentMode === 'credit' && !form.customer) { alert('Select a customer for credit invoices'); return }

    const invoiceStatus = paymentMode === 'credit' ? 'sent' : 'paid'

    const payloadItems = filteredItems.map(i=>({ product:i.product||undefined, quantity:i.quantity, unit:i.unit||'number', price:i.price, description:i.description }))
    setSaving(true)
    try {
      const res = await invoiceAPI.create({ invoiceNumber:form.invoiceNumber, customer:form.customer||undefined, status:invoiceStatus, paymentMode, items:payloadItems, invoiceDate:form.invoiceDate })
      const body = res.data || res
      const invoice = body.data?.invoice || body.invoice
      const customerDoc = invoice?.customer ? customers.find(c=>c._id===invoice.customer)||null : null
      openReceiptPrintWindow({
        invoice: { ...invoice, customer: customerDoc },
        company,
        customer: customerDoc,
        cashierName: user?.name || user?.email || '',
        paymentMode,
      })
      setLastInvoiceNumber(invoice?.invoiceNumber || form.invoiceNumber)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      resetForm()
      setItemLookupQuery('')
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create invoice')
    } finally { setSaving(false) }
  }

  const selectedCustomer = useMemo(()=>customers.find(c=>c._id===form.customer)||null, [customers, form.customer])
  const filteredProducts = useMemo(()=>{
    const q = itemLookupQuery.trim().toLowerCase()
    if (!q) return products
    return products.filter(p=>String(p?.name||'').toLowerCase().includes(q))
  }, [products, itemLookupQuery])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-primary-50 p-3">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-2 right-2 z-50 bg-emerald-600 text-white px-2.5 py-1 rounded shadow-lg flex items-center gap-1 text-xs">
          <CheckCircle className="h-3 w-3" />
          <div>
            <p className="font-semibold">Bill #{lastInvoiceNumber} Created!</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-[360px,1fr] gap-2 h-[calc(100vh-4rem)]">
        {/* Product Lookup */}
        <aside className="bg-white p-3 rounded-md shadow-sm border border-slate-200 flex flex-col">
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
              <Package className="h-4 w-4 text-indigo-600" />
              Products
            </h2>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input 
                className="w-full rounded border border-gray-300 bg-white pl-9 pr-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                value={itemLookupQuery} 
                onChange={e=>setItemLookupQuery(e.target.value)} 
                placeholder="Search..." 
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto -mx-1 px-1 scrollbar-thin" style={{maxHeight: 'calc(100vh - 180px)'}}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
                <p className="text-sm">Loading...</p>
              </div>
            ) : filteredProducts.length ? filteredProducts.map(p=>{
              const unitLabel = formatUnitLabel(p.unit)
              return (
                <button
                  key={p._id}
                  type="button"
                  onClick={()=>addProductToInvoice(p)}
                  className="w-full text-left px-3 py-2 mb-1 border border-slate-200 rounded-md hover:bg-indigo-50 hover:border-indigo-300 transition-colors group"
                  title={`Add ${p.name}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 truncate">{p.name}</div>
                      <div className="text-xs text-slate-500 truncate">{unitLabel}</div>
                    </div>
                    <div className="text-sm font-bold text-slate-900">{formatCurrency(p.price)}</div>
                  </div>
                </button>
              )
            }) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <ShoppingCart className="h-10 w-10 mb-2" />
                <p className="text-sm">No products found</p>
              </div>
            )}
          </div>
        </aside>

        {/* Invoice Form */}
        <div className="bg-white p-3 rounded-md shadow-sm border border-slate-200 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200">
            <div className="flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">New Bill</h2>
            </div>
            <div className="bg-indigo-50 px-2 py-0.5 rounded">
              <span className="text-xs font-semibold text-indigo-700">#{form.invoiceNumber}</span>
            </div>
          </div>

          <div className="grid grid-cols-[1.5fr,0.4fr,0.4fr,0.5fr,0.6fr] gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded mb-1.5">
            <div>ITEM</div>
            <div className="text-right">QTY</div>
            <div>UNIT</div>
            <div className="text-right">PRICE</div>
            <div className="text-right">AMT</div>
          </div>

          <div className="mt-1 flex-1 min-h-0 overflow-y-auto pr-1 space-y-1 scrollbar-thin" style={{maxHeight: 'calc(100vh - 320px)'}}>
            {form.items.map((item,idx)=>(
              <div key={idx} className="grid grid-cols-[1.5fr,0.4fr,0.4fr,0.5fr,0.6fr] gap-1.5 items-center py-1.5 px-2 border border-slate-200 rounded hover:bg-slate-50">
                <input
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={item.description}
                  onChange={e=>handleItemChange(idx,'description',e.target.value)}
                  placeholder="Item"
                  required
                />
                <input
                  type="number"
                  min="0"
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={item.quantity}
                  onChange={e=>handleItemChange(idx,'quantity',e.target.value)}
                  required
                />
                <select
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={item.unit||'number'}
                  onChange={e=>handleItemChange(idx,'unit',e.target.value)}
                  disabled={Boolean(item.product)}
                >
                  <option value="number">number</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="l">l</option>
                  <option value="ml">ml</option>
                </select>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={item.price}
                  onChange={e=>handleItemChange(idx,'price',e.target.value)}
                  required
                />
                <div className="flex items-center justify-end gap-0.5">
                  <div className="text-right font-bold text-slate-900 text-sm flex-1">{formatCurrency(item.quantity*item.price)}</div>
                  <button
                    type="button"
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    onClick={()=>handleRemoveItem(idx)}
                    disabled={form.items.length===1}
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <button 
                type="button" 
                onClick={handleAddItem} 
                className="w-full bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200 rounded px-3 py-1.5 text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>
          </div>

          {/* Customer & Total */}
          <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-0.5 mb-1">
                  <User className="h-3 w-3" />
                  Customer
                </label>
                <select value={form.customer} onChange={e=>setForm(prev=>({...prev, customer:e.target.value}))} className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                  <option value="">Walk-in</option>
                  {customers.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-0.5 mb-1">
                  <Phone className="h-3 w-3" />
                  Phone
                </label>
                <input value={selectedCustomer?.phone||''} readOnly className="w-full rounded border border-gray-300 bg-slate-100 px-2.5 py-1.5 text-sm" placeholder="—" />
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-300 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">Total</div>
              <div className="text-right text-xl font-bold text-indigo-700">{formatCurrency(totals.total)}</div>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2 items-end">
              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-0.5 mb-1">
                  <CreditCard className="h-3 w-3" />
                  Payment
                </label>
                <select value={paymentMode} onChange={e=>setPaymentMode(e.target.value)} className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="upi">📱 UPI</option>
                  <option value="credit">📝 Credit</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={resetForm} 
                  className="flex-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded px-3 py-1.5 text-sm font-semibold"
                >
                  Clear
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded px-3 py-1.5 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Receipt className="h-4 w-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
