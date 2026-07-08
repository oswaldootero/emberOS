# EmberOS CRM & Sales Module

Customer management, invoicing, and analytics for the cigar wholesale
business. Built to scale to tens of thousands of customers/invoices
(server-side filtering, sorting, pagination everywhere) and to be
extended later with inventory, purchase orders, commissions, and
accounting.

## Data model (`prisma/schema.prisma`)

### Customer
Extended with structured fields; nothing was removed, so legacy rows
keep working.

| Group | Fields |
|---|---|
| Business | `businessName`, `dba`, `customerType` (RETAILER, LOUNGE, DISTRIBUTOR, ONLINE_CUSTOMER, EVENT_LEAD, OTHER), `status` (LEAD, PROSPECT, CONTACTED, SAMPLE_SENT, OPEN_ACCOUNT, ACTIVE_CUSTOMER, INACTIVE, LOST), `source` |
| Contact | `contactName`, `contactTitle`, `email`, `mobile`, `phone` (office) |
| Address | `street`, `city`, `state`, `zipCode`, `country` (legacy free-form `address` retained) |
| Sales info | `assignedToId` (sales rep → User), `paymentTerms`, `taxId`, `shippingMethod` |
| Meta | `tags[]`, `notes`, `lastContactDate`, `nextFollowupDate`, `archivedAt` (soft archive), `createdAt`, `updatedAt` |

Indexes: type, status, rep, follow-up date, archive flag, name, email.

### Sale (invoice)
One invoice per row; `invoiceNumber` is unique (`INV-<year>-NNNNN`,
allocated server-side with collision retry). Totals are **persisted**
(recomputed on every write) so lists and analytics never join items.

Fields: `customerId`, `invoiceDate`, `dueDate`, `status`
(DRAFT / SENT / PAID / PARTIAL / OVERDUE / CANCELLED), `subtotal`,
`discountTotal`, `taxTotal`, `shipping`, `grandTotal`, `amountPaid`,
`paidAt`, `notes` (customer-visible), `internalNotes`, `createdById`.

### SaleItem
`product` (denormalized name), optional `inventoryItemId` FK (future
auto-deduct/product reporting), `quantity`, `unitPrice`, `discountPct`,
`taxPct`, `lineTotal`, `sortOrder`. Line math:
`qty × price × (1 − disc%) × (1 + tax%)`; order-level discount and
shipping apply after the line rollup (see `computeTotals` in
`src/server/sales.ts` — mirrored client-side for live preview).

## Server layer

### Services (`import "server-only"`)
| File | Exports |
|---|---|
| `src/server/sales.ts` | `computeTotals`, `nextInvoiceNumber`, `loadSalesList` (filter/sort/paginate in SQL, page size 25), `loadSale`, `sweepOverdue` (flips SENT/PARTIAL past due → OVERDUE, called on list load) |
| `src/server/crm-analytics.ts` | `loadCRMAnalytics` (dashboard KPIs + 12-month series + retention + CLV), `loadCustomerAnalytics` (per-customer stats for the Analytics tab) |
| `src/server/crm.ts` | `loadCRMSnapshot` (legacy CRM landing rollups) |

### Server actions (`"use server"`)
| File | Actions |
|---|---|
| `src/server/actions/sales.ts` | `createSale`, `updateSale` (full replace + totals recompute), `markSalePaid`, `recordPayment` (partial → PAID when balance clears), `setSaleStatus` (SENT / CANCELLED), `duplicateSale` (new DRAFT + fresh number), `deleteSale` (admin, drafts only) |
| `src/server/actions/crm.ts` | `createCustomer`, `updateCustomer` (all new fields), `archiveCustomer` / `unarchiveCustomer` (soft), `deleteCustomer` (admin) |
| `src/server/actions/search.ts` | `globalSearch(q)` — customers by company/DBA/contact/email/phone/tag + sales by invoice number |
| `src/server/actions/business-lookup.ts` | `lookupBusinessInfo(name, hint?)` — OpenAI suggests address/phone with confidence; UI requires user confirmation before filling |

