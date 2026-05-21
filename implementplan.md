# 🏥 MedCare — Master Build Prompt
## Complete Pharmacy Management SaaS Platform
### Version 1.0 | Multi-Tenant | Web-First

---

> **Vision:** MedCare is India's most modern, cloud-native, multi-tenant pharmacy management SaaS platform.
> Better than Marg (offline, desktop-only), smarter than PharmacyPro (no AI), and more powerful than Vyapar (generic, not pharma-specific).
> MedCare is built for the Indian chemist — simple enough for a village shop, powerful enough for a pharmacy chain.

---

## 📋 TABLE OF CONTENTS

1. Product Overview
2. User Roles & Panels
3. Tech Stack (Full)
4. Database Schema (Supabase/PostgreSQL)
5. Feature Modules — Complete Specification
6. Page Architecture (All Routes)
7. UI/UX Design System
8. API Endpoints
9. Third-Party Integrations
10. Security & Compliance
11. Phased Build Plan (8 Weeks)
12. Prompt Instructions for AI Agent

---

## 1. 🎯 PRODUCT OVERVIEW

**Brand Name:** MedCare
**Tagline:** "Dawa ka hisaab, aasaan"
**Logo Concept:** A green cross inside a clean hexagon with "MedCare" in modern sans-serif
**Primary Color:** #00A878 (Medical Green) | **Accent:** #FF6B35 (Alert Orange) | **Dark:** #0D1B2A

**What makes MedCare different from Marg/Vyapar:**
- ✅ 100% Cloud-based SaaS — works on any browser, any device
- ✅ True Multi-tenant — one Admin manages hundreds of shops
- ✅ Camera Barcode Scan — no extra hardware needed
- ✅ AI-powered smart billing (2-3 letter medicine suggestions)
- ✅ WhatsApp bill sharing built-in
- ✅ Schedule H/H1 drug compliance tracking
- ✅ Modern UI — not a 2005 desktop feel
- ✅ PWA support — installable on Android/iOS like an app

---

## 2. 👥 USER ROLES & PANELS

### ROLE 1: SUPER ADMIN (Platform Owner = You)
**Access:** `/admin/*`
- Manages all registered shops/pharmacies
- Subscription & billing management
- Platform-wide analytics
- Medicine master database management
- GST slab configuration
- Add/remove shopkeepers
- View any shop's data
- Send platform-wide notifications
- Revenue dashboard (how many shops, MRR, etc.)

### ROLE 2: SHOP ADMIN (Pharmacy Owner)
**Access:** `/shop/*`
- Registers their own pharmacy
- Full access to their shop's all modules
- Can add staff/counter users
- Can set role-based permissions for staff
- Full billing, inventory, reports
- Supplier management
- Customer management

### ROLE 3: STAFF / COUNTER USER
**Access:** `/shop/billing` + limited modules
- Billing only (POS screen)
- Can view stock
- Cannot see financial reports (unless permitted)
- Cannot delete records

### ROLE 4: PHARMACIST (Optional role)
- Can view prescription records
- Can flag Schedule H drugs
- Cannot edit financial data

---

## 3. 🛠️ TECH STACK

### Frontend
```
Framework:        Next.js 14 (App Router) + TypeScript
Styling:          Tailwind CSS + shadcn/ui components
State Management: Zustand (global state) + React Query (server state)
Forms:            React Hook Form + Zod (validation)
Charts:           Recharts (analytics/dashboards)
Barcode Scanner:  ZXing-js (@zxing/library) — camera-based
                  QuaggaJS — barcode from image upload
PDF Generation:   @react-pdf/renderer — invoice PDF
Excel Export:     SheetJS (xlsx) — GST reports
WhatsApp:         wa.me deep link + WhatsApp Business API
Icons:            Lucide React
Notifications:    react-hot-toast + Sonner
Date Handling:    date-fns
```

### Backend / Database
```
Database:         Supabase (PostgreSQL) — multi-tenant with Row Level Security
Auth:             Supabase Auth (email/phone OTP)
ORM:              Prisma (type-safe queries)
Storage:          Supabase Storage (invoice PDFs, prescription images)
Real-time:        Supabase Realtime (low stock alerts, live billing)
Edge Functions:   Supabase Edge Functions (GST calculation, batch jobs)
Search:           PostgreSQL Full-Text Search (medicine autocomplete)
```

### Infrastructure
```
Hosting:          Vercel (frontend + API routes)
CDN:              Vercel Edge Network
Email:            Resend (transactional emails)
SMS:              Twilio / MSG91 (OTP, alerts)
Background Jobs:  Vercel Cron Jobs (daily expiry check, low stock)
Monitoring:       Sentry (error tracking)
Analytics:        Vercel Analytics + custom dashboard
```

