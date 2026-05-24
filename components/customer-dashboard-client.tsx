"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  CreditCard,
  ShoppingBag,
  Star,
  Calendar,
  Clock,
  Printer,
  Send,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowUpDown,
  TrendingUp,
  ChevronLeft
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type PurchaseItem = {
  id: string;
  medicine_name: string;
  batch_no: string;
  expiry_date: string;
  quantity: number;
  mrp_paisa: number;
  sale_rate_paisa: number;
  discount_percent: number;
  discount_paisa: number;
  hsn_code: string;
  gst_rate: number;
  gst_paisa: number;
  total_paisa: number;
};

type CustomerPurchase = {
  id: string;
  invoiceNo: string;
  date: string;
  createdAt: string;
  totalPaisa: number;
  paymentMode: string;
  subtotalPaisa: number;
  discountPaisa: number;
  taxablePaisa: number;
  cgstPaisa: number;
  sgstPaisa: number;
  igstPaisa: number;
  gstPaisa: number;
  roundOffPaisa: number;
  amountPaidPaisa: number;
  amountDuePaisa: number;
  status: string;
  items: PurchaseItem[];
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  doctorName: string | null;
  outstandingPaisa: number;
  loyaltyPoints: number;
};

export function CustomerDashboardClient({
  customer,
  purchases,
  tenantName
}: {
  customer: Customer;
  purchases: CustomerPurchase[];
  tenantName: string;
}) {
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"history" | "medicines">("history");
  
  // Sorting for medicines tab
  const [medSortKey, setMedSortKey] = useState<"qty" | "revenue" | "name">("qty");
  const [medSortOrder, setMedSortOrder] = useState<"asc" | "desc">("desc");

  const toggleInvoice = (id: string) => {
    setExpandedInvoices((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 1. Calculate KPI Stats
  const stats = useMemo(() => {
    const totalSpent = purchases.reduce((sum, p) => sum + p.totalPaisa, 0);
    const totalVisits = purchases.length;
    const lastVisit = purchases.length > 0 ? purchases[0].date : "Never";
    
    return {
      totalSpent,
      totalVisits,
      lastVisit
    };
  }, [purchases]);

  // 2. Filter Purchases
  const filteredPurchases = useMemo(() => {
    if (!searchTerm.trim()) return purchases;
    const query = searchTerm.toLowerCase();

    return purchases.filter((p) => {
      const invoiceMatch = p.invoiceNo.toLowerCase().includes(query);
      const dateMatch = p.date.includes(query);
      const paymentMatch = p.paymentMode.toLowerCase().includes(query);
      const medicineMatch = p.items.some(
        (item) =>
          item.medicine_name.toLowerCase().includes(query) ||
          item.batch_no.toLowerCase().includes(query)
      );

      return invoiceMatch || dateMatch || paymentMatch || medicineMatch;
    });
  }, [purchases, searchTerm]);

  // 3. Aggregate Medicine Purchases
  const medicineAggregates = useMemo(() => {
    const medMap: Record<string, {
      name: string;
      qty: number;
      revenue: number;
      lastBought: string;
    }> = {};

    purchases.forEach((p) => {
      p.items.forEach((item) => {
        const name = item.medicine_name;
        if (!medMap[name]) {
          medMap[name] = { name, qty: 0, revenue: 0, lastBought: p.date };
        }
        medMap[name].qty += item.quantity;
        medMap[name].revenue += item.total_paisa;
      });
    });

    const list = Object.values(medMap);

    list.sort((a, b) => {
      let comp = 0;
      if (medSortKey === "qty") comp = a.qty - b.qty;
      else if (medSortKey === "revenue") comp = a.revenue - b.revenue;
      else comp = a.name.localeCompare(b.name);
      return medSortOrder === "desc" ? -comp : comp;
    });

    return list;
  }, [purchases, medSortKey, medSortOrder]);

  const handleMedSort = (key: "qty" | "revenue" | "name") => {
    if (medSortKey === key) {
      setMedSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setMedSortKey(key);
      setMedSortOrder("desc");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper to format time
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to Customers */}
      <div>
        <Link
          href="/shop/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Customers
        </Link>
      </div>

      {/* ─── HERO & PROFILE CARD ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Card: Personal Profile details */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
            {/* Initials Avatar */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-med-green to-emerald-500 text-2xl font-bold text-white shadow-md">
              {getInitials(customer.name)}
            </div>

            <div className="space-y-2 flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-med-navy truncate">{customer.name}</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{customer.phone || "No phone number"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">{customer.email || "No email address"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">Dr: {customer.doctorName || "Not assigned"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">{customer.address || "No address saved"}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-100 mt-6 pt-4 flex justify-between items-center text-xs text-slate-400">
            <span>Customer ID: <code className="font-mono text-slate-500">{customer.id}</code></span>
            <Link
              href={`/shop/customers/add?id=${customer.id}`}
              className="font-bold text-med-greenDark hover:underline"
            >
              Edit Profile details
            </Link>
          </div>
        </div>

        {/* Right Card: Ledger Quick Balance */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Outstanding Balance</span>
            <h2 className={`font-display text-3xl font-extrabold mt-1.5 ${
              customer.outstandingPaisa > 0 ? "text-rose-600" : "text-emerald-600"
            }`}>
              {formatCurrency(customer.outstandingPaisa)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Pending invoice settlements</p>
          </div>

          <div className="border-t border-slate-100 pt-4 flex gap-4 mt-6">
            <div className="flex-1">
              <span className="text-[10px] text-slate-400 font-semibold block">Loyalty Balance</span>
              <span className="text-base font-bold text-purple-600 flex items-center gap-1.5 mt-0.5">
                <Star className="h-4 w-4 fill-purple-600 shrink-0" /> {customer.loyaltyPoints} pts
              </span>
            </div>
            <div className="flex-1 text-right">
              <span className="text-[10px] text-slate-400 font-semibold block">Last Purchased</span>
              <span className="text-xs font-bold text-med-navy block mt-1">{stats.lastVisit}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── METRICS BOXES ─── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        
        {/* Total Spent */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sales Spent</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="font-display text-xl font-bold text-med-navy">{formatCurrency(stats.totalSpent)}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Cumulative billing totals</p>
          </div>
        </div>

        {/* Total Bills */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Transactions</span>
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="font-display text-xl font-bold text-med-navy">{stats.totalVisits} bills</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Recorded pharmacy visits</p>
          </div>
        </div>

        {/* Outstanding credit bills */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Bills</span>
            <div className={`rounded-lg p-2 ${
              customer.outstandingPaisa > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"
            }`}>
              <CreditCard className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="font-display text-xl font-bold text-med-navy">
              {purchases.filter(p => p.amountDuePaisa > 0).length} bills
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Bills with outstanding due</p>
          </div>
        </div>

        {/* Total Items Bought */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Items Purchased</span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <Star className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="font-display text-xl font-bold text-med-navy">
              {purchases.reduce((count, p) => count + p.items.reduce((s, item) => s + item.quantity, 0), 0)} units
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Total medicine quantity</p>
          </div>
        </div>
      </div>

      {/* ─── TAB SWITCHER ─── */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("history")}
            className={`border-b-2 pb-3 text-sm font-semibold transition-all ${
              activeTab === "history"
                ? "border-med-green text-med-greenDark"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Transaction History ({filteredPurchases.length})
          </button>
          <button
            onClick={() => setActiveTab("medicines")}
            className={`border-b-2 pb-3 text-sm font-semibold transition-all ${
              activeTab === "medicines"
                ? "border-med-green text-med-greenDark"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Purchased Medicines ({medicineAggregates.length})
          </button>
        </div>
      </div>

      {/* ─── TAB CONTENT: HISTORY ─── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          
          {/* Invoice search inside dashboard */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search purchases by invoice, medicine, batch, payment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-xs outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-med-green/20 focus:border-med-green"
            />
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
              <Calendar className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium">No purchases matched the search criteria.</p>
            </div>
          ) : (
            filteredPurchases.map((purchase) => {
              const isExpanded = !!expandedInvoices[purchase.id];
              const isDue = purchase.amountDuePaisa > 0;
              const itemsListText = purchase.items.map(i => `${i.medicine_name} (${i.quantity})`).join(", ");
              const shareMessage = encodeURIComponent(
                `Invoice: ${purchase.invoiceNo} from ${tenantName}.\nTotal: ${formatCurrency(purchase.totalPaisa)}.\nMedicines: ${itemsListText}.\nThank you!`
              );
              const whatsappUrl = `https://wa.me/${customer.phone ? customer.phone.replace(/\D/g, "") : ""}?text=${shareMessage}`;

              return (
                <div
                  key={purchase.id}
                  className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:border-slate-350 ${
                    isExpanded ? "ring-1 ring-med-green/20 border-med-green/45" : ""
                  }`}
                >
                  {/* Purchase main summary row */}
                  <div
                    onClick={() => toggleInvoice(purchase.id)}
                    className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between cursor-pointer select-none"
                  >
                    {/* Invoice detail */}
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-slate-50 p-2 text-slate-500">
                        <Clock className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-med-navy">{purchase.invoiceNo}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{formatTime(purchase.createdAt)}</span>
                        </div>
                        <span className="text-xs text-slate-500 font-semibold">{formatDate(purchase.createdAt || purchase.date)}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-4">
                      {/* Payment mode tag */}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          purchase.paymentMode === "cash"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : purchase.paymentMode === "upi"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : purchase.paymentMode === "card"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}
                      >
                        {purchase.paymentMode}
                      </span>

                      {/* Status Tag */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          !isDue
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}
                      >
                        {!isDue ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3" /> Due: {formatCurrency(purchase.amountDuePaisa)}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Total & Chevron */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 md:border-t-0 md:pt-0 md:justify-end gap-6">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-semibold">Invoice Total</span>
                        <h4 className="font-display text-base font-bold text-med-navy">{formatCurrency(purchase.totalPaisa)}</h4>
                      </div>
                      <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Nested Invoice details (EXPANDED) */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50/40 p-4.5 animate-in fade-in duration-200">
                      
                      {/* Products header */}
                      <div className="mb-3 flex items-center justify-between">
                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Invoice Medicines</h5>
                        
                        {/* Quick print & whatsapp sharing */}
                        <div className="flex gap-2">
                          <Link
                            href={`/shop/billing/${encodeURIComponent(purchase.id)}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                          >
                            <Printer className="h-3.5 w-3.5" /> Print A4 Invoice
                          </Link>
                          
                          {customer.phone && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-med-green px-2.5 py-1 text-xs font-semibold text-white hover:bg-med-greenDark shadow-sm"
                            >
                              <Send className="h-3.5 w-3.5" /> WhatsApp Invoice
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Items Desktop Table */}
                      <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2.5">Medicine Name</th>
                              <th className="px-4 py-2.5">Batch</th>
                              <th className="px-4 py-2.5">Expiry</th>
                              <th className="px-4 py-2.5 text-right">Qty</th>
                              <th className="px-4 py-2.5 text-right">MRP</th>
                              <th className="px-4 py-2.5 text-right">Rate</th>
                              <th className="px-4 py-2.5 text-right">GST %</th>
                              <th className="px-4 py-2.5 text-right">GST Amt</th>
                              <th className="px-4 py-2.5 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {purchase.items.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 font-semibold text-med-navy">{item.medicine_name}</td>
                                <td className="px-4 py-2.5 font-mono text-slate-500">{item.batch_no}</td>
                                <td className="px-4 py-2.5 text-slate-500">{item.expiry_date || "N/A"}</td>
                                <td className="px-4 py-2.5 text-right font-bold">{item.quantity}</td>
                                <td className="px-4 py-2.5 text-right">{formatCurrency(item.mrp_paisa)}</td>
                                <td className="px-4 py-2.5 text-right text-med-navy">{formatCurrency(item.sale_rate_paisa)}</td>
                                <td className="px-4 py-2.5 text-right">{item.gst_rate}%</td>
                                <td className="px-4 py-2.5 text-right text-slate-500">{formatCurrency(item.gst_paisa)}</td>
                                <td className="px-4 py-2.5 text-right font-bold text-med-navy">{formatCurrency(item.total_paisa)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Items Mobile list */}
                      <div className="grid gap-2 md:hidden">
                        {purchase.items.map((item) => (
                          <div key={item.id} className="rounded-lg border border-slate-150 bg-white p-3 shadow-xs text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="font-bold text-med-navy">{item.medicine_name}</span>
                              <span className="font-bold text-slate-700">{formatCurrency(item.total_paisa)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400 text-[10px]">
                              <span>Batch: {item.batch_no} | Exp: {item.expiry_date}</span>
                              <span>{item.quantity} pcs @ {formatCurrency(item.sale_rate_paisa)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400 border-t border-slate-100 pt-1 text-[9px]">
                              <span>GST: {item.gst_rate}%</span>
                              <span>GST Amt: {formatCurrency(item.gst_paisa)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Invoice Summary Card */}
                      <div className="mt-3.5 ml-auto max-w-sm rounded-lg border border-slate-200 bg-white p-3.5 text-xs space-y-1.5 shadow-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Subtotal</span>
                          <span className="font-medium text-slate-700">{formatCurrency(purchase.subtotalPaisa)}</span>
                        </div>
                        {purchase.discountPaisa > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>Discount Given</span>
                            <span>-{formatCurrency(purchase.discountPaisa)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-400">CGST + SGST</span>
                          <span className="font-medium text-slate-700">{formatCurrency(purchase.gstPaisa)}</span>
                        </div>
                        {purchase.roundOffPaisa !== 0 && (
                          <div className="flex justify-between text-slate-400">
                            <span>Round off</span>
                            <span>{purchase.roundOffPaisa > 0 ? "+" : ""}{formatCurrency(purchase.roundOffPaisa)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-med-navy">
                          <span>Grand Total</span>
                          <span>{formatCurrency(purchase.totalPaisa)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── TAB CONTENT: MEDICINE-WISE AGGREGATION ─── */}
      {activeTab === "medicines" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {medicineAggregates.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Calendar className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium">No medicines purchased by this customer yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th
                      onClick={() => handleMedSort("name")}
                      className="px-6 py-3 cursor-pointer select-none hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Medicine Name
                        {medSortKey === "name" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th
                      onClick={() => handleMedSort("qty")}
                      className="px-6 py-3 text-right cursor-pointer select-none hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Total Quantity Purchased
                        {medSortKey === "qty" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th
                      onClick={() => handleMedSort("revenue")}
                      className="px-6 py-3 text-right cursor-pointer select-none hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Total Revenue (₹)
                        {medSortKey === "revenue" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right">Last Purchased On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medicineAggregates.map((med) => (
                    <tr key={med.name} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3.5 font-bold text-med-navy">{med.name}</td>
                      <td className="px-6 py-3.5 text-right font-semibold text-slate-800">{med.qty}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-med-greenDark">{formatCurrency(med.revenue)}</td>
                      <td className="px-6 py-3.5 text-right text-slate-500">{formatDate(med.lastBought)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
