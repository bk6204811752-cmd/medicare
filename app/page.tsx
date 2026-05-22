import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeIndianRupee,
  Barcode,
  BellRing,
  CalendarCheck,
  Check,
  ClipboardList,
  Download,
  FileSpreadsheet,
  HeartPulse,
  LayoutDashboard,
  LockKeyhole,
  MailCheck,
  MessageCircle,
  PackageSearch,
  ReceiptText,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Warehouse
} from "lucide-react";

const highlights: { title: string; body: string; icon: LucideIcon }[] = [
  { title: "GST billing", body: "Per-item CGST/SGST/IGST calculation using paisa-safe integer math.", icon: BadgeIndianRupee },
  { title: "Barcode ready", body: "Camera scan, manual barcode entry, and USB scanner friendly POS.", icon: Barcode },
  { title: "Compliance first", body: "Schedule H/H1 prescription prompts and printable registers.", icon: ShieldCheck }
];

const keyFeatures: { title: string; body: string; icon: LucideIcon; href: string; action: string }[] = [
  {
    title: "Fast POS billing",
    body: "Create invoices quickly with medicine search, discounts, tax splits, and multiple payment modes.",
    icon: ReceiptText,
    href: "/shop/billing",
    action: "Open billing"
  },
  {
    title: "Batch inventory",
    body: "Track batch number, rack, expiry, MRP, sale rate, supplier, and reorder level in one place.",
    icon: Warehouse,
    href: "/shop/inventory",
    action: "View inventory"
  },
  {
    title: "Expiry alerts",
    body: "Spot near-expiry and low-stock items early so the counter stays prepared.",
    icon: BellRing,
    href: "/shop/inventory/expiry",
    action: "Check expiries"
  },
  {
    title: "GST reports",
    body: "Review GSTR-friendly sales, purchase, tax, and margin summaries without spreadsheet chaos.",
    icon: FileSpreadsheet,
    href: "/shop/reports/gst",
    action: "See reports"
  },
  {
    title: "Customer records",
    body: "Maintain customer history, prescription notes, and repeat purchase details for smoother service.",
    icon: Users,
    href: "/shop/customers",
    action: "Manage customers"
  },
  {
    title: "Schedule H support",
    body: "Capture prescription details and keep printable registers ready for audit needs.",
    icon: ClipboardList,
    href: "/shop/schedule-h",
    action: "Open register"
  },
  {
    title: "Purchase management",
    body: "Record supplier purchases, update stock, and keep buying history connected to inventory.",
    icon: ShoppingCart,
    href: "/shop/purchases",
    action: "Track purchases"
  },
  {
    title: "Financial reports",
    body: "Read sales, inventory, and financial movement from dedicated report views.",
    icon: TrendingUp,
    href: "/shop/reports",
    action: "Open reports"
  },
  {
    title: "Invoice settings",
    body: "Configure invoice details and shop preferences from a single settings workspace.",
    icon: CalendarCheck,
    href: "/shop/settings/invoice",
    action: "Set invoice"
  }
];

const benefits = [
  "Reduce manual billing mistakes during rush hours.",
  "Know what to reorder before shelves run empty.",
  "Protect margin with batch-wise purchase and sale tracking.",
  "Keep staff aligned with simple pharmacy workflows.",
  "Serve customers faster with reusable customer and medicine records.",
  "Make GST and compliance reporting less stressful."
];

const mobileReadyFeatures: { title: string; body: string; icon: LucideIcon; href: string }[] = [
  {
    title: "Touch billing",
    body: "Large tap targets and quick module shortcuts make counter work easier on phone screens.",
    icon: Smartphone,
    href: "/shop/billing"
  },
  {
    title: "Approval login",
    body: "Shopkeepers register with email/password and can login only after admin approval.",
    icon: LockKeyhole,
    href: "/register"
  },
  {
    title: "Email OTP reset",
    body: "Forgot-password OTP and daily shop reports are ready for SMTP email delivery.",
    icon: MailCheck,
    href: "/forgot-password"
  }
];