### PWA (Phase 2)
```
PWA Config:       next-pwa
Service Worker:   Offline billing mode cache
Push Notifications: Web Push API
```

---

## 4. 🗄️ DATABASE SCHEMA (PostgreSQL / Supabase)

### Core Tables

```sql
-- TENANTS (Each pharmacy = one tenant)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,             -- "Sharma Medical Store"
  slug VARCHAR(100) UNIQUE NOT NULL,      -- "sharma-medical-ranchi"
  owner_name VARCHAR(255),
  phone VARCHAR(15) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  gstin VARCHAR(20),                      -- GST registration number
  drug_license_no VARCHAR(50),            -- DL No.
  logo_url TEXT,
  subscription_plan VARCHAR(50) DEFAULT 'free',  -- free/basic/pro/enterprise
  subscription_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  role VARCHAR(50) NOT NULL,  -- super_admin | shop_admin | staff | pharmacist
  name VARCHAR(255),
  phone VARCHAR(15),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',  -- granular permissions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEDICINE MASTER (Global database — pre-loaded 50,000+ medicines)
CREATE TABLE medicine_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255),
  brand_name VARCHAR(255),
  manufacturer VARCHAR(255),
  category VARCHAR(100),           -- Antibiotic, Painkiller, Vitamin, etc.
  composition TEXT,                -- Salt composition
  dosage_form VARCHAR(50),         -- Tablet, Syrup, Injection, Cream, etc.
  strength VARCHAR(50),            -- 500mg, 10ml, etc.
  pack_size VARCHAR(50),           -- 10 tablets, 100ml, etc.
  hsn_code VARCHAR(20),            -- HSN code for GST
  gst_rate DECIMAL(5,2) DEFAULT 12, -- 0, 5, 12, 18
  mrp DECIMAL(10,2),               -- Default MRP
  schedule VARCHAR(10),            -- H, H1, X, OTC, G
  barcode VARCHAR(100),            -- EAN/UPC barcode
  is_controlled BOOLEAN DEFAULT false,  -- Schedule H/H1/X
  requires_prescription BOOLEAN DEFAULT false,
  search_vector TSVECTOR,          -- For full-text search
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create search index
CREATE INDEX medicine_search_idx ON medicine_master USING GIN(search_vector);
CREATE INDEX medicine_name_trgm_idx ON medicine_master USING GIN(name gin_trgm_ops);

-- INVENTORY (Per tenant)
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  medicine_master_id UUID REFERENCES medicine_master(id),
  custom_medicine_name VARCHAR(255),   -- If not in master
  batch_no VARCHAR(100) NOT NULL,
  mfg_date DATE,
  expiry_date DATE NOT NULL,
  purchase_rate DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  sale_rate DECIMAL(10,2),             -- Can differ from MRP (discounts)
  gst_rate DECIMAL(5,2) NOT NULL,
  hsn_code VARCHAR(20),
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,    -- Alert when below this
  rack_location VARCHAR(50),           -- Physical shelf location
  supplier_id UUID REFERENCES suppliers(id),
  purchase_invoice_no VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUPPLIERS
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(15),
  email VARCHAR(255),
  address TEXT,
  gstin VARCHAR(20),
  drug_license_no VARCHAR(50),
  credit_days INTEGER DEFAULT 30,
  opening_balance DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMERS
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(15),
  email VARCHAR(255),
  address TEXT,
  doctor_name VARCHAR(255),            -- Regular doctor
  credit_limit DECIMAL(10,2) DEFAULT 0,
  outstanding_amount DECIMAL(10,2) DEFAULT 0,
  is_credit_customer BOOLEAN DEFAULT false,
  loyalty_points INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALES (Bills / Invoices)
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  invoice_no VARCHAR(100) UNIQUE NOT NULL,  -- Auto-generated: MED-2025-000001
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES customers(id),
  customer_name VARCHAR(255),          -- Walk-in customer
  customer_phone VARCHAR(15),
  prescription_no VARCHAR(100),
  doctor_name VARCHAR(255),
  payment_mode VARCHAR(50) DEFAULT 'cash',  -- cash/card/upi/credit
  payment_reference VARCHAR(100),           -- UPI ID, card last 4
  subtotal DECIMAL(12,2) NOT NULL,
  total_discount DECIMAL(12,2) DEFAULT 0,
  total_gst DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  amount_due DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'completed',   -- completed/partial/credit/cancelled
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALE ITEMS (Line items in a bill)
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  inventory_id UUID REFERENCES inventory(id),
  medicine_name VARCHAR(255) NOT NULL,
  batch_no VARCHAR(100),
  expiry_date DATE,
  quantity INTEGER NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  sale_rate DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  hsn_code VARCHAR(20),
  gst_rate DECIMAL(5,2) NOT NULL,
  gst_amount DECIMAL(10,2) NOT NULL,
  cgst DECIMAL(10,2),
  sgst DECIMAL(10,2),
  igst DECIMAL(10,2),
  taxable_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  is_schedule_h BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PURCHASES (Stock incoming from suppliers)
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  invoice_no VARCHAR(100),
  invoice_date DATE NOT NULL,
  received_date DATE DEFAULT CURRENT_DATE,
  subtotal DECIMAL(12,2),
  total_gst DECIMAL(12,2),
  total_amount DECIMAL(12,2),
  amount_paid DECIMAL(12,2) DEFAULT 0,
  amount_due DECIMAL(12,2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PURCHASE ITEMS
CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  inventory_id UUID REFERENCES inventory(id),
  medicine_name VARCHAR(255) NOT NULL,
  batch_no VARCHAR(100) NOT NULL,
  mfg_date DATE,
  expiry_date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  free_quantity INTEGER DEFAULT 0,
  purchase_rate DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  gst_rate DECIMAL(5,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALE RETURNS
CREATE TABLE sale_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  original_sale_id UUID REFERENCES sales(id),
  return_date DATE DEFAULT CURRENT_DATE,
  return_amount DECIMAL(12,2),
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PURCHASE RETURNS
CREATE TABLE purchase_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  original_purchase_id UUID REFERENCES purchases(id),
  supplier_id UUID REFERENCES suppliers(id),
  return_date DATE DEFAULT CURRENT_DATE,
  return_amount DECIMAL(12,2),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRESCRIPTIONS
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  customer_id UUID REFERENCES customers(id),
  doctor_name VARCHAR(255),
  doctor_reg_no VARCHAR(100),
  prescription_date DATE,
  image_url TEXT,                    -- Supabase Storage URL
  notes TEXT,
  sale_id UUID REFERENCES sales(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCHEDULE H REGISTER (Legal compliance)
CREATE TABLE schedule_h_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  sale_item_id UUID REFERENCES sale_items(id),
  medicine_name VARCHAR(255),
  quantity INTEGER,
  customer_name VARCHAR(255),
  customer_address TEXT,
  customer_id_type VARCHAR(50),       -- Aadhaar, PAN, etc.
  customer_id_no VARCHAR(50),
  doctor_name VARCHAR(255),
  doctor_reg_no VARCHAR(100),
  prescription_no VARCHAR(100),
  sale_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUBSCRIPTIONS (SaaS billing)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  plan VARCHAR(50),                   -- free/basic/pro/enterprise
  price DECIMAL(10,2),
  billing_cycle VARCHAR(20),          -- monthly/yearly
  start_date DATE,
  end_date DATE,
  payment_status VARCHAR(50),
  payment_id VARCHAR(255),            -- Razorpay payment ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  type VARCHAR(100),   -- expiry_alert | low_stock | payment_due | etc.
  title VARCHAR(255),
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. 📦 FEATURE MODULES — COMPLETE SPECIFICATION

---

### MODULE 1: SMART BILLING (POS Screen)
**Route:** `/shop/billing`
**This is the HERO feature — must be blazing fast**

#### Features:
1. **Medicine Autocomplete**
   - User types 2-3 letters → PostgreSQL trigram search fires instantly
   - Shows: Medicine Name | Batch | Expiry | Stock | MRP | Rate
   - Keyboard navigation (Arrow keys + Enter to select)
   - Color coding: Green (in stock) | Orange (low stock) | Red (near expiry)

2. **Barcode Scanning (2 modes)**
   - **Camera Scan:** Click camera icon → ZXing opens device camera → scans EAN/UPC barcode → auto-fills medicine in billing line
   - **Manual barcode entry:** Type barcode number in search box
   - **External scanner:** USB/Bluetooth barcode scanner works as keyboard input

3. **Billing Table (Line Items)**
   - Add multiple medicines
   - Each row: Medicine | Batch | Qty | MRP | Rate | Disc% | GST% | HSN | Amount
   - Inline editing — click any cell to edit
   - Quantity +/- buttons
   - Delete row button
   - Auto-calculates GST for each item separately (CGST + SGST for intrastate, IGST for interstate)
   - Real-time total calculation

4. **GST Calculation Engine**
   ```
   For each medicine:
   taxable_amount = (sale_rate × qty) - discount_amount
   
   If GST rate = 12%:
     CGST = taxable_amount × 6%
     SGST = taxable_amount × 6%
     Item total = taxable_amount + CGST + SGST
   
   GST slabs in India for medicines:
   - 0%  — Life-saving drugs (insulin, blood products, etc.)
   - 5%  — Ayurvedic medicines, some OTC
   - 12% — Most prescription medicines (bulk of inventory)
   - 18% — Medical devices, some consumables
   ```

5. **Bill Summary Panel**
   ```
   Subtotal:      ₹XXX.XX
   Discount (-):  ₹XXX.XX
   Taxable Amt:   ₹XXX.XX
   CGST (6%):     ₹XXX.XX
   SGST (6%):     ₹XXX.XX
   Total GST:     ₹XXX.XX
   Round Off:     ₹0.XX
   TOTAL:         ₹XXX.XX
   ```

6. **Customer Section**
   - Search existing customer by phone/name
   - Or add as walk-in (no registration needed)
   - Doctor name (for prescription medicines)
   - Prescription number

7. **Payment Options**
   - Cash, Card, UPI, Credit (partial payment)
   - Split payment (e.g., ₹200 cash + ₹300 UPI)
   - Credit customers → adds to outstanding

8. **Post-Billing Actions**
   - Print Invoice (thermal 58mm or A4)
   - Send via WhatsApp (direct wa.me link with PDF)
   - Send via Email
   - Save as Draft
   - New Bill (clear form)

9. **Keyboard Shortcuts**
   - `F2` — New bill
   - `F3` — Add medicine (focus search)
   - `F4` — Scan barcode
   - `F8` — Payment screen
   - `F9` — Print bill
   - `ESC` — Cancel/clear

10. **Promise Order** (Marg killer feature)
    - Medicine not in stock → "Promise Order" created
    - Customer gets notified when stock arrives

---

### MODULE 2: INVENTORY MANAGEMENT
**Route:** `/shop/inventory`

#### Sub-pages:
- `/shop/inventory` — Master stock list
- `/shop/inventory/add` — Add new stock (purchase entry shortcut)
- `/shop/inventory/expiry` — Expiry tracker
- `/shop/inventory/low-stock` — Low stock items
- `/shop/inventory/adjustment` — Stock adjustment (damage, theft, etc.)

#### Features:
1. **Stock List**
   - Table: Medicine | Brand | Batch | Mfg | Expiry | Stock Qty | Rate | MRP | GST | Supplier | Rack
   - Filter by: Category | Supplier | Expiry status | Stock status
   - Sort by any column
   - Search by name/barcode
   - Bulk actions: Update rate, Update reorder level

2. **Expiry Management**
   - Dashboard widget: Expiring in 30 days | 60 days | 90 days | Already expired
   - Color system: 🔴 Expired | 🟠 <30 days | 🟡 30-60 days | 🟢 Safe
   - Automatic daily cron job checks expiry → creates notification
   - One-click "Return to Supplier" for expiring stock

3. **Low Stock Alerts**
   - Reorder level set per item (default 10 units)
   - Dashboard alert badge
   - Auto-generate purchase order for low stock items
   - SMS/WhatsApp alert to shop admin

4. **Rack Management**
   - Assign physical rack location to each medicine
   - Filter by rack to find medicines quickly

5. **Stock Adjustment**
   - Damaged goods entry
   - Free samples
   - Opening balance entry
   - Full audit trail

6. **Medicine Search from Master Database**
   - When adding new medicine, search from 50,000+ medicine master
   - Auto-fills: HSN code, GST rate, composition, schedule
   - Override MRP/rate as needed

---

### MODULE 3: PURCHASE MANAGEMENT
**Route:** `/shop/purchases`

#### Features:
1. **Add Purchase**
   - Select supplier
   - Enter supplier invoice number & date
   - Add medicine items (same smart search as billing)
   - Per item: Batch No, Mfg Date, Expiry, Qty, Free Qty, Purchase Rate, MRP, GST, Disc%
   - Auto-updates inventory stock on save

2. **Purchase List**
   - All purchases with filter by supplier, date, payment status
   - Outstanding supplier payments highlighted

3. **Supplier Ledger**
   - Full transaction history with each supplier
   - Outstanding balance
   - Payment tracking

4. **Auto Purchase Order**
   - Based on low stock items → generate purchase order PDF
   - Send to supplier via WhatsApp/Email

5. **ERP-to-ERP Ordering** (Phase 2)
   - Digital ordering from supplier's system directly

---

### MODULE 4: SUPPLIER MANAGEMENT
**Route:** `/shop/suppliers`

- Add/Edit/Delete suppliers
- Supplier profile: Name, Phone, Email, GSTIN, Drug License, Credit Days
- Outstanding amounts per supplier
- Purchase history
- Return to supplier management

---

### MODULE 5: CUSTOMER MANAGEMENT
**Route:** `/shop/customers`

1. **Customer List** — Search, filter, export
2. **Customer Profile**
   - Purchase history (all bills)
   - Prescription history
   - Outstanding amount (credit customers)
   - Loyalty points
   - Frequently purchased medicines
3. **Credit Management**
   - Set credit limit per customer
   - Outstanding tracking
   - Payment collection entry
   - Overdue alerts
4. **Prescription Archive**
   - Scan & upload prescription images
   - Link to sale
   - Search by doctor name / prescription date

---

### MODULE 6: REPORTS & ANALYTICS
**Route:** `/shop/reports`

#### Sales Reports
- Daily/Weekly/Monthly/Yearly Sales Summary
- Sales by medicine / category / supplier
- Best selling medicines
- GST-wise sales report
- Payment mode analysis (cash/card/UPI split)
- Bill-wise detailed report

#### GST Reports (GSTN Compliant)
- GSTR-1 report (outward supplies) — exportable as JSON/Excel
- GSTR-3B summary
- HSN-wise summary
- Tax collected summary (CGST + SGST + IGST)
- Export to Excel for CA filing

#### Inventory Reports
- Stock status report
- Expiry report (batch-wise)
- Low stock report
- Stock movement report (item-wise)
- Supplier-wise purchase report

#### Financial Reports
- Profit & Loss Statement
- Purchase summary
- Sale returns / Purchase returns
- Outstanding receivables (from credit customers)
- Outstanding payables (to suppliers)

#### Schedule H/H1 Register
- Legal register for controlled drugs
- Filter by date range
- Printable in required format

---

### MODULE 7: ADMIN DASHBOARD
**Route:** `/shop/dashboard`

**Key Widgets:**
```
┌─────────────────────────────────────────────┐
│  Today's Sales: ₹24,500    Bills: 47        │
│  This Month: ₹3,40,000     Growth: +12%     │
├─────────────┬───────────────────────────────┤
│ ⚠️ Expiring  │  🔴 3 expired                 │
│   Soon      │  🟠 12 expiring < 30 days     │
│             │  🟡 28 expiring < 60 days     │
├─────────────┼───────────────────────────────┤
│ 📦 Low Stock│  18 items below reorder level │
├─────────────┼───────────────────────────────┤
│ 💰 Pending  │  Receivables: ₹18,200         │
│             │  Payables: ₹45,000            │
└─────────────┴───────────────────────────────┘
```

**Charts:**
- Sales trend (last 30 days bar chart)
- Top 10 selling medicines (horizontal bar)
- Payment mode split (donut chart)
- GST collected this month
- Category-wise sales (pie chart)

---

### MODULE 8: SUPER ADMIN PANEL
**Route:** `/admin`

1. **Platform Dashboard**
   - Total tenants/shops registered
   - Active vs inactive shops
   - Monthly Recurring Revenue (MRR)
   - New registrations this month
   - Geographic distribution of shops

2. **Shop Management**
   - View all registered shops
   - Activate/deactivate shops
   - View any shop's data (super admin override)
   - Subscription status of each shop
   - Last login, billing activity

3. **Medicine Master Management**
   - Add/Edit/Delete medicines from global database
   - Bulk import from Excel/CSV
   - Manage HSN codes and GST rates
   - Mark medicines as Schedule H/H1/X

4. **Subscription Management**
   - Subscription plans configuration
   - Manual plan assignment
   - Payment history
   - Send invoice to tenants

5. **Platform Analytics**
   - Total bills generated across platform
   - Total medicines sold
   - Revenue per tenant

6. **Announcements**
   - Send notifications to all shops
   - Platform maintenance alerts

---

### MODULE 9: AUTHENTICATION & ONBOARDING
**Routes:** `/login` | `/register` | `/onboarding`

1. **Registration Flow (New Pharmacy)**
   ```
   Step 1: Enter phone number → OTP verification
   Step 2: Basic info (Shop name, owner name, city)
   Step 3: License info (Drug License No., GSTIN)
   Step 4: Choose plan (Free trial / Paid)
   Step 5: → Redirected to dashboard (onboarding complete)
   ```

2. **Login**
   - Phone + OTP (primary, fastest)
   - Email + Password (fallback)
   - Remember device

3. **Free Trial**
   - 30-day free trial with all Pro features
   - No credit card required
   - 500 bills limit on free plan

---

### MODULE 10: SETTINGS
**Route:** `/shop/settings`

- **Shop Profile:** Name, address, logo, GSTIN, drug license
- **Invoice Settings:** Invoice prefix, starting number, terms & conditions, footer text
- **GST Settings:** State (CGST+SGST vs IGST), composition scheme toggle
- **Staff Management:** Add/remove staff, set permissions
- **Notification Settings:** Expiry alert days (30/60/90), low stock threshold
- **Data Management:** Export all data, backup
- **Subscription:** Current plan, upgrade, billing history

---

### MODULE 11: NOTIFICATIONS CENTER
**Route:** `/shop/notifications`

Types of notifications:
- 🔴 Medicine expired (immediate)
- 🟠 Medicine expiring in 30 days
- 📦 Stock below reorder level
- 💰 Customer payment overdue
- 📋 Supplier payment due
- ✅ Bill generated successfully
- 📱 WhatsApp sent successfully

Delivery channels:
- In-app notification bell (real-time via Supabase Realtime)
- Browser push notifications (PWA)
- SMS (critical alerts only — expiry, low stock)
- WhatsApp (for shop owner)

---

## 6. 🗺️ PAGE ARCHITECTURE (ALL ROUTES)

```
PUBLIC ROUTES
├── /                           Landing page
├── /features                  Features page
├── /pricing                   Subscription plans
├── /login                     Login
├── /register                  Register pharmacy
├── /onboarding                Setup wizard (post-register)

