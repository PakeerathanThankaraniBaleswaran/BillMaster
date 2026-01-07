import { useEffect, useMemo, useState } from 'react'
import { companyAPI, customerAPI, invoiceAPI, productAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'

const newItem = () => ({ product: '', description: '', quantity: 1, unit: 'number', price: 0 })
const RECEIPT_WIDTH_MM = 80

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const formatReceiptMoney = (value) => (Number(value || 0).toFixed(2))
const formatReceiptDate = (value) => {
  const d = value ? new Date(value) : new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

const tryOpenReceiptWindow = () => {
  try { return window.open('', '_blank', 'width=420,height=720') }
  catch { return null }
}

const openReceiptPrintWindow = ({ invoice, company, customer, cashierName, paymentMode, printWindow }) => {
  const w = printWindow || tryOpenReceiptWindow()
  if (!w || w.closed) { alert('Allow pop-ups to print'); return }

  const companyName = company?.businessName || 'SHOP'
  const companyAddress = [company?.address, company?.city, company?.state].filter(Boolean).join(', ')
  const companyPhone = company?.phoneNo || ''
  const customerName = customer?.name || 'CASH'
  const billNo = invoice?.invoiceNumber || ''
  const dateText = formatReceiptDate(invoice?.invoiceDate || invoice?.createdAt)
  const payMode = String(paymentMode || 'cash').toUpperCase()
  const items = Array.isArray(invoice?.items) ? invoice.items : []

  const rows = items.map((it, i) => {
    const name = escapeHtml(it?.description || '')
    const qty = formatReceiptMoney(it?.quantity)
    const price = formatReceiptMoney(it?.price)
    const amt = formatReceiptMoney(it?.total ?? (Number(it?.quantity || 0) * Number(it?.price || 0)))
    return `<tr>
      <td>${i + 1}</td>
      <td>${name}</td>
      <td style="text-align:right">${qty}</td>
      <td style="text-align:right">${price}</td>
      <td style="text-align:right">${amt}</td>
    </tr>`
  }).join('')

  const totalText = formatReceiptMoney(invoice?.total)

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Bill ${escapeHtml(billNo)}</title>
    <style>
      body { font-family: monospace; font-size:12px; width: ${RECEIPT_WIDTH_MM}mm; margin:0 auto; }
      .center { text-align:center; }
      table { width:100%; border-collapse: collapse; }
      th, td { padding:3px 0; font-size:12px; }
      th { border-bottom:1px solid #000; text-align:left; }
      hr { border:0; border-top:1px dashed #000; margin:6px 0; }
      .total { font-weight:bold; font-size:13px; }
      .footer { margin-top:8px; text-align:center; color:#555; }
    </style>
  </head>
  <body>
    <div class="center"><strong>${escapeHtml(companyName)}</strong></div>
    ${companyAddress ? `<div class="center">${escapeHtml(companyAddress)}</div>` : ''}
    ${companyPhone ? `<div class="center">${escapeHtml(companyPhone)}</div>` : ''}
    <hr />
    <div>Customer: ${escapeHtml(customerName)}</div>
    <div>Bill No: ${escapeHtml(billNo)}</div>
    <div>Date: ${escapeHtml(dateText)}</div>
    <hr />
    <table>
      <thead>
        <tr>
          <th>S.</th>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <hr />
    <div class="total">Grand Total: ${totalText}</div>
    <div class="total">Payment Mode: ${payMode}</div>
    <div class="footer">Thank you!</div>
  </body>
  </html>
  `
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { try { w.print(); w.onafterprint = () => w.close() } catch {} }, 250)
}

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

    const payloadItems = filteredItems.map(i=>({ product:i.product||undefined, quantity:i.quantity, unit:i.unit||'number', price:i.price, description:i.description }))
    setSaving(true)
    try {
      const res = await invoiceAPI.create({ invoiceNumber:form.invoiceNumber, customer:form.customer||undefined, status:form.status, paymentMode, items:payloadItems, invoiceDate:form.invoiceDate })
      const body = res.data || res
      const invoice = body.data?.invoice || body.invoice
      const customerDoc = invoice?.customer ? customers.find(c=>c._id===invoice.customer)||null : null
      openReceiptPrintWindow({ invoice, company, customer:customerDoc, cashierName:user?.name||user?.email||'', paymentMode })
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
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-4">
      <form onSubmit={handleSubmit} className="grid grid-cols-[360px,1fr] gap-4">
        {/* Product Lookup */}
        <aside className="bg-white p-4 rounded border border-slate-200 flex flex-col">
          <input className="input-field mb-2" value={itemLookupQuery} onChange={e=>setItemLookupQuery(e.target.value)} placeholder="Search product..." />
          <div className="flex-1 overflow-y-auto">
            {loading ? <div className="text-sm text-slate-500 px-2 py-2">Loading...</div> : filteredProducts.length ? filteredProducts.map(p=>{
              const unitLabel = formatUnitLabel(p.unit)
              return (
                <button
                  key={p._id}
                  type="button"
                  onClick={()=>addProductToInvoice(p)}
                  className="w-full text-left px-3 py-3 border-b border-slate-100 hover:bg-slate-50"
                  title={`${p.name} (${unitLabel})`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{p.name}</div>
                      <div className="text-xs text-slate-500 truncate">Unit: {unitLabel}</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 whitespace-nowrap">{formatCurrency(p.price)}</div>
                  </div>
                </button>
              )
            }):<div className="text-sm text-slate-500 px-2 py-2">No products found</div>}
          </div>
        </aside>

        {/* Invoice Form */}
        <div className="bg-white p-4 rounded border border-slate-200 flex flex-col">
          <div className="overflow-y-auto flex-1">
            {form.items.map((item,idx)=>(
              <div key={idx} className="grid grid-cols-[1.5fr,0.5fr,0.5fr,0.5fr,0.5fr] gap-2 items-end mb-2">
                <input className="input-field" value={item.description} onChange={e=>handleItemChange(idx,'description',e.target.value)} placeholder="Item name" required />
                <input type="number" min="0" className="input-field text-right" value={item.quantity} onChange={e=>handleItemChange(idx,'quantity',e.target.value)} required />
                <select className="select-field" value={item.unit||'number'} onChange={e=>handleItemChange(idx,'unit',e.target.value)} disabled={Boolean(item.product)}>
                  <option value="number">number</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="l">l</option>
                  <option value="ml">ml</option>
                </select>
                <input type="number" min="0" className="input-field text-right" value={item.price} onChange={e=>handleItemChange(idx,'price',e.target.value)} required />
                <div className="flex items-center justify-between">
                  <div className="text-right font-semibold w-full">{formatCurrency(item.quantity*item.price)}</div>
                  <button type="button" className="text-xs text-rose-600" onClick={()=>handleRemoveItem(idx)} disabled={form.items.length===1}>Remove</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={handleAddItem} className="btn-secondary mb-2">+ Add Item</button>
          </div>

          {/* Customer & Total */}
          <div className="mt-4 border-t border-slate-200 pt-2">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>Customer</div>
              <select value={form.customer} onChange={e=>setForm(prev=>({...prev, customer:e.target.value}))} className="select-field">
                <option value="">Cash</option>
                {customers.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>Phone</div>
              <input value={selectedCustomer?.phone||''} readOnly className="input-field" placeholder="—" />
            </div>
            <div className="grid grid-cols-2 gap-2 font-semibold text-lg">
              <div>Total</div>
              <div className="text-right">{formatCurrency(totals.total)}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 items-center mt-2">
              <div>Payment Mode</div>
              <select value={paymentMode} onChange={e=>setPaymentMode(e.target.value)} className="select-field">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            <div className="flex gap-2 mt-4">
              <button type="button" onClick={resetForm} className="btn-secondary flex-1">Clear</button>
              <button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md">
                {saving ? 'Generating...' : 'Generate Bill'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