const pricingPlans = [
  {
    name: "Free",
    price: "Rs. 0",
    note: "For new and single-counter pharmacies",
    items: ["500 bills/month", "1 staff user", "Barcode scan", "Basic reports"],
    href: "/register",
    action: "Start free"
  },
  {
    name: "Basic",
    price: "Rs. 299",
    note: "For growing shops with regular billing",
    items: ["2,000 bills/month", "3 staff users", "GST reports", "Customer records"],
    href: "/onboarding",
    action: "Choose Basic",
    featured: true
  },
  {
    name: "Pro",
    price: "Rs. 599",
    note: "For busy stores that need deeper control",
    items: ["Unlimited bills", "10 staff users", "Schedule H register", "Data export"],
    href: "/onboarding",
    action: "Choose Pro"
  }
];

const workflowSteps = [
  {
    title: "Bill at the counter",
    body: "Search medicine, scan barcode, add discount, and print the bill.",
    href: "/shop/billing",
    icon: ReceiptText
  },
  {
    title: "Update stock",
    body: "Add purchases, batches, expiry, rack location, and reorder levels.",
    href: "/shop/inventory",
    icon: Warehouse
  },
  {
    title: "Review reports",
    body: "Check sales, GST, financial, and inventory reports before closing.",
    href: "/shop/reports",
    icon: FileSpreadsheet
  },
  {
    title: "Handle compliance",
    body: "Keep prescriptions and Schedule H records organized for review.",
    href: "/shop/schedule-h",
    icon: ShieldCheck
  }
];

const moduleLauncher: { title: string; body: string; href: string; icon: LucideIcon }[] = [
  { title: "Dashboard", body: "Daily overview", href: "/shop/dashboard", icon: LayoutDashboard },
  { title: "New bill", body: "Counter POS", href: "/shop/billing", icon: ReceiptText },
  { title: "Inventory", body: "Batch stock", href: "/shop/inventory", icon: Warehouse },
  { title: "Add stock", body: "New medicine", href: "/shop/inventory/add", icon: PackageSearch },
  { title: "Low stock", body: "Reorder list", href: "/shop/inventory/low-stock", icon: BellRing },
  { title: "Expiry", body: "Near-expiry stock", href: "/shop/inventory/expiry", icon: CalendarCheck },
  { title: "Customers", body: "Buyer records", href: "/shop/customers", icon: Users },
  { title: "Add customer", body: "Create profile", href: "/shop/customers/add", icon: UserPlus },
  { title: "Purchases", body: "Supplier bills", href: "/shop/purchases", icon: ShoppingCart },
  { title: "Suppliers", body: "Vendor records", href: "/shop/suppliers", icon: ClipboardList },
  { title: "Returns", body: "Sale returns", href: "/shop/sale-returns", icon: RotateCcw },
  { title: "Reports", body: "Sales and GST", href: "/shop/reports", icon: FileSpreadsheet },
  { title: "Schedule H", body: "Compliance log", href: "/shop/schedule-h", icon: ShieldCheck },
  { title: "Prescriptions", body: "Patient scripts", href: "/shop/prescriptions", icon: HeartPulse },
  { title: "Settings", body: "Shop setup", href: "/shop/settings", icon: Settings }
];

const faqs = [
  {
    question: "Can I use Medicare for live billing?",
    answer: "Yes. The demo links open the actual billing, inventory, customer, report, and settings modules already present in the app."
  },
  {
    question: "Does barcode scanning work?",
    answer: "The product supports barcode-ready workflows through camera scan, manual barcode entry, and USB scanner-friendly input screens."
  },
  {
    question: "Is it useful for GST and Schedule H records?",
    answer: "Yes. The app includes GST report routes and a Schedule H workspace so regulated pharmacy records are easier to maintain."
  },
  {
    question: "Can a new shop start without paying?",
    answer: "Yes. The homepage and pricing page include a free plan path so a new pharmacy can try the system first."
  }
];