SHOP PANEL (/shop)
├── /shop/dashboard            Main dashboard
├── /shop/billing              POS Billing screen (HERO)
├── /shop/billing/history      All bills list
├── /shop/billing/[id]         Single bill view/print
├── /shop/inventory            Stock list
├── /shop/inventory/add        Add stock
├── /shop/inventory/[id]       Edit stock item
├── /shop/inventory/expiry     Expiry tracker
├── /shop/inventory/low-stock  Low stock list
├── /shop/inventory/adjustment Stock adjustment
├── /shop/purchases            Purchase list
├── /shop/purchases/add        Add purchase entry
├── /shop/purchases/[id]       Purchase detail
├── /shop/sale-returns         Sales returns
├── /shop/purchase-returns     Purchase returns
├── /shop/suppliers            Supplier list
├── /shop/suppliers/add        Add supplier
├── /shop/suppliers/[id]       Supplier profile + ledger
├── /shop/customers            Customer list
├── /shop/customers/add        Add customer
├── /shop/customers/[id]       Customer profile
├── /shop/prescriptions        Prescription archive
├── /shop/schedule-h           Schedule H/H1 register
├── /shop/reports              Reports hub
├── /shop/reports/sales        Sales reports
├── /shop/reports/gst          GST reports
├── /shop/reports/inventory    Inventory reports
├── /shop/reports/financial    P&L, outstanding
├── /shop/notifications        All notifications
├── /shop/settings             Shop settings
├── /shop/settings/staff       Staff management
├── /shop/settings/invoice     Invoice customization
└── /shop/settings/subscription Plan & billing

