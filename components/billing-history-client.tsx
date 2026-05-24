"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  CreditCard,
  ShoppingBag,
  Download,
  ArrowUpDown,
  Printer,
  Send,
  Clock,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Tag
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type SaleItem = {
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

type SaleWithItems = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  customer_name: string | null;
  customer_phone: string | null;
  prescription_no: string | null;
  doctor_name: string | null;
  payment_mode: string;
  subtotal_paisa: number;
  discount_paisa: number;
  taxable_paisa: number;
  cgst_paisa: number;
  sgst_paisa: number;
  igst_paisa: number;
  gst_paisa: number;
  round_off_paisa: number;
  total_paisa: number;
  amount_paid_paisa: number;
  amount_due_paisa: number;
  status: string;
  created_at: string;
  items: SaleItem[];
};

export function BillingHistoryClient({
  initialSales,
  tenantName,
  whatsappBaseMessage
}: {
  initialSales: SaleWithItems[];
  tenantName: string;
  whatsappBaseMessage?: string;
}) {
  const [sales] = useState<SaleWithItems[]>(initialSales);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "week" | "month" | "custom">("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"invoices" | "medicines">("invoices");
  
  // Expanded sales IDs
  const [expandedSaleIds, setExpandedSaleIds] = useState<Record<string, boolean>>({});
  
  // Medicine Wise Sorting
  const [medSortKey, setMedSortKey] = useState<"qty" | "revenue" | "name">("qty");
  const [medSortOrder, setMedSortOrder] = useState<"asc" | "desc">("desc");

  const toggleExpand = (id: string) => {
    setExpandedSaleIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Date Filtering Helper
  const isWithinDateRange = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    
    // Set hours to 0 to compare days
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayMidnight = new Date(todayMidnight);
    yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);
    
    const weekAgo = new Date(todayMidnight);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(todayMidnight);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    if (dateFilter === "today") {
      return date >= todayMidnight;
    } else if (dateFilter === "yesterday") {
      const tomorrowOfYesterday = new Date(yesterdayMidnight);
      tomorrowOfYesterday.setDate(tomorrowOfYesterday.getDate() + 1);
      return date >= yesterdayMidnight && date < tomorrowOfYesterday;
    } else if (dateFilter === "week") {
      return date >= weekAgo;
    } else if (dateFilter === "month") {
      return date >= monthAgo;
    } else if (dateFilter === "custom") {
      if (!startDate) return true;
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    return true; // "all"
  };

  // Apply filters
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Date filter
      if (!isWithinDateRange(sale.created_at || sale.invoice_date)) {
        return false;
      }

      // Payment mode filter
      if (paymentModeFilter !== "all" && sale.payment_mode.toLowerCase() !== paymentModeFilter.toLowerCase()) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && sale.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Search term (invoice number, customer name, customer phone, medicine name inside bill)
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const invoiceNoMatch = sale.invoice_no.toLowerCase().includes(query);
        const customerNameMatch = (sale.customer_name ?? "walk-in customer").toLowerCase().includes(query);
        const customerPhoneMatch = (sale.customer_phone ?? "").includes(query);
        const doctorNameMatch = (sale.doctor_name ?? "").toLowerCase().includes(query);
        
        const medicineMatch = sale.items.some((item) =>
          item.medicine_name.toLowerCase().includes(query) ||
          item.batch_no.toLowerCase().includes(query)
        );

        return invoiceNoMatch || customerNameMatch || customerPhoneMatch || doctorNameMatch || medicineMatch;
      }

      return true;
    });
  }, [sales, searchTerm, dateFilter, startDate, endDate, paymentModeFilter, statusFilter]);

  // Aggregate stats from filtered sales
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalGST = 0;
    let totalDue = 0;
    let billsCount = filteredSales.length;

    filteredSales.forEach((sale) => {
      totalSales += sale.total_paisa;
      totalGST += sale.gst_paisa;
      totalDue += sale.amount_due_paisa;
    });

    return {
      totalSales,
      totalGST,
      totalDue,
      billsCount
    };
  }, [filteredSales]);

  // Aggregate Medicine Wise Sales
  const medicineSales = useMemo(() => {
    const medMap: Record<string, {
      name: string;
      hsn: string;
      quantity: number;
      revenue: number;
      gst: number;
      billsCount: number;
      batches: Set<string>;
    }> = {};

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const name = item.medicine_name;
        if (!medMap[name]) {
          medMap[name] = {
            name,
            hsn: item.hsn_code || "N/A",
            quantity: 0,
            revenue: 0,
            gst: 0,
            billsCount: 0,
            batches: new Set<string>()
          };
        }
        medMap[name].quantity += item.quantity;
        medMap[name].revenue += item.total_paisa;
        medMap[name].gst += item.gst_paisa;
        medMap[name].billsCount += 1;
        medMap[name].batches.add(item.batch_no);
      });
    });

    const list = Object.values(medMap).map((med) => ({
      ...med,
      batches: Array.from(med.batches).join(", "),
      avgRate: med.quantity > 0 ? Math.round(med.revenue / med.quantity) : 0
    }));

    // Sort
    list.sort((a, b) => {
      let comparison = 0;
      if (medSortKey === "qty") {
        comparison = a.quantity - b.quantity;
      } else if (medSortKey === "revenue") {
        comparison = a.revenue - b.revenue;
      } else {
        comparison = a.name.localeCompare(b.name);
      }
      return medSortOrder === "desc" ? -comparison : comparison;
    });

    return list;
  }, [filteredSales, medSortKey, medSortOrder]);

  const toggleMedSort = (key: "qty" | "revenue" | "name") => {
    if (medSortKey === key) {
      setMedSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setMedSortKey(key);
      setMedSortOrder("desc");
    }
  };

  // CSV Export function for filtered sales
  const handleExportCSV = () => {
    const rows = filteredSales.flatMap((sale) =>
      sale.items.map((item) => ({
        "Invoice No": sale.invoice_no,
        "Date": new Date(sale.created_at).toLocaleDateString("en-IN"),
        "Customer Name": sale.customer_name || "Walk-in Customer",
        "Customer Phone": sale.customer_phone || "",
        "Doctor": sale.doctor_name || "",
        "Payment Mode": sale.payment_mode.toUpperCase(),
        "Status": sale.status.toUpperCase(),
        "Medicine": item.medicine_name,
        "Batch": item.batch_no,
        "Expiry": item.expiry_date,
        "Qty": item.quantity,
        "MRP (INR)": (item.mrp_paisa / 100).toFixed(2),
        "Sale Rate (INR)": (item.sale_rate_paisa / 100).toFixed(2),
        "GST %": item.gst_rate,
        "GST Amt (INR)": (item.gst_paisa / 100).toFixed(2),
        "Total (INR)": (item.total_paisa / 100).toFixed(2)
      }))
    );

    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const escape = (value: unknown) => {
      const text = String(value ?? "");
      return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    };

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => escape(row[header as keyof typeof row])).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_history_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to get relative time or simple time string
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
      {/* ─── FILTERS PANEL ─── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          
          {/* Quick Date Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-100 w-fit">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "week", label: "Last 7 Days" },
              { id: "month", label: "Last 30 Days" },
              { id: "all", label: "All Time" },
              { id: "custom", label: "Custom Range" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id as typeof dateFilter)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  dateFilter === tab.id
                    ? "bg-white text-med-navy shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredSales.length === 0}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Export Detailed CSV
            </button>
          </div>
        </div>

        {/* Custom date range fields */}
        {dateFilter === "custom" && (
          <div className="mt-4 flex flex-wrap gap-4 items-center animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-slate-200 p-1.5 text-xs focus:ring-2 focus:ring-med-green focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-slate-200 p-1.5 text-xs focus:ring-2 focus:ring-med-green focus:border-transparent outline-none"
              />
            </div>
          </div>
        )}

        {/* Multi-faceted Search and Dropdown Filter */}
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {/* Search box */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice #, medicine name, batch, client, doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-med-green focus:border-transparent"
            />
          </div>

          {/* Payment Mode */}
          <div>
            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-med-green"
            >
              <option value="all">Payment Mode: All</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="credit">Credit / Due</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-med-green"
            >
              <option value="all">Bill Status: All</option>
              <option value="paid">Paid</option>
              <option value="due">Due / Unpaid</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        
        {/* Total Sales */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sales</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="font-display text-2xl font-bold text-med-navy">{formatCurrency(stats.totalSales)}</h3>
            <p className="mt-0.5 text-xs text-slate-500">From {stats.billsCount} bills</p>
          </div>
        </div>

        {/* Total Dues / Outstanding */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Credit (Due)</span>
            <div className={`rounded-lg p-2 ${stats.totalDue > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-500"}`}>
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className={`font-display text-2xl font-bold ${stats.totalDue > 0 ? "text-amber-600" : "text-med-navy"}`}>
              {formatCurrency(stats.totalDue)}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">Uncollected credit balance</p>
          </div>
        </div>

        {/* GST Collected */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">GST Collected</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Tag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="font-display text-2xl font-bold text-med-navy">{formatCurrency(stats.totalGST)}</h3>
            <p className="mt-0.5 text-xs text-slate-500">CGST + SGST + IGST</p>
          </div>
        </div>

        {/* Net Cash / Collected Amount */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Cash Collected</span>
            <div className="rounded-lg bg-med-greenSoft p-2 text-med-greenDark">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="font-display text-2xl font-bold text-med-navy">
              {formatCurrency(stats.totalSales - stats.totalDue)}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">Immediate cash flow</p>
          </div>
        </div>
      </div>

      {/* ─── MAIN TABS ─── */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`border-b-2 pb-3 text-sm font-semibold transition-all ${
              activeTab === "invoices"
                ? "border-med-green text-med-greenDark"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Invoice-Wise History ({filteredSales.length})
          </button>
          <button
            onClick={() => setActiveTab("medicines")}
            className={`border-b-2 pb-3 text-sm font-semibold transition-all ${
              activeTab === "medicines"
                ? "border-med-green text-med-greenDark"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Medicine-Wise Summary ({medicineSales.length})
          </button>
        </div>
      </div>

      {/* ─── TAB CONTENT: INVOICES LIST ─── */}
      {activeTab === "invoices" && (
        <div className="space-y-3">
          {filteredSales.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
              <Calendar className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm">No billing records found matching the filters.</p>
            </div>
          ) : (
            filteredSales.map((sale) => {
              const isExpanded = !!expandedSaleIds[sale.id];
              const isDue = sale.amount_due_paisa > 0;
              const isWalkIn = !sale.customer_name || sale.customer_name === "Walk-in Customer";
              const dateObj = new Date(sale.created_at || sale.invoice_date);
              
              // WhatsApp text share link helper
              const itemsShortList = sale.items.map(i => `${i.medicine_name} (${i.quantity})`).join(", ");
              const invoiceUrl = `${window.location.origin}/shop/billing/${sale.id}`;
              const shareMessage = encodeURIComponent(
                whatsappBaseMessage 
                  ? `${whatsappBaseMessage} Invoice: ${sale.invoice_no}. Total: ${formatCurrency(sale.total_paisa)}. View/Download professional Invoice PDF here: ${invoiceUrl}. Thanks!`
                  : `Medicare Invoice: ${sale.invoice_no} from ${tenantName}.\nTotal Amount: ${formatCurrency(sale.total_paisa)}.\nMedicines: ${itemsShortList}.\nView/Download professional Invoice PDF here: ${invoiceUrl}\nThank you!`
              );
              const whatsappUrl = `https://wa.me/${sale.customer_phone ? sale.customer_phone.replace(/\D/g, "") : ""}?text=${shareMessage}`;

              return (
                <div
                  key={sale.id}
                  className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:border-slate-300 ${
                    isExpanded ? "ring-1 ring-med-green/20 border-med-green/45" : ""
                  }`}
                >
                  {/* MAIN CARD ROW */}
                  <div
                    onClick={() => toggleExpand(sale.id)}
                    className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between cursor-pointer select-none"
                  >
                    {/* Left Column: Invoice, Time, Customer */}
                    <div className="flex flex-1 flex-col gap-1 md:flex-row md:items-center md:gap-6">
                      
                      {/* Invoice ID & Clock */}
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-slate-50 p-2 text-slate-500">
                          <Clock className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-med-navy">{sale.invoice_no}</span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {formatTime(sale.created_at || sale.invoice_date)}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-semibold">
                            {formatDate(sale.created_at || sale.invoice_date)}
                          </span>
                        </div>
                      </div>

                      {/* Customer Details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-med-navy">
                            {isWalkIn ? "Walk-in Customer" : sale.customer_name}
                          </span>
                          {!isWalkIn && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                              {sale.customer_phone}
                            </span>
                          )}
                        </div>
                        {sale.doctor_name && (
                          <span className="text-xs text-slate-400">Dr. {sale.doctor_name}</span>
                        )}
                      </div>
                    </div>

                    {/* Middle Column: Mode & Dues */}
                    <div className="flex items-center gap-4.5">
                      {/* Payment mode tag */}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                          sale.payment_mode === "cash"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : sale.payment_mode === "upi"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : sale.payment_mode === "card"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}
                      >
                        {sale.payment_mode}
                      </span>

                      {/* Status Tag */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
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
                            <AlertCircle className="h-3 w-3" /> Due: {formatCurrency(sale.amount_due_paisa)}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Right Column: Total & Expand Chevron */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 md:border-t-0 md:pt-0 md:justify-end gap-6">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-medium">Total Bill</span>
                        <h4 className="font-display text-base font-bold text-med-navy">{formatCurrency(sale.total_paisa)}</h4>
                      </div>
                      <button
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                        aria-label="Expand bill details"
                      >
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* EXPANDED SECTION */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50/40 p-4.5 animate-in fade-in duration-200">
                      
                      {/* Products/Medicines Header */}
                      <div className="mb-3 flex items-center justify-between">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Items List</h5>
                        
                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <Link
                            href={`/shop/billing/${encodeURIComponent(sale.id)}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                          >
                            <Printer className="h-3.5 w-3.5" /> Full Invoice (A4)
                          </Link>
                          
                          {sale.customer_phone && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-med-green px-2.5 py-1 text-xs font-semibold text-white hover:bg-med-greenDark shadow-sm"
                            >
                              <Send className="h-3.5 w-3.5" /> Share WhatsApp
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Items Desktop Table */}
                      <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-semibold">
                            <tr className="border-b border-slate-200">
                              <th className="px-4 py-2.5">Medicine / Drug Name</th>
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
                            {sale.items.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 font-medium text-med-navy">{item.medicine_name}</td>
                                <td className="px-4 py-2.5 font-mono text-slate-500">{item.batch_no}</td>
                                <td className="px-4 py-2.5 text-slate-500">{item.expiry_date || "N/A"}</td>
                                <td className="px-4 py-2.5 text-right font-semibold">{item.quantity}</td>
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

                      {/* Items Mobile Card list */}
                      <div className="grid gap-2 md:hidden">
                        {sale.items.map((item) => (
                          <div key={item.id} className="rounded-lg border border-slate-150 bg-white p-3 shadow-xs text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="font-bold text-med-navy">{item.medicine_name}</span>
                              <span className="font-bold text-slate-700">{formatCurrency(item.total_paisa)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Batch: {item.batch_no} | Exp: {item.expiry_date}</span>
                              <span>{item.quantity} pcs @ {formatCurrency(item.sale_rate_paisa)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400 border-t border-slate-100 pt-1 text-[10px]">
                              <span>GST Rate: {item.gst_rate}%</span>
                              <span>GST Amt: {formatCurrency(item.gst_paisa)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Invoice Summary Box */}
                      <div className="mt-3.5 ml-auto max-w-sm rounded-lg border border-slate-200 bg-white p-3.5 text-xs space-y-1.5 shadow-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Subtotal</span>
                          <span className="font-medium text-slate-700">{formatCurrency(sale.subtotal_paisa)}</span>
                        </div>
                        {sale.discount_paisa > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>Discount</span>
                            <span>-{formatCurrency(sale.discount_paisa)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-400">CGST</span>
                          <span className="font-medium text-slate-700">{formatCurrency(sale.cgst_paisa)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">SGST</span>
                          <span className="font-medium text-slate-700">{formatCurrency(sale.sgst_paisa)}</span>
                        </div>
                        {sale.round_off_paisa !== 0 && (
                          <div className="flex justify-between text-slate-400">
                            <span>Round off</span>
                            <span>{sale.round_off_paisa > 0 ? "+" : ""}{formatCurrency(sale.round_off_paisa)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-med-navy">
                          <span>Grand Total</span>
                          <span>{formatCurrency(sale.total_paisa)}</span>
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

      {/* ─── TAB CONTENT: MEDICINE-WISE SUMMARY ─── */}
      {activeTab === "medicines" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {medicineSales.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Calendar className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm">No items were sold in this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th
                      onClick={() => toggleMedSort("name")}
                      className="px-6 py-3 cursor-pointer select-none hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Medicine Name
                        {medSortKey === "name" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th className="px-6 py-3">HSN Code</th>
                    <th className="px-6 py-3">Batches Sold</th>
                    <th
                      onClick={() => toggleMedSort("qty")}
                      className="px-6 py-3 text-right cursor-pointer select-none hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Total Qty Sold
                        {medSortKey === "qty" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right">Avg Rate (₹)</th>
                    <th className="px-6 py-3 text-right">GST Collected</th>
                    <th
                      onClick={() => toggleMedSort("revenue")}
                      className="px-6 py-3 text-right cursor-pointer select-none hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Total Revenue
                        {medSortKey === "revenue" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medicineSales.map((med) => (
                    <tr key={med.name} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3.5 font-bold text-med-navy">{med.name}</td>
                      <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">{med.hsn}</td>
                      <td className="px-6 py-3.5 text-slate-400 text-xs truncate max-w-xs">{med.batches}</td>
                      <td className="px-6 py-3.5 text-right font-semibold text-slate-800">{med.quantity}</td>
                      <td className="px-6 py-3.5 text-right text-slate-600">{formatCurrency(med.avgRate)}</td>
                      <td className="px-6 py-3.5 text-right text-slate-500">{formatCurrency(med.gst)}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-med-greenDark">{formatCurrency(med.revenue)}</td>
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