All actions: Zod validation → `requireUser()` → Prisma → `audit()` →
`revalidatePath`. Every mutation writes an AuditLog row, which is what
feeds the customer Activity timeline.

## Screens

| Route | What it is |
|---|---|
| `/crm` | Customer list: KPI row, search (name/contact/email/phone/tag), type + status filters, archived toggle, name/recency sort, 25-per-page pagination, inline status + follow-up editing |
| `/crm/new`, `/crm/[id]/edit` | Full customer form — Business / Contact / Address / Sales info / Notes sections, sales-rep picker, **AI lookup** button (type name → OpenAI suggests address → confirm to fill) |
| `/crm/[id]` | Customer profile: header (name, badges, lifetime revenue, outstanding, invoices, avg order) + tabs: **Overview** (contact, sales info, cards on file), **Sales** (invoice list), **Notes** (inline editable), **Activity** (audit timeline), **Analytics** (revenue trend, frequency, largest/avg order, first/latest purchase, CLV), **Orders (legacy)** — the old order + Helcim payment-link flow, shown only if legacy orders exist |
| `/sales` | Invoice list: status tab filters with counts, invoice/customer search, sortable columns (number, dates, total), pagination, outstanding + overdue stat tiles |
| `/sales/new`, `/sales/[id]/edit` | Invoice form: customer picker, dates, status, line-item editor (SKU auto-fill or custom product, qty/price/discount/tax per line), order discount + shipping, live totals |
| `/sales/[id]` | Invoice document view: bill-to block, line table, totals, notes; actions — Mark paid, Record payment (partial), Mark sent, Duplicate, Print (print CSS), PDF (placeholder), Void |
| `/crm/analytics` | Dashboard: 8 KPIs (customers, new this month, revenue, this month, avg invoice, avg revenue/customer, outstanding, retention %), revenue-by-month area chart, top-10 customers bar, customer growth, sales-by-type pie, invoice status breakdown, returning-vs-one-time, CLV top-20 table |
| Topbar | Global search (⌘K): customers + invoice numbers, keyboard navigable |

## Key components

| Component | Purpose |
|---|---|
| `src/components/sales/sale-form.tsx` | Line-item editor with live totals (mirrors server math) |
| `src/components/sales/sale-actions.tsx` | Paid/payment/void/duplicate/print buttons |
| `src/components/sales/status-badge.tsx` | Sale status → badge variant |
| `src/components/crm/customer-tabs.tsx` | Profile header + 6-tab layout |
| `src/components/crm/customer-form.tsx` | Full customer form + AI lookup confirm flow |
| `src/components/crm/analytics-charts.tsx` | Recharts wrappers (area/bar/pie), theme-aware |
| `src/components/shell/global-search.tsx` | Debounced ⌘K search dropdown |
| `src/components/ui/data-table.tsx` | URL-driven `SortableHeader` + `Pagination` for server-component tables |

## Seed data

`prisma/seed-crm.ts` — 12 realistic customers (FL/SC/TX/NY/NV/NC/TN mix
of retailers, lounges, distributors, online) and 29 invoices spread
over 12 months with PAID / SENT / PARTIAL / OVERDUE / DRAFT / CANCELLED
examples. Idempotent (matched by business name / invoice number).

```bash
set -a; source .env.local; set +a
npx tsx prisma/seed-crm.ts
```

## Extension points (already wired)

- **Inventory**: `SaleItem.inventoryItemId` FK exists; add auto-deduct in
  `createSale` the same way `createOrder` does it.
- **Accounting**: persisted totals + `amountPaid`/`paidAt` give a clean
  AR ledger; `sweepOverdue` centralizes aging.
- **Commissions**: sales rep lives on Customer (`assignedToId`); a
  commission table can reference `Sale.id`.
- **Attachments**: add an `Attachment` model referencing `Sale.id` and
  reuse the Supabase Storage helpers from the Asset Library.
- **PDF export**: the invoice page is print-styled; a real PDF can be
  generated from the same data via `@react-pdf/renderer` later.