SUPER ADMIN PANEL (/admin)
├── /admin/dashboard           Platform dashboard
├── /admin/shops               All shops list
├── /admin/shops/[id]          Shop detail + override
├── /admin/medicine-master     Medicine database
├── /admin/medicine-master/add Add medicine
├── /admin/subscriptions       All subscriptions
├── /admin/analytics           Platform analytics
├── /admin/announcements       Send notifications
└── /admin/settings            Platform settings
```

---

## 7. 🎨 UI/UX DESIGN SYSTEM

### Design Philosophy
- **Clean + Clinical + Trustworthy** — not flashy, not corporate boring
- Inspired by: Linear, Stripe, Vercel dashboards (modern SaaS)
- Mobile-first responsive (most chemists will use on phone)
- High information density on desktop (like a POS system)
- Zero learning curve — if you can use WhatsApp, you can use MedCare

### Color System
```css
:root {
  --primary: #00A878;        /* Medical green */
  --primary-dark: #007A57;
  --primary-light: #E6F7F2;
  --accent: #FF6B35;         /* Alert orange */
  --danger: #EF4444;         /* Red — expired */
  --warning: #F59E0B;        /* Amber — near expiry */
  --success: #10B981;        /* Green — in stock */
  --text-primary: #0D1B2A;
  --text-secondary: #6B7280;
  --border: #E5E7EB;
  --bg: #F9FAFB;
  --card: #FFFFFF;
}
```

### Typography
```css
Font Stack:
  Display: "Plus Jakarta Sans" (headings, brand)
  Body: "DM Sans" (UI text, readable)
  Mono: "JetBrains Mono" (invoice numbers, batch codes)
