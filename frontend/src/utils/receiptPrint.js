const RECEIPT_WIDTH_MM = 80

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const formatReceiptMoney = (value) => Number(value || 0).toFixed(2)

const formatReceiptDate = (value) => {
  const d = value ? new Date(value) : new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

const tryOpenReceiptWindow = () => {
  try {
    return window.open('', '_blank', 'width=420,height=720')
  } catch {
    return null
  }
}

export const openReceiptPrintWindow = ({
  invoice,
  company,
  customer,
  cashierName,
  paymentMode,
  printWindow,
}) => {
  const w = printWindow || tryOpenReceiptWindow()
  if (!w || w.closed) {
    alert('Allow pop-ups to print')
    return
  }

  const companyName = company?.businessName || 'SHOP'
  const companyAddress = [company?.address, company?.city, company?.state].filter(Boolean).join(', ')
  const companyPhone = company?.phoneNo || ''
  const customerName = customer?.name || 'CASH'
  const customerPhone = customer?.phone || ''
  const billNo = invoice?.invoiceNumber || ''
  const dateText = formatReceiptDate(invoice?.invoiceDate || invoice?.createdAt)
  const payMode = String(paymentMode || 'cash').toUpperCase()
  const items = Array.isArray(invoice?.items) ? invoice.items : []

  const rows = items
    .map((it, i) => {
      const name = escapeHtml(it?.description || '')
      const qty = formatReceiptMoney(it?.quantity)
      const price = formatReceiptMoney(it?.price)
      const amt = formatReceiptMoney(
        it?.total ?? Number(it?.quantity || 0) * Number(it?.price || 0)
      )
      return `<tr>
      <td>${i + 1}</td>
      <td>${name}</td>
      <td style="text-align:right">${qty}</td>
      <td style="text-align:right">${price}</td>
      <td style="text-align:right">${amt}</td>
    </tr>`
    })
    .join('')

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
    ${customerPhone ? `<div>Phone: ${escapeHtml(customerPhone)}</div>` : ''}
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
    ${cashierName ? `<div class="footer">Cashier: ${escapeHtml(cashierName)}</div>` : '<div class="footer">Thank you!</div>'}
  </body>
  </html>
  `

  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => {
    try {
      w.print()
      w.onafterprint = () => w.close()
    } catch {
      // ignore
    }
  }, 250)
}
