# BillMaster – Client-Ready UI/UX Blueprint

This blueprint describes the intended production-ready layout, navigation, and page structure for BillMaster (Invoices + Stock + Data Entry). It’s written to be shareable with a client and to keep implementation consistent across the app.

## Global Layout (Authenticated)

**Shell**
- Left sidebar (desktop) + top header (all sizes)
- Header contains: Brand + Logout
- Mobile: header shows a compact nav row (same routes as sidebar)

**Primary Navigation**
- Dashboard
- Customers
- Products
- Stock (Inventory)
- Invoices
- Cash In
- Reports

**Page Structure Standard**
- Page title + subtitle
- Primary action button (when relevant)
- Content area uses “cards” for sections
- Tables use a consistent component: sortable headers, zebra rows, hover highlight

## Dashboard

**Purpose**: Business overview + fast navigation.

**Sections**
- Summary KPI cards: Paid revenue, Outstanding, Total invoices
- Status breakdown: Draft, Sent, Paid, Overdue
- Counts: Customers, Products
- Recent activity table: Recent invoices
- Quick actions: Cash In, Stock, Invoices

## Customers

**Purpose**: Manage customer master data.

**Table**
- Columns: Name, Email, Phone, City, ZIP, Actions
- Search: single search box filters table
- Actions: Edit (loads into form), Delete (confirm)

**Form**
- Fields: Name (required), Email, Phone, Address, City, ZIP
- Mode: Add vs Edit (same form)

## Products

**Purpose**: Manage product catalog for invoicing.

**Table**
- Columns: Name, SKU, Price, Description, Actions
- Search: single search box filters table
- Actions: Edit (loads into form), Delete (confirm)

**Form**
- Fields: Name (required), SKU, Price, Description
- Mode: Add vs Edit (same form)

## Stock (Inventory / Data Entry)

**Purpose**: Track inventory items with profit calculations.

**Auto Calculations**
- Profit = Selling Price − Purchase Price
- Profit % = Profit / Purchase Price × 100 (when purchase price > 0)
- Stock Value = Quantity × Selling Price

**Form**
- Fields: Company, Product, Variant
- Quantity input + Unit selector
- Purchase Price, Selling Price
- Mode: Add vs Edit (same form)

**Table**
- Columns: Company, Product, Variant, Purchase Qty, Purchase, Selling, Profit, Profit %, Stock Value, Actions
- Search: single search box filters table
- Actions: Edit (loads into form), Delete (confirm)

## Invoices

**Purpose**: Create invoices with totals and status tracking.

**Invoice Creation Form**
- Invoice Number (required)
- Customer selection (required)
- Dates: Invoice Date, Due Date
- Status: Draft / Sent / Paid / Overdue
- Tax Rate (%) and Discount (%)
- Items:
  - Product select (optional)
  - Item name/description (required)
  - Quantity, Price
  - Line total (auto)

**Totals (Auto)**
- Subtotal = sum(qty × price)
- Tax Amount = Subtotal × Tax Rate / 100
- Discount Amount = Subtotal × Discount / 100
- Total = Subtotal + Tax Amount − Discount Amount

**Invoice List Table**
- Search (invoice # / customer / status)
- Status filter dropdown
- Columns: Invoice #, Customer, Status, Subtotal, Total

## Reports

**Purpose**: Business metrics and quick exports.

**Sections**
- KPI cards: Customers, Products, Invoices
- Status totals: Paid / Unpaid / Overdue
- Recent invoices table

**Export Options**
- Export CSV for Recent Invoices

## Style Rules (Consistency)

- Use existing Tailwind tokens and shared utility classes:
  - `card`, `btn-primary`, `btn-secondary`, `input-field`, `select-field`, `textarea-field`
- Typography
  - Titles: bold, clear hierarchy
  - Labels: consistent size/weight, no cramped forms
- Spacing
  - Sections separated with consistent vertical rhythm (`space-y-*`)
  - Tables inside cards with consistent padding
- Responsiveness
  - Sidebar only on large screens
  - Forms collapse to 1 column on small screens
  - Tables horizontally scroll as needed