```

### Key UI Components
- **Medicine Search Box** — Rounded, prominent, with scan icon
- **Billing Table** — Dense, spreadsheet-like, keyboard navigable
- **Dashboard Cards** — White cards with subtle shadow, colored left border per status
- **Alert Banners** — Sticky top bar for critical alerts (expiry, low stock)
- **Invoice Preview** — Split-screen: form left, PDF preview right

### Responsive Breakpoints
- Mobile (<768px): Full-screen billing POS, bottom navigation
- Tablet (768-1024px): Sidebar + content
- Desktop (>1024px): Full sidebar + multi-column dashboards

---

## 8. 🔌 API ENDPOINTS (Next.js API Routes)

```
POST /api/auth/register          Register new tenant
POST /api/auth/login             Login
POST /api/auth/otp               Send OTP

GET  /api/medicines/search       Autocomplete search (q= param)
GET  /api/medicines/barcode      Lookup by barcode
GET  /api/medicines/master       Medicine master list

GET  /api/inventory              Get tenant inventory
POST /api/inventory              Add stock
PUT  /api/inventory/[id]         Update stock
GET  /api/inventory/expiry       Expiring medicines
GET  /api/inventory/low-stock    Low stock items

POST /api/sales                  Create sale/bill
GET  /api/sales                  Get all sales
GET  /api/sales/[id]             Get single sale
POST /api/sales/[id]/return      Process return