const testimonials = [
  {
    quote: "Billing feels faster and the expiry list helps us act before stock becomes dead money.",
    name: "Amit Sharma",
    role: "Pharmacy owner"
  },
  {
    quote: "The GST summary and batch-wise inventory save our team a lot of evening reconciliation work.",
    name: "Priya Nair",
    role: "Store manager"
  },
  {
    quote: "New staff learned the counter workflow quickly because everything is clear and pharmacy-specific.",
    name: "Rahul Mehta",
    role: "Retail chemist"
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="relative min-h-[88vh] overflow-hidden bg-[linear-gradient(rgba(13,27,42,0.78),rgba(13,27,42,0.62)),url('https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center text-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-med-green text-lg font-bold">+</span>
            <span className="font-display text-xl font-bold">Medicare</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-4 text-sm font-medium text-white/82 lg:flex">
              <a href="#features" className="hover:text-white">Features</a>
              <a href="#preview" className="hover:text-white">Preview</a>
              <a href="#modules" className="hover:text-white">Modules</a>
              <a href="#pricing" className="hover:text-white">Pricing</a>
              <a href="#workflow" className="hover:text-white">Workflow</a>
              <a href="#benefits" className="hover:text-white">Benefits</a>
              <a href="#testimonials" className="hover:text-white">Testimonials</a>
            </div>
            <Link href="/login" className="hidden text-sm font-medium text-white/85 hover:text-white md:inline">
              Login
            </Link>
            <Link href="/shop/dashboard" className="rounded-md bg-med-green px-4 py-2 text-sm font-semibold text-white hover:bg-med-greenDark">
              Open Demo
            </Link>
          </div>
        </nav>

        <div className="mx-auto flex min-h-[calc(88vh-84px)] max-w-7xl flex-col justify-center px-5 pb-24 pt-10">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Cloud pharmacy management for India</p>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight md:text-6xl">Medicare</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/86">
            Smart billing, GST, batch inventory, expiry alerts, and Schedule H registers in one browser-based workspace.
          </p>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
            <Link href="/shop/billing" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-med-green px-5 font-semibold text-white hover:bg-med-greenDark">
              Start billing <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#features" className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/35 px-5 font-semibold text-white hover:bg-white/10">
              Explore features
            </Link>
            <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/35 px-5 font-semibold text-white hover:bg-white/10">
              View free plan
            </Link>
          </div>
          <div className="mt-10 grid max-w-3xl gap-3 text-sm text-white/80 sm:grid-cols-3">
            <div className="rounded-lg border border-white/14 bg-white/8 p-4">
              <span className="block font-display text-2xl font-bold text-white">9+</span>
              working modules
            </div>
            <div className="rounded-lg border border-white/14 bg-white/8 p-4">
              <span className="block font-display text-2xl font-bold text-white">GST</span>
              ready reporting
            </div>
            <div className="rounded-lg border border-white/14 bg-white/8 p-4">
              <span className="block font-display text-2xl font-bold text-white">24/7</span>
              browser access
            </div>
          </div>
        </div>
      </section>

      <section className="-mt-16 mx-auto grid max-w-7xl gap-4 px-5 pb-16 md:grid-cols-3">
        {highlights.map(({ title, body, icon: Icon }) => (
          <Link key={title} href="#features" className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:border-med-green">
            <Icon className="h-6 w-6 text-med-green" />
            <h2 className="mt-4 font-display text-lg font-semibold text-med-navy">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
          </Link>
        ))}
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 pb-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-med-greenDark">Key features</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-med-navy md:text-4xl">Everything a pharmacy counter needs, without extra clutter</h2>
          <p className="mt-4 leading-7 text-slate-600">
            Medicare connects billing, stock, GST, prescriptions, and reports so daily work moves through one reliable system.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {keyFeatures.map(({ title, body, icon: Icon, href, action }) => (
            <Link key={title} href={href} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-med-green hover:shadow-soft">
              <Icon className="h-6 w-6 text-med-green" />
              <h3 className="mt-4 font-display text-lg font-semibold text-med-navy">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-med-greenDark">
                {action} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="rounded-lg border border-slate-200 bg-med-navy p-5 text-white shadow-soft sm:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Mobile ready</p>
              <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Built for shop counters, phones, and fast approvals</h2>
              <p className="mt-3 text-sm leading-6 text-white/72 sm:text-base">
                The system now supports email login, admin approval, OTP reset, daily email reports, and mobile shortcuts for daily shop work.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {mobileReadyFeatures.map(({ title, body, icon: Icon, href }) => (
                <Link key={title} href={href} className="group rounded-lg border border-white/12 bg-white/6 p-4 transition hover:bg-white/10">
                  <Icon className="h-5 w-5 text-emerald-200" />
                  <h3 className="mt-3 font-display font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/72">{body}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200">
                    Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="preview" className="bg-med-mist px-5 py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-med-greenDark">Live product preview</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-med-navy md:text-4xl">See how the pharmacy counter comes together</h2>
            <p className="mt-4 leading-7 text-slate-600">
              The preview mirrors the real app flow: billing happens on the left, stock and compliance signals stay visible, and reports are one click away.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/shop/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-med-green px-5 font-semibold text-white hover:bg-med-greenDark">
                Open dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/shop/inventory/low-stock" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-med-green px-5 font-semibold text-med-greenDark hover:bg-white">
                Low stock list <BellRing className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-med-greenDark">Today&apos;s counter</p>
                <h3 className="mt-1 font-display text-xl font-bold text-med-navy">Retail billing workspace</h3>
              </div>
              <span className="w-fit rounded-md bg-med-green/10 px-3 py-1 text-xs font-semibold text-med-greenDark">Live demo</span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[1.2fr_0.5fr_0.6fr] border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <span>Medicine</span>
                  <span>Qty</span>
                  <span>Total</span>
                </div>
                {[
                  ["Paracetamol 650", "2", "Rs. 64"],
                  ["Azithromycin 500", "1", "Rs. 118"],
                  ["ORS sachet", "4", "Rs. 80"]
                ].map(([medicine, quantity, total]) => (
                  <div key={medicine} className="grid grid-cols-[1.2fr_0.5fr_0.6fr] border-b border-slate-100 px-3 py-3 text-sm last:border-0 sm:px-4">
                    <span className="font-medium text-med-navy">{medicine}</span>
                    <span className="text-slate-500">{quantity}</span>
                    <span className="font-semibold text-med-navy">{total}</span>
                  </div>
                ))}
              </div>

              <div className="grid gap-3">
                {[
                  ["Bill total", "Rs. 262", "GST included"],
                  ["Low stock", "14 items", "Needs reorder"],
                  ["Expiry alerts", "8 batches", "Review this week"]
                ].map(([label, value, note]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-med-mist p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                    <p className="mt-2 font-display text-2xl font-bold text-med-navy">{value}</p>
                    <p className="mt-1 text-sm text-slate-500">{note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Link href="/shop/billing" className="rounded-lg bg-med-green px-4 py-3 text-center text-sm font-semibold text-white hover:bg-med-greenDark">
                Create bill
              </Link>
              <Link href="/shop/reports/gst" className="rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-med-greenDark hover:border-med-green">
                GST report
              </Link>
              <Link href="/shop/schedule-h" className="rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-med-greenDark hover:border-med-green">
                Schedule H
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-7xl px-5 py-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-med-greenDark">Module launcher</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-med-navy md:text-4xl">Open any working area directly</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Use the homepage as a quick launch board for billing, stock, returns, customers, compliance, reports, and settings.
            </p>
          </div>
          <Link href="/shop/dashboard" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border border-med-green px-5 font-semibold text-med-greenDark hover:bg-med-mist">
            Full dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {moduleLauncher.map(({ title, body, href, icon: Icon }) => (
            <Link key={title} href={href} className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-med-green hover:shadow-soft">
              <Icon className="h-5 w-5 text-med-green" />
              <h3 className="mt-3 font-display font-semibold text-med-navy">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-med-greenDark">
                Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="workflow" className="border-y border-slate-200 bg-white px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-med-greenDark">Functional workflow</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-med-navy md:text-4xl">Jump straight into the real pharmacy tasks</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Each step below opens a working area of the app, so the homepage now acts as a practical launchpad for daily operations.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map(({ title, body, href, icon: Icon }, index) => (
              <Link key={title} href={href} className="group rounded-lg border border-slate-200 bg-med-mist p-5 transition hover:-translate-y-1 hover:border-med-green hover:bg-white">
                <div className="flex items-center justify-between">
                  <Icon className="h-6 w-6 text-med-green" />
                  <span className="font-display text-sm font-bold text-slate-400">0{index + 1}</span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-med-navy">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-med-greenDark">
                  Open module <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-med-mist px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-med-greenDark">Pricing</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-med-navy md:text-4xl">Start free, upgrade when your shop grows</h2>
            </div>
            <Link href="/pricing" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border border-med-green px-5 font-semibold text-med-greenDark hover:bg-white">
              Compare plans <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-lg border bg-white p-6 shadow-sm ${plan.featured ? "border-med-green ring-2 ring-med-green/15" : "border-slate-200"}`}
              >
                {plan.featured ? (
                  <span className="inline-flex rounded-md bg-med-green/10 px-3 py-1 text-xs font-semibold text-med-greenDark">Popular</span>
                ) : null}
                <h3 className="mt-4 font-display text-xl font-semibold text-med-navy">{plan.name}</h3>
                <p className="mt-3 font-display text-3xl font-bold text-med-navy">
                  {plan.price}<span className="text-sm font-medium text-slate-500">/mo</span>
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{plan.note}</p>
                <ul className="mt-5 space-y-3 text-sm text-slate-600">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-med-green" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-5 font-semibold ${
                    plan.featured
                      ? "bg-med-green text-white hover:bg-med-greenDark"
                      : "border border-med-green text-med-greenDark hover:bg-med-green/5"
                  }`}
                >
                  {plan.action} <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="importance" className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-med-greenDark">Importance</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-med-navy md:text-4xl">Pharmacy work has no room for guesswork</h2>
          <p className="mt-4 leading-7 text-slate-600">
            A missed expiry, wrong tax split, forgotten prescription entry, or stock mismatch can cost money and trust. Medicare keeps these details visible while the team focuses on serving customers.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Faster", "billing during peak counter hours"],
            ["Clearer", "stock decisions with batch-level data"],
            ["Safer", "records for regulated medicine sales"]
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <Sparkles className="h-5 w-5 text-med-green" />
              <h3 className="mt-4 font-display text-xl font-semibold text-med-navy">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="benefits" className="bg-med-navy px-5 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Benefits</p>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">More control for owners, less friction for staff</h2>
            <p className="mt-4 leading-7 text-white/72">
              Medicare is built around the real rhythm of retail pharmacy: quick sales, strict records, stock pressure, and daily reconciliation.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex gap-3 rounded-lg border border-white/12 bg-white/6 p-4">
                <HeartPulse className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" />
                <p className="text-sm leading-6 text-white/82">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="mx-auto max-w-7xl px-5 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-med-greenDark">Testimonials</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-med-navy md:text-4xl">Built for the people behind the counter</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <p className="leading-7 text-slate-600">&quot;{testimonial.quote}&quot;</p>
              <div className="mt-6 border-t border-slate-100 pt-4">
                <h3 className="font-display font-semibold text-med-navy">{testimonial.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{testimonial.role}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="bg-med-mist px-5 py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-med-greenDark">FAQ</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-med-navy md:text-4xl">Common questions before you start</h2>
            <Link href="/shop/dashboard" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-med-green px-5 font-semibold text-white hover:bg-med-greenDark">
              Open full demo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <summary className="cursor-pointer list-none font-display text-lg font-semibold text-med-navy">
                  <span className="inline-flex w-full items-center justify-between gap-4">
                    {faq.question}
                    <MessageCircle className="h-5 w-5 shrink-0 text-med-green" />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-500">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-med-navy px-5 py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">Ready to run today&apos;s counter?</h2>
            <p className="mt-3 max-w-2xl text-white/72">
              Start with billing, check stock, review reports, or configure your invoice from the live app modules.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/shop/billing" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-med-green px-5 font-semibold text-white hover:bg-med-greenDark">
              Start billing <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/shop/reports" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/25 px-5 font-semibold text-white hover:bg-white/10">
              Reports <Download className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