POST /api/purchases              Create purchase
GET  /api/purchases              Get all purchases

GET  /api/customers              Customer list
POST /api/customers              Add customer
GET  /api/customers/[id]         Customer detail

GET  /api/suppliers              Supplier list
POST /api/suppliers              Add supplier

GET  /api/reports/sales          Sales report data
GET  /api/reports/gst            GST report data
GET  /api/reports/inventory      Inventory report data
GET  /api/reports/financial      Financial report data

GET  /api/notifications          Get notifications
POST /api/notifications/read     Mark as read

GET  /api/admin/tenants          All tenants (super admin)
POST /api/admin/tenants/[id]     Update tenant
```

---

## 9. 🔗 THIRD-PARTY INTEGRATIONS

| Service | Purpose | Priority |
|---------|---------|---------|
| MSG91 / Twilio | OTP SMS, Alert SMS | Phase 1 |
| WhatsApp Business API | Invoice sharing, alerts | Phase 1 |
| Razorpay | Subscription payments | Phase 1 |
| Resend | Email (invoices, alerts) | Phase 1 |
| Google Analytics | User behavior | Phase 1 |
| ZXing JS | Camera barcode scanner | Phase 1 |
| Sentry | Error tracking | Phase 1 |
| GSTN Portal | GST return upload | Phase 2 |
| Tally | Export to Tally XML | Phase 2 |
| e-Sanjeevani | Telemedicine integration | Phase 3 |
| Ayushman Bharat | ABHA integration | Phase 3 |

---

## 10. 🔐 SECURITY & COMPLIANCE

### Multi-Tenancy Security
```sql
-- Row Level Security on all tables
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON inventory
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### Data Security
- All data encrypted at rest (Supabase default AES-256)
- HTTPS only (Vercel enforced)
- API rate limiting (Vercel edge middleware)
- Audit logs for all critical actions (billing, deletion, price change)
- Session timeout: 8 hours (configurable)

### Pharma Compliance (India)
- **Schedule H Register** — Maintained digitally, printable
- **Schedule H1 Register** — Separate tracking with ID proof requirement
- **Schedule X** — Narcotic drugs special handling
- **Drug License validation** — During onboarding
- **GSTIN validation** — Verified against GSTN API

### Backup
- Daily automated backup of all tenant data
- 30-day backup retention
- One-click data export (CSV/Excel/JSON) for tenant

---

## 11. 📅 PHASED BUILD PLAN

### PHASE 1 — Foundation (Week 1-2)
**Goal: Working billing system**
- [ ] Project setup (Next.js 14, TypeScript, Tailwind, Supabase)
- [ ] Database schema creation + RLS policies
- [ ] Authentication (phone OTP + email)
- [ ] Tenant registration & onboarding flow
- [ ] Medicine master database load (50,000 medicines)
- [ ] Basic inventory management (add/edit/view)
- [ ] Smart billing screen (core POS)
- [ ] GST calculation engine
- [ ] Invoice PDF generation (A4 + thermal)

### PHASE 2 — Smart Features (Week 3-4)
**Goal: Make billing smarter and faster**
- [ ] Trigram search for medicine autocomplete
- [ ] Camera barcode scanning (ZXing integration)
- [ ] WhatsApp invoice sharing
- [ ] Customer management module
- [ ] Expiry alert system (cron job)
- [ ] Low stock alerts
- [ ] Dashboard with key metrics
- [ ] Supplier management
- [ ] Purchase entry

### PHASE 3 — Reports & Compliance (Week 5-6)
**Goal: Reports that replace manual registers**
- [ ] Full sales reports
- [ ] GST reports (GSTR-1, GSTR-3B)
- [ ] Inventory reports
- [ ] Schedule H/H1 digital register
- [ ] Prescription management
- [ ] Sale returns / Purchase returns
- [ ] Credit customer management
- [ ] Notification center

### PHASE 4 — Admin Panel & SaaS (Week 7-8)
**Goal: Make it a real SaaS product**
- [ ] Super admin panel (full)
- [ ] Multi-shop management
- [ ] Subscription system (Razorpay)
- [ ] Landing page (marketing site)
- [ ] Pricing page
- [ ] PWA configuration (installable)
- [ ] Performance optimization
- [ ] Security audit
- [ ] Beta testing with 5 pharmacies

---

## 12. 🤖 PROMPT INSTRUCTIONS FOR AI AGENT

When using this prompt with an AI agent (Cursor / Claude / v0 / Windsurf):

```
You are building MedCare — a multi-tenant pharmacy management SaaS platform for India.

TECH STACK:
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Prisma ORM
- Zustand + React Query
- ZXing for barcode scanning
- @react-pdf/renderer for invoices
- Recharts for charts
- Vercel deployment

BRAND: MedCare | Green #00A878 | Orange accent #FF6B35 | Dark #0D1B2A
FONTS: Plus Jakarta Sans (display) + DM Sans (body)

MULTI-TENANCY: Every database table has tenant_id. Use Supabase RLS to ensure 
complete data isolation between pharmacies. A shop admin can ONLY see their data.

KEY BUSINESS RULES:
1. GST is calculated per medicine (0%, 5%, 12%, 18% slabs)
2. For same-state: CGST = GST/2, SGST = GST/2
3. For inter-state: IGST = full GST rate
4. Schedule H drugs require doctor prescription + patient ID
5. Stock auto-decrements when bill is saved
6. Stock auto-increments when purchase is saved
7. All monetary values stored in paisa (integer) to avoid floating point errors
8. Invoice numbers: MED-[YEAR]-[6DIGIT] format (e.g., MED-2025-000001)
9. Batch numbers tracked for each stock entry
10. Expiry alert cron runs at 6 AM daily

BILLING SCREEN REQUIREMENTS:
- Must work entirely on keyboard (no mouse required for power users)
- Medicine search must respond in <200ms
- Barcode scan must add item within 1 second
- Bill save must complete within 2 seconds

UI REQUIREMENTS:
- Mobile-first (many chemists use phone)
- Minimum 44px touch targets on mobile
- Loading states on all async operations
- Error boundaries on all pages
- Optimistic UI updates for billing

BUILD ORDER:
1. Database setup + RLS + seed medicine master
2. Auth + tenant registration
3. Inventory CRUD
4. Billing POS screen
5. GST engine
6. PDF invoice generation
7. Purchase module
8. Reports
9. Admin panel
10. WhatsApp integration
11. Barcode camera scan
12. PWA setup

Always maintain type safety with TypeScript. Use Zod for all form validation.
Use React Query for all server state. Never store sensitive data in localStorage.
```

---

## APPENDIX A: SUBSCRIPTION PLANS

| Feature | Free | Basic (₹299/mo) | Pro (₹599/mo) | Enterprise (₹1499/mo) |
|---------|------|---------|-----|---------|
| Bills/month | 500 | 2,000 | Unlimited | Unlimited |
| Staff users | 1 | 3 | 10 | Unlimited |
| Reports | Basic | All | All | All + Custom |
| GST Reports | ❌ | ✅ | ✅ | ✅ |
| WhatsApp bills | ❌ | ✅ | ✅ | ✅ |
| Barcode scan | ✅ | ✅ | ✅ | ✅ |
| Schedule H register | ❌ | ✅ | ✅ | ✅ |
| Data export | ❌ | ✅ | ✅ | ✅ |
| Priority support | ❌ | ❌ | ✅ | ✅ |
| Multi-counter | ❌ | ❌ | 3 counters | Unlimited |
| API access | ❌ | ❌ | ❌ | ✅ |

## APPENDIX B: GST MEDICINE SLABS (India Reference)

| Category | GST Rate | Examples |
|---------|---------|---------|
| Life-saving drugs | 0% | Insulin, blood products, dialysis |
| Ayurvedic/Homeopathic | 0% or 5% | Chyawanprash, herbal medicines |
| OTC medicines | 5% | Basic OTC, supplements |
| Prescription medicines | 12% | Antibiotics, painkillers, most Rx drugs |
| Medical devices | 12-18% | BP machine, glucometer, syringes |
| Cosmetics/personal care | 18% | Sunscreen, hair products |

## APPENDIX C: INDIA DRUG SCHEDULE REFERENCE

| Schedule | Description | Special Handling |
|---------|-------------|-----------------|
| OTC / G | Over-the-counter | No prescription needed |
| H | Prescription-only | Doctor Rx required, register maintained |
| H1 | Stricter prescription | Rx required, ID proof, quantity limit |
| X | Narcotic/psychotropic | Special license, strict register |

---

*MedCare Master Build Prompt v1.0*
*Created for: Basant | Brand: MedCare*
*Research & Analysis: Marg ERP, Pharma24x7, PharmacyPro, Vyapar, eVitalRx*
*Date: May 2025*