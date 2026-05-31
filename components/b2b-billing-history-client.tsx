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
  ArrowUpDown,
  Printer,
  Send,
  Clock,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Tag,
  Eye,
  X,
  FileText,
  FileImage,
  Store,
  UserCheck,
  Pencil,
  Share2,
  Download,
  Loader2
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

type B2BSaleItem = {
  id: string;
  medicineName: string;
  batchNo: string;
  expiryDate: Date | string;
  quantity: number;
  freeQuantity: number;
  mrpPaisa: number;
  saleRatePaisa: number;
  discountPercent: number;
  gstRate: number;
  gstPaisa: number;
  taxablePaisa: number;
  totalPaisa: number;
  schemeDetails?: string | null;
  inventory?: any;
};

type B2BSaleWithItems = {
  id: string;
  invoiceNo: string;
  invoiceDate: Date | string;
  partyId: string;
  party: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    gstin: string | null;
    drugLicenseNo: string | null;
  };
  salesmanId: string | null;
  paymentMode: string;
  subtotalPaisa: number;
  discountPaisa: number;
  taxablePaisa: number;
  gstPaisa: number;
  roundOffPaisa: number;
  totalPaisa: number;
  amountPaidPaisa: number;
  amountDuePaisa: number;
  status: string;
  invoiceType: string;
  notes: string | null;
  createdAt: Date | string;
  items: B2BSaleItem[];
};

type Salesman = {
  id: string;
  name: string;
};

type Tenant = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  drugLicenseNo: string | null;
};

export function B2BBillingHistoryClient({
  initialSales,
  tenant,
  salesmen
}: {
  initialSales: B2BSaleWithItems[];
  tenant: Tenant | null;
  salesmen: Salesman[];
}) {
  const [sales, setSales] = useState<B2BSaleWithItems[]>(initialSales);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "week" | "month" | "custom">("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"invoices" | "medicines">("invoices");

  // Edit Bill state
  const [editBill, setEditBill] = useState<B2BSaleWithItems | null>(null);
  const [editPaymentMode, setEditPaymentMode] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Quick Payment state (bill-specific partial payment from billing history)
  const [quickPaySale, setQuickPaySale] = useState<B2BSaleWithItems | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState("");
  const [quickPayMode, setQuickPayMode] = useState("cash");
  const [quickPayRef, setQuickPayRef] = useState("");
  const [quickPaySaving, setQuickPaySaving] = useState(false);

  // Expanded sales IDs
  const [expandedSaleIds, setExpandedSaleIds] = useState<Record<string, boolean>>({});

  // Medicine Wise Sorting
  const [medSortKey, setMedSortKey] = useState<"qty" | "revenue" | "name">("qty");
  const [medSortOrder, setMedSortOrder] = useState<"asc" | "desc">("desc");

  // Premium Print Modal states
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);
  const [printFormat, setPrintFormat] = useState<"a4" | "thermal">("a4");
  const [sharingPdf, setSharingPdf] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedSaleIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Date Filtering Helper
  const isWithinDateRange = (dateStr: string | Date) => {
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

  // Map Salesman names
  const salesmanMap = useMemo(() => {
    const map = new Map<string, string>();
    salesmen.forEach((sm) => map.set(sm.id, sm.name));
    return map;
  }, [salesmen]);

  // Apply filters
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Date filter
      if (!isWithinDateRange(sale.invoiceDate || sale.createdAt)) {
        return false;
      }

      // Payment mode filter
      if (paymentModeFilter !== "all" && sale.paymentMode.toLowerCase() !== paymentModeFilter.toLowerCase()) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && sale.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Invoice Type filter (invoice vs challan)
      if (invoiceTypeFilter !== "all" && sale.invoiceType.toLowerCase() !== invoiceTypeFilter.toLowerCase()) {
        return false;
      }

      // Search term (invoice number, party name, phone, gstin, medicine name inside bill, salesman name)
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const invoiceNoMatch = sale.invoiceNo.toLowerCase().includes(query);
        const partyNameMatch = sale.party.name.toLowerCase().includes(query);
        const partyPhoneMatch = (sale.party.phone ?? "").includes(query);
        const partyGstinMatch = (sale.party.gstin ?? "").toLowerCase().includes(query);

        // Salesman match
        const salesmanName = sale.salesmanId ? (salesmanMap.get(sale.salesmanId) ?? "") : "";
        const salesmanMatch = salesmanName.toLowerCase().includes(query);

        const medicineMatch = sale.items.some((item) =>
          item.medicineName.toLowerCase().includes(query) ||
          item.batchNo.toLowerCase().includes(query)
        );

        return invoiceNoMatch || partyNameMatch || partyPhoneMatch || partyGstinMatch || salesmanMatch || medicineMatch;
      }

      return true;
    });
  }, [sales, searchTerm, dateFilter, startDate, endDate, paymentModeFilter, statusFilter, invoiceTypeFilter, salesmanMap]);

  // Aggregate stats from filtered B2B sales
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalGST = 0;
    let totalDue = 0;
    let billsCount = filteredSales.length;

    filteredSales.forEach((sale) => {
      totalSales += sale.totalPaisa;
      totalGST += sale.gstPaisa;
      totalDue += sale.amountDuePaisa;
    });

    return {
      totalSales,
      totalGST,
      totalDue,
      billsCount
    };
  }, [filteredSales]);

  // Aggregate Medicine Wise B2B Sales
  const medicineSales = useMemo(() => {
    const medMap: Record<string, {
      name: string;
      quantity: number;
      freeQuantity: number;
      revenue: number;
      gst: number;
      billsCount: number;
      batches: Set<string>;
    }> = {};

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const name = item.medicineName;
        if (!medMap[name]) {
          medMap[name] = {
            name,
            quantity: 0,
            freeQuantity: 0,
            revenue: 0,
            gst: 0,
            billsCount: 0,
            batches: new Set<string>()
          };
        }
        medMap[name].quantity += item.quantity;
        medMap[name].freeQuantity += item.freeQuantity;
        medMap[name].revenue += item.totalPaisa;
        medMap[name].gst += item.gstPaisa;
        medMap[name].billsCount += 1;
        medMap[name].batches.add(item.batchNo);
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

  // CSV Export function for B2B filtered sales
  const handleExportCSV = () => {
    const rows = filteredSales.flatMap((sale) =>
      sale.items.map((item) => {
        const smName = sale.salesmanId ? (salesmanMap.get(sale.salesmanId) ?? "Office Direct") : "Office Direct";
        return {
          "Invoice/Challan No": sale.invoiceNo,
          "Category": sale.invoiceType.toUpperCase(),
          "Date": new Date(sale.invoiceDate).toLocaleDateString("en-IN"),
          "Retailer (Chemist)": sale.party.name,
          "Retailer Phone": sale.party.phone || "",
          "Retailer GSTIN": sale.party.gstin || "URP",
          "Booking Executive": smName,
          "Payment Mode": sale.paymentMode.toUpperCase(),
          "Status": sale.status.toUpperCase(),
          "Medicine": item.medicineName,
          "Batch": item.batchNo,
          "Expiry": typeof item.expiryDate === "string" ? item.expiryDate : new Date(item.expiryDate).toLocaleDateString("en-IN"),
          "Billed Qty": item.quantity,
          "Free Qty": item.freeQuantity,
          "PTR (INR)": (item.saleRatePaisa / 100).toFixed(2),
          "MRP (INR)": (item.mrpPaisa / 100).toFixed(2),
          "Discount %": item.discountPercent,
          "GST %": item.gstRate,
          "GST Amt (INR)": (item.gstPaisa / 100).toFixed(2),
          "Line Total (INR)": (item.totalPaisa / 100).toFixed(2)
        };
      })
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
    link.setAttribute("download", `b2b_sales_history_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (isoString: string | Date) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Open edit modal for a specific sale
  const openEditModal = (sale: B2BSaleWithItems) => {
    setEditBill(sale);
    setEditPaymentMode(sale.paymentMode);
    setEditNotes(sale.notes || "");
  };

  // Open quick payment modal
  const openQuickPay = (sale: B2BSaleWithItems) => {
    setQuickPaySale(sale);
    setQuickPayAmount((sale.amountDuePaisa / 100).toFixed(2));
    setQuickPayMode("cash");
    setQuickPayRef("");
  };

  // Handle quick payment submission
  const handleQuickPayment = async () => {
    if (!quickPaySale) return;
    const amt = parseFloat(quickPayAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    const amtPaisa = Math.round(amt * 100);
    if (amtPaisa > quickPaySale.amountDuePaisa) {
      toast.error(`Amount cannot exceed balance due of ${formatCurrency(quickPaySale.amountDuePaisa)}`);
      return;
    }

    setQuickPaySaving(true);
    try {
      const res = await fetch("/api/stockist/parties/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyId: quickPaySale.partyId,
          saleId: quickPaySale.id,
          amountPaisa: amtPaisa,
          paymentMode: quickPayMode,
          referenceNo: quickPayRef || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Payment failed");
      // Update local state
      const newPaid = quickPaySale.amountPaidPaisa + amtPaisa;
      const newDue = Math.max(0, quickPaySale.amountDuePaisa - amtPaisa);
      const newStatus = newDue <= 0 ? "paid" : "partial";
      setSales((prev) =>
        prev.map((s) =>
          s.id === quickPaySale.id
            ? { ...s, amountPaidPaisa: newPaid, amountDuePaisa: newDue, status: newStatus }
            : s
        )
      );
      toast.success(`✅ ${result.message || "Payment recorded!"}`);
      setQuickPaySale(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setQuickPaySaving(false);
    }
  };

  // Save bill edits via PATCH
  const handleSaveBillEdit = async () => {
    if (!editBill) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/stockist/sales/${editBill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMode: editPaymentMode,
          notes: editNotes,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update bill");
      // Update local state optimistically
      setSales(prev => prev.map(s => s.id === editBill.id
        ? { ...s, paymentMode: editPaymentMode, notes: editNotes }
        : s
      ));
      toast.success(`✅ Bill ${editBill.invoiceNo} updated successfully!`);
      setEditBill(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save bill edits");
    } finally {
      setEditSaving(false);
    }
  };

  // Open print console overlay snapshot
  const triggerPrintOverlay = (sale: B2BSaleWithItems) => {
    const mappedItems = sale.items.map((i) => ({
      medicineName: i.medicineName,
      batchNo: i.batchNo,
      hsnCode: i.inventory?.hsnCode || i.inventory?.medicine?.hsnCode || "",
      manufacturer: i.inventory?.medicine?.manufacturer || "",
      mfgDate: i.inventory?.mfgDate ? (typeof i.inventory.mfgDate === "string" ? i.inventory.mfgDate.slice(0, 10) : new Date(i.inventory.mfgDate).toISOString().slice(0, 10)) : "",
      expiryDate: typeof i.expiryDate === "string" ? i.expiryDate : new Date(i.expiryDate).toISOString().slice(0, 10),
      packSize: i.inventory?.medicine?.packSize || "",
      quantity: i.quantity,
      freeQuantity: i.freeQuantity,
      ptrPaisa: i.saleRatePaisa,
      mrpPaisa: i.mrpPaisa,
      discountPercent: i.discountPercent,
      gstRate: i.gstRate,
      lineTotalPaisa: i.totalPaisa,
    }));

    setCompletedInvoice({
      invoiceNo: sale.invoiceNo,
      invoiceType: sale.invoiceType,
      date: new Date(sale.invoiceDate).toISOString(),
      paymentMode: sale.paymentMode,
      notes: sale.notes,
      partyName: sale.party.name,
      partyPhone: sale.party.phone,
      partyGstin: sale.party.gstin,
      partyDl: sale.party.drugLicenseNo,
      partyAddress: sale.party.address,
      salesmanName: sale.salesmanId ? (salesmanMap.get(sale.salesmanId) ?? undefined) : undefined,
      items: mappedItems,
      calculations: {
        subtotalPaisa: sale.subtotalPaisa,
        discountPaisa: sale.discountPaisa,
        gstPaisa: sale.gstPaisa,
        totalPaisa: sale.totalPaisa,
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── EDIT BILL MODAL ── */}
      {editBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Pencil className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">Edit Bill Details</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{editBill.invoiceNo}</p>
                </div>
              </div>
              <button onClick={() => setEditBill(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Payment Mode</label>
                <select
                  value={editPaymentMode}
                  onChange={e => setEditPaymentMode(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:border-med-green focus:ring-1 focus:ring-med-green/20"
                >
                  <option value="credit">On Trade Credit</option>
                  <option value="cash">Cash Payment</option>
                  <option value="upi">UPI / QR Scan</option>
                  <option value="cheque">Bank Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Remarks / Delivery Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Add delivery or payment notes..."
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:border-med-green focus:ring-1 focus:ring-med-green/20"
                />
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 font-semibold">
                ⚠️ Note: Only payment mode and notes can be edited. To modify quantities or medicines, please contact the administrator.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditBill(null)}
                disabled={editSaving}
                className="flex-1 h-10 rounded-xl border border-slate-200 bg-white font-semibold text-slate-600 hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBillEdit}
                disabled={editSaving}
                className="flex-1 h-10 rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700 active:scale-95 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {editSaving ? (
                  <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Pencil className="h-4 w-4" />
                )}
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── QUICK PAYMENT MODAL ─── */}
      {quickPaySale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-6 space-y-4 animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <CreditCard className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-display font-black text-slate-900 text-base">Collect Payment</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{quickPaySale.invoiceNo} • {quickPaySale.party.name}</p>
                </div>
              </div>
              <button onClick={() => setQuickPaySale(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Bill Summary */}
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase">Bill Total</p>
                <p className="text-xs font-black text-slate-800 mt-0.5 font-mono">{formatCurrency(quickPaySale.totalPaisa)}</p>
              </div>
              <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase">Paid</p>
                <p className="text-xs font-black text-emerald-700 mt-0.5 font-mono">{formatCurrency(quickPaySale.amountPaidPaisa)}</p>
              </div>
              <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase">Balance Due</p>
                <p className="text-xs font-black text-red-600 mt-0.5 font-mono">{formatCurrency(quickPaySale.amountDuePaisa)}</p>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label className="block text-xs font-extrabold text-slate-500">Amount Now (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number" min="1" step="0.01"
                  value={quickPayAmount}
                  onChange={(e) => setQuickPayAmount(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 pl-8 pr-3 text-sm font-black text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="flex gap-1.5 mt-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button key={pct} type="button"
                    onClick={() => setQuickPayAmount(((quickPaySale.amountDuePaisa / 100) * pct / 100).toFixed(2))}
                    className="flex-1 text-[10px] font-black text-slate-600 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg py-1 transition-all"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Mode */}
            <div className="space-y-1">
              <label className="block text-xs font-extrabold text-slate-500">Payment Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "cash", label: "💵 Cash" },
                  { value: "upi", label: "📱 UPI" },
                  { value: "cheque", label: "🏦 Cheque" },
                  { value: "neft", label: "⚡ NEFT" },
                ].map((mode) => (
                  <button key={mode.value} type="button"
                    onClick={() => setQuickPayMode(mode.value)}
                    className={`h-9 rounded-xl border text-xs font-bold transition-all ${
                      quickPayMode === mode.value
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference */}
            {quickPayMode !== "cash" && (
              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-500">
                  {quickPayMode === "upi" ? "UPI Txn ID" : quickPayMode === "cheque" ? "Cheque No." : "Ref No."}
                </label>
                <input type="text" value={quickPayRef}
                  onChange={(e) => setQuickPayRef(e.target.value)}
                  placeholder="Optional reference..."
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => setQuickPaySale(null)} disabled={quickPaySaving}
                className="flex-1 h-10 rounded-xl border border-slate-200 bg-white font-semibold text-slate-600 hover:bg-slate-50 text-sm disabled:opacity-60"
              >
                Cancel
              </button>
              <button onClick={handleQuickPayment} disabled={quickPaySaving || !quickPayAmount || Number(quickPayAmount) <= 0}
                className="flex-1 h-10 rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700 active:scale-95 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {quickPaySaving
                  ? <><span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  : <><CreditCard className="h-4 w-4" /> Confirm</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FILTERS PANEL ─── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm no-print animate-fade-in">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Quick Date Tabs — scrollable on mobile */}
          <div className="flex gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-100 overflow-x-auto">
            <div className="flex gap-1.5 min-w-max">
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
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                  dateFilter === tab.id
                    ? "bg-white text-med-navy shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredSales.length === 0}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Export Detailed B2B CSV
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
                className="rounded-md border border-slate-200 p-1.5 text-xs focus:ring-2 focus:ring-med-green focus:border-transparent outline-none bg-white font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-slate-200 p-1.5 text-xs focus:ring-2 focus:ring-med-green focus:border-transparent outline-none bg-white font-medium"
              />
            </div>
          </div>
        )}

        {/* Multi-faceted Search and Dropdown Filter */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {/* Search box */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice #, chemist party, batch, drug, salesman..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-med-green bg-slate-50/50 focus:bg-white font-medium text-slate-800"
            />
          </div>

          {/* Payment Mode */}
          <div>
            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-med-green bg-white font-semibold"
            >
              <option value="all">Payment Mode: All</option>
              <option value="credit">On Trade Credit</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI / QR Scan</option>
              <option value="cheque">Bank Cheque</option>
            </select>
          </div>

          {/* Invoice Category */}
          <div>
            <select
              value={invoiceTypeFilter}
              onChange={(e) => setInvoiceTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-med-green bg-white font-semibold"
            >
              <option value="all">Category: All</option>
              <option value="invoice">Sales Invoice</option>
              <option value="challan">Delivery Challan</option>
            </select>
          </div>
        </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Payment Status:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All Bills" },
                { id: "unpaid", label: "Unpaid / Credit" },
                { id: "paid", label: "Paid" },
                { id: "partial", label: "Partially Paid" }
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold border transition-colors ${
                    statusFilter === st.id
                      ? "bg-med-navy text-white border-med-navy"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 no-print animate-fade-in">
        {/* Total B2B Sales */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total B2B Billing</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="font-display text-2xl font-bold text-med-navy">{formatCurrency(stats.totalSales)}</h3>
            <p className="mt-0.5 text-xs text-slate-500">From {stats.billsCount} transactions</p>
          </div>
        </div>

        {/* Total Receivables / Due */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Booked Credit (Dues)</span>
            <div className={`rounded-lg p-2 ${stats.totalDue > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-500"}`}>
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className={`font-display text-2xl font-bold ${stats.totalDue > 0 ? "text-amber-600" : "text-med-navy"}`}>
              {formatCurrency(stats.totalDue)}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">Pending chemist outstandings</p>
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
            <p className="mt-0.5 text-xs text-slate-500">CGST + SGST (Wholesale 12%)</p>
          </div>
        </div>

        {/* Net Collected Cash */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Immediate Cash flow</span>
            <div className="rounded-lg bg-med-greenSoft p-2 text-med-greenDark">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="font-display text-2xl font-bold text-med-navy">
              {formatCurrency(stats.totalSales - stats.totalDue)}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">Cash / UPI / Cheque collected</p>
          </div>
        </div>
      </div>

      {/* ─── MAIN TABS ─── */}
      <div className="border-b border-slate-200 no-print">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`border-b-2 pb-3 text-sm font-semibold transition-all ${
              activeTab === "invoices"
                ? "border-med-green text-med-greenDark font-bold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Invoice-Wise B2B Sales ({filteredSales.length})
          </button>
          <button
            onClick={() => setActiveTab("medicines")}
            className={`border-b-2 pb-3 text-sm font-semibold transition-all ${
              activeTab === "medicines"
                ? "border-med-green text-med-greenDark font-bold"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Medicine-Wise Performance ({medicineSales.length})
          </button>
        </div>
      </div>

      {/* ─── TAB CONTENT: INVOICES LIST ─── */}
      {activeTab === "invoices" && (
        <div className="space-y-3 no-print">
          {filteredSales.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 animate-fade-in">
              <Calendar className="mx-auto h-8 w-8 text-slate-300 animate-bounce" />
              <p className="mt-3 text-sm">No B2B sales invoices found matching the filters.</p>
            </div>
          ) : (
            filteredSales.map((sale) => {
              const isExpanded = !!expandedSaleIds[sale.id];
              const isDue = sale.amountDuePaisa > 0;
              const dateObj = new Date(sale.invoiceDate || sale.createdAt);

              // WhatsApp share helper
              const itemsShortList = sale.items.map(i => `${i.medicineName} (Qty:${i.quantity})`).join(", ");
              const invoiceUrl = `${window.location.origin}/stockist/sales`;
              const shareMessage = encodeURIComponent(
                `B2B Wholesaler Invoice: ${sale.invoiceNo} from ${tenant?.name || "Medicare Wholesale"}.\nTotal Bill: ${formatCurrency(sale.totalPaisa)}.\nMedicines: ${itemsShortList}.\nPayment Mode: ${sale.paymentMode.toUpperCase()}.\nStatus: ${sale.status.toUpperCase()}.\nThank you!`
              );
              const cleanedPhone = sale.party.phone ? sale.party.phone.replace(/\D/g, "") : "";
              const formattedPhone = cleanedPhone.length === 10 ? `91${cleanedPhone}` : cleanedPhone;
              const whatsappUrl = `https://wa.me/${formattedPhone}?text=${shareMessage}`;

              return (
                <div
                  key={sale.id}
                  className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:border-slate-350 ${
                    isExpanded ? "ring-1 ring-med-green/20 border-med-green/45" : ""
                  }`}
                >
                  {/* MAIN ROW CARD */}
                  <div
                    onClick={() => toggleExpand(sale.id)}
                    className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between cursor-pointer select-none"
                  >
                    {/* Left details: Invoice #, Date, Chemist */}
                    <div className="flex flex-1 flex-col gap-1 md:flex-row md:items-center md:gap-6">
                      {/* Invoice ID & Clock */}
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-slate-50 p-2 text-slate-500">
                          <Clock className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-med-navy">{sale.invoiceNo}</span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {formatTime(sale.invoiceDate || sale.createdAt)}
                            </span>
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                              sale.invoiceType === "challan" 
                                ? "bg-purple-50 text-purple-700 border border-purple-100" 
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            }`}>
                              {sale.invoiceType === "challan" ? "Challan" : "Invoice"}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-semibold">
                            {formatDate(sale.invoiceDate || sale.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Chemist details */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-med-navy">
                            {sale.party.name}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 font-medium">
                            📞 {sale.party.phone || "No phone"}
                          </span>
                          {sale.party.gstin && (
                            <span className="rounded bg-blue-50/50 border border-blue-100 px-2 py-0.5 text-[10px] font-mono text-blue-700 font-semibold">
                              GST: {sale.party.gstin}
                            </span>
                          )}
                        </div>
                        {sale.salesmanId && (
                          <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                            <UserCheck className="h-3.5 w-3.5 text-purple-500" /> Booked by: {salesmanMap.get(sale.salesmanId) ?? "Field Executive"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Mode & Status */}
                    <div className="flex items-center gap-4.5">
                      {/* Payment mode */}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                          sale.paymentMode === "cash"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : sale.paymentMode === "upi"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : sale.paymentMode === "cheque"
                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}
                      >
                        {sale.paymentMode === "credit" ? "Credit / Due" : sale.paymentMode}
                      </span>

                      {/* Status */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          sale.status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : sale.status === "partial"
                            ? "bg-orange-50 text-orange-700 border border-orange-100"
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}
                      >
                        {sale.status === "paid" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </>
                        ) : sale.status === "partial" ? (
                          <>
                            <AlertCircle className="h-3 w-3 text-orange-500" /> Partial (Due: {formatCurrency(sale.amountDuePaisa)})
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 text-red-500" /> Unpaid (Due: {formatCurrency(sale.amountDuePaisa)})
                          </>
                        )}
                      </span>
                    </div>

                    {/* Right Column: Totals & Expander */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 md:border-t-0 md:pt-0 md:justify-end gap-6">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-medium">B2B Total</span>
                        <h4 className="font-display text-base font-bold text-med-navy">{formatCurrency(sale.totalPaisa)}</h4>
                      </div>
                      <button
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                        aria-label="Expand B2B sale details"
                      >
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* EXPANDED SECTION */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50/40 p-4.5 animate-in fade-in duration-200">
                      
                      {/* Section header and actions */}
                      <div className="mb-3 flex items-center justify-between">
                        <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Medicine Lot Breakdown</h5>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEditModal(sale)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 shadow-sm active:scale-95 transition-all"
                          >
                            <Pencil className="h-3.5 w-3.5 text-blue-500" /> Edit Bill
                          </button>
                          {/* Record Payment — only for unpaid or partial bills */}
                          {sale.status !== "paid" && (
                            <button
                              onClick={() => openQuickPay(sale)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 shadow-sm active:scale-95 transition-all"
                            >
                              <CreditCard className="h-3.5 w-3.5 text-emerald-600" /> Collect Payment
                            </button>
                          )}
                          <button
                            onClick={() => triggerPrintOverlay(sale)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm active:scale-95 transition-all"
                          >
                            <Printer className="h-3.5 w-3.5 text-emerald-600" /> Print / View Invoice
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); triggerPrintOverlay(sale); }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm active:scale-95 transition-all"
                            title="Generate PDF & Share on WhatsApp"
                          >
                            <Share2 className="h-3.5 w-3.5" /> Share PDF
                          </button>
                        </div>
                      </div>

                      {/* Chemist Retailer Meta Address Details */}
                      <div className="mb-3.5 rounded-lg bg-white p-3 border border-slate-150 text-[11px] text-slate-500 font-semibold grid gap-2 sm:grid-cols-2 leading-relaxed shadow-xs">
                        <div>
                          <p>🏫 Retailer Chemist: <strong className="text-slate-800">{sale.party.name}</strong></p>
                          <p>📍 Shop Address: <span className="text-slate-600">{sale.party.address || "No address configured"}</span></p>
                          {sale.party.email && <p>✉️ Email Address: <span className="text-slate-600 font-mono">{sale.party.email}</span></p>}
                        </div>
                        <div>
                          <p>🪪 Drug License: <strong className="text-slate-800 font-mono">{sale.party.drugLicenseNo || "N/A"}</strong></p>
                          {sale.notes && <p>📝 Delivery Remarks: <span className="text-amber-700 italic">"{sale.notes}"</span></p>}
                        </div>
                      </div>

                      {/* Items Table — scrollable on mobile */}
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm table-scroll-container">
                        <table className="w-full min-w-[700px] text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-semibold">
                            <tr className="border-b border-slate-200">
                              <th className="px-4 py-2.5">Medicine Billed Lot</th>
                              <th className="px-4 py-2.5">Batch</th>
                              <th className="px-4 py-2.5">Expiry</th>
                              <th className="px-4 py-2.5 text-right">Billed Qty</th>
                              <th className="px-4 py-2.5 text-right">Free Qty</th>
                              <th className="px-4 py-2.5 text-right">PTR Rate</th>
                              <th className="px-4 py-2.5 text-right">Disc%</th>
                              <th className="px-4 py-2.5 text-right">GST%</th>
                              <th className="px-4 py-2.5 text-right">GST Amt</th>
                              <th className="px-4 py-2.5 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {sale.items.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/50 text-slate-700">
                                <td className="px-4 py-2.5">
                                  <span className="font-bold text-slate-800">{item.medicineName}</span>
                                  {item.schemeDetails && (
                                    <span className="block mt-0.5 text-[8px] font-bold uppercase tracking-wider text-purple-700">
                                      ✨ {item.schemeDetails}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 font-mono font-bold text-slate-600 bg-slate-100/50 px-1 py-0.5 rounded w-fit">{item.batchNo}</td>
                                <td className="px-4 py-2.5 text-slate-500 font-mono text-[10px]">
                                  {typeof item.expiryDate === "string" ? item.expiryDate : new Date(item.expiryDate).toISOString().slice(0, 7)}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold">{item.quantity}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-slate-500 font-bold">{item.freeQuantity}</td>
                                <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(item.saleRatePaisa)}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-rose-600">{item.discountPercent}%</td>
                                <td className="px-4 py-2.5 text-right font-mono">{item.gstRate}%</td>
                                <td className="px-4 py-2.5 text-right font-mono text-slate-500">{formatCurrency(item.gstPaisa)}</td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold text-med-navy">{formatCurrency(item.totalPaisa)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Totals Summary Breakdown */}
                      <div className="mt-3.5 flex justify-end">
                        <div className="w-full sm:w-80 rounded-lg border border-slate-200 bg-white p-3.5 text-xs space-y-1.5 shadow-sm font-semibold text-slate-500">
                          <div className="flex justify-between">
                            <span>B2B Subtotal</span>
                            <span className="font-mono text-slate-700">{formatCurrency(sale.subtotalPaisa)}</span>
                          </div>
                          {sale.discountPaisa > 0 && (
                            <div className="flex justify-between text-rose-600">
                              <span>Scheme Discounts (-)</span>
                              <span className="font-mono">-{formatCurrency(sale.discountPaisa)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>CGST + SGST (Tax)</span>
                            <span className="font-mono text-slate-700">{formatCurrency(sale.gstPaisa)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-med-navy text-sm">
                            <span className="text-emerald-700">NET BILL PAYABLE</span>
                            <span className="font-mono text-emerald-600">{formatCurrency(sale.totalPaisa)}</span>
                          </div>
                          {sale.amountPaidPaisa > 0 && (
                            <div className="flex justify-between text-slate-400 font-normal">
                              <span>Total Paid:</span>
                              <span className="font-mono">{formatCurrency(sale.amountPaidPaisa)}</span>
                            </div>
                          )}
                          {isDue && (
                            <div className="flex justify-between text-red-500 font-bold border-t border-slate-100 pt-1 mt-1">
                              <span>Remaining Due:</span>
                              <span className="font-mono">{formatCurrency(sale.amountDuePaisa)}</span>
                            </div>
                          )}
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

      {/* ─── TAB CONTENT: MEDICINES SUMMARY ─── */}
      {activeTab === "medicines" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden no-print animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 text-[10px] uppercase tracking-wider">
                  <th className="px-5 py-3 cursor-pointer select-none text-slate-800" onClick={() => toggleMedSort("name")}>
                    <span className="flex items-center gap-1.5">
                      Medicine / Drug Name <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right cursor-pointer select-none text-slate-800" onClick={() => toggleMedSort("qty")}>
                    <span className="flex items-center justify-end gap-1.5">
                      Units Sold <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right text-slate-500">Free Qty Given</th>
                  <th className="px-5 py-3 text-right cursor-pointer select-none text-slate-800" onClick={() => toggleMedSort("revenue")}>
                    <span className="flex items-center justify-end gap-1.5">
                      Total Revenue <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                    </span>
                  </th>
                  <th className="px-5 py-3 text-right text-slate-500">GST Generated</th>
                  <th className="px-5 py-3 text-right text-slate-500">Avg PTR Rate</th>
                  <th className="px-5 py-3 text-center text-slate-500">No. of Invoices</th>
                  <th className="px-5 py-3 text-slate-500">Active Batches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {medicineSales.map((med) => (
                  <tr key={med.name} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-bold text-med-navy text-sm">{med.name}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900 font-mono text-sm">{med.quantity}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-500">{med.freeQuantity}</td>
                    <td className="px-5 py-3 text-right font-black text-slate-800 font-mono text-sm">{formatCurrency(med.revenue)}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-500">{formatCurrency(med.gst)}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-800">{formatCurrency(med.avgRate)}</td>
                    <td className="px-5 py-3 text-center font-mono text-slate-650 bg-slate-50/40 font-bold">{med.billsCount}</td>
                    <td className="px-5 py-3 text-slate-500 font-mono max-w-[200px] truncate" title={med.batches}>{med.batches}</td>
                  </tr>
                ))}

                {medicineSales.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                      No medicine-wise summaries calculated.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── REAL-TIME PRINT CONSOLE OVERLAY MODAL ─── */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body {
                visibility: hidden !important;
              }
              #b2b-print-target, #b2b-print-target * {
                visibility: visible !important;
              }
              #b2b-print-target {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                background: white !important;
                color: #090d16 !important;
                -webkit-print-color-adjust: economy !important;
                print-color-adjust: economy !important;
                overflow: visible !important;
              }
              ${printFormat === 'thermal' ? `
              @page { margin: 0; size: 80mm auto; }
              html, body { width: 80mm !important; margin: 0 !important; }
              #b2b-print-target { width: 80mm !important; max-width: 80mm !important; }
              ` : `
              @page { margin: 10mm; size: A4 portrait; }
              html, body { width: 210mm !important; margin: 0 !important; }

              /* ECO INK-SAVER OVERRIDES */
              #b2b-print-target thead tr,
              #b2b-print-target thead tr.bg-slate-900 {
                background: #f1f5f9 !important;
                color: #090d16 !important;
                border-bottom: 2px solid #334155 !important;
              }
              #b2b-print-target thead tr th {
                color: #090d16 !important;
                font-weight: 800 !important;
                border: 1px solid #cbd5e1 !important;
                border-bottom: 2px solid #334155 !important;
              }
              #b2b-print-target .bg-slate-55,
              #b2b-print-target .bg-slate-50\\/50 {
                background: #ffffff !important;
                border: 1px solid #cbd5e1 !important;
                color: #090d16 !important;
              }
              #b2b-print-target .bg-slate-200 {
                background: #ffffff !important;
                border: 1px solid #090d16 !important;
                color: #090d16 !important;
              }
              #b2b-print-target .border-slate-350 {
                border-color: #94a3b8 !important;
              }
              #b2b-print-target * {
                box-shadow: none !important;
                text-shadow: none !important;
              }
              `}
            }
          `}} />

          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-black text-white flex items-center gap-2">
                  <Printer className="h-5 w-5 text-emerald-500 animate-pulse" /> B2B Wholesaler Print Console
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Ref No: <code className="font-mono text-slate-350">{completedInvoice.invoiceNo}</code></p>
              </div>
              <button 
                onClick={() => setCompletedInvoice(null)}
                className="rounded-lg p-1.5 hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Selector & Preview Panel */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40 flex flex-col md:flex-row gap-6">
              
              {/* Configuration panel (Left) */}
              <div className="w-full md:w-64 space-y-4 shrink-0 font-semibold">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md space-y-3.5">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Select Print Layout</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => setPrintFormat("a4")}
                      className={`w-full h-10 rounded-lg font-bold text-xs border flex items-center justify-center gap-2 transition-all ${
                        printFormat === "a4"
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-[0_4px_12px_rgba(16,185,129,0.25)]"
                          : "bg-slate-800 border-slate-700 text-slate-350 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      <FileText className="h-4 w-4" /> A4 Tax Invoice Sheet
                    </button>
                    <button
                      onClick={() => setPrintFormat("thermal")}
                      className={`w-full h-10 rounded-lg font-bold text-xs border flex items-center justify-center gap-2 transition-all ${
                        printFormat === "thermal"
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-[0_4px_12px_rgba(16,185,129,0.25)]"
                          : "bg-slate-800 border-slate-700 text-slate-350 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      <Printer className="h-4 w-4" /> 3" Thermal Receipt
                    </button>
                  </div>
                  
                  <div className="border-t border-slate-800 pt-3 text-[10px] text-slate-450 leading-relaxed font-semibold">
                    <span className="text-emerald-700 font-bold block mb-1">💡 Professional Printing:</span>
                    Trigger the browser layout print dialog, and select "Save as PDF" or route to your physical printer console.
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md space-y-2.5">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Bill Financials</p>
                  <div className="text-xs space-y-1.5 font-semibold text-slate-405 font-medium">
                    <p className="flex justify-between items-center"><span>Chemist:</span> <span className="text-slate-100 font-bold max-w-[120px] truncate text-right">{completedInvoice.partyName}</span></p>
                    <p className="flex justify-between items-center">
                      <span>Payment:</span> 
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        completedInvoice.paymentMode === "credit"
                          ? "bg-amber-955/85 text-amber-400 border border-amber-800/40"
                          : "bg-emerald-955/85 text-emerald-400 border border-emerald-800/40"
                      }`}>
                        {completedInvoice.paymentMode === "credit" ? "Trade Credit" : completedInvoice.paymentMode}
                      </span>
                    </p>
                    <p className="flex justify-between items-center"><span>Lots Billed:</span> <span className="text-slate-100 font-mono font-bold">{completedInvoice.items.length} items</span></p>
                    <div className="border-t border-slate-800 pt-2.5 mt-1 font-semibold">
                      <p className="text-[10px] font-extrabold uppercase text-slate-455 tracking-wider">NET PAYABLE</p>
                      <p className="text-emerald-400 font-mono font-black text-lg mt-0.5">{formatCurrency(completedInvoice.calculations.totalPaisa)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* View Target Frame (Right) */}
              <div className="flex-1 bg-slate-950 border border-slate-850 rounded-xl p-4 md:p-6 shadow-inner overflow-x-auto overflow-y-visible flex justify-start [background-image:radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]">
                
                {/* DYNAMIC DOCUMENT TARGET */}
                <div 
                  id="b2b-print-target"
                  className={printFormat === "a4" 
                    ? "w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-800 p-6 flex flex-col justify-between mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-800/10 rounded-sm"
                    : "w-[80mm] bg-white text-slate-800 p-3 font-mono text-[11px] leading-snug flex flex-col justify-start mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-800/10 rounded-sm"
                  }
                  style={printFormat === "a4" ? { minWidth: "750px" } : { width: "80mm" }}
                >
                  
                  {/* format renderer */}
                  {printFormat === "a4" ? (
                    // ────────────────────────────────────────────────────────
                    // A4 TAX INVOICE LAYOUT
                    // ────────────────────────────────────────────────────────
                    <div className="space-y-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Title Banner */}
                        <div className="text-center border-b-2 border-slate-800 pb-2">
                          <h2 className="text-lg font-black tracking-widest text-slate-900 uppercase">
                            {completedInvoice.invoiceType === "challan" ? "DELIVERY CHALLAN" : "TAX INVOICE"}
                          </h2>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Wholesale Pharmaceutical Distribution</p>
                        </div>
                        
                        {/* Supplier / Retailer details */}
                        <div className="grid grid-cols-2 gap-6 mt-4 border-b border-slate-300 pb-4 text-[11px]">
                          {/* Supplier details (Stockist) */}
                          <div className="space-y-1.5 border-r border-slate-200 pr-4">
                            <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">B2B SUPPLIER DETAILS</p>
                            <h4 className="font-extrabold text-slate-900 text-sm uppercase">{tenant?.name || "MEDICARE WHOLESALE DISTRIBUTORS"}</h4>
                            <p className="text-slate-505 font-semibold leading-relaxed">
                              {tenant?.address || "B2B Block, Phase-1 Warehouse, Industrial Estate"}
                            </p>
                            <p className="font-bold text-slate-700 mt-1">📞 Helpline: <span className="font-mono text-slate-850">{tenant?.phone || "+91 99999 88888"}</span></p>
                            <p className="font-bold text-slate-500 font-mono mt-0.5">
                              GSTIN: <span className="font-black text-slate-900 uppercase">{tenant?.gstin || "07AAAAA1111A1Z1"}</span>
                            </p>
                            <p className="font-semibold text-slate-650 text-[10px] leading-tight">
                              DL No: <span className="font-bold">{tenant?.drugLicenseNo || "DL-20B-12948 / DL-21B-12949"}</span>
                            </p>
                          </div>

                          {/* Chemist Retailer (Buyer) */}
                          <div className="space-y-1.5 pl-2">
                            <p className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">RETAIL CHEMIST (BUYER)</p>
                            <h4 className="font-black text-slate-900 text-sm uppercase">{completedInvoice.partyName}</h4>
                            <p className="text-slate-505 font-semibold leading-relaxed">
                              {completedInvoice.partyAddress || "No registered party address configured."}
                            </p>
                            {completedInvoice.partyPhone && (
                              <p className="font-bold text-slate-700 mt-1">📞 Contact: <span className="font-mono text-slate-850">{completedInvoice.partyPhone}</span></p>
                            )}
                            <p className="font-bold text-slate-500 font-mono mt-0.5">
                              GSTIN: <span className="font-black text-slate-900 uppercase">{completedInvoice.partyGstin || "UNREGISTERED (URP)"}</span>
                            </p>
                            <p className="font-semibold text-slate-600 text-[10px]">
                              Drug License: <span className="font-bold uppercase">{completedInvoice.partyDl || "DL-JH-RAN-99238"}</span>
                            </p>
                          </div>
                        </div>

                        {/* Invoice Metadata Banner */}
                        <div className="bg-slate-55 border border-slate-200 rounded-lg p-3 grid grid-cols-4 gap-4 mt-4 text-[11px] font-semibold text-slate-500">
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Document Number</span>
                            <span className="font-bold text-slate-850 font-mono text-xs">{completedInvoice.invoiceNo}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Billing Date</span>
                            <span className="font-bold text-slate-800">
                              {new Date(completedInvoice.date).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Payment Terms</span>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-800 font-mono">
                              {completedInvoice.paymentMode === "credit" ? "Trade Credit" : completedInvoice.paymentMode}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Booking Agent</span>
                            <span className="font-bold text-slate-800">{completedInvoice.salesmanName || "Office Counter Direct"}</span>
                          </div>
                        </div>

                        {/* Billing Items Table */}
                        <table className="w-full text-left text-[11px] border-collapse mt-5">
                          <thead>
                            <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[9px]">
                              <th className="px-3 py-2 border border-slate-700 text-center w-[4%]">S.No</th>
                              <th className="px-3 py-2 border border-slate-700 w-[30%]">Medicine Description</th>
                              <th className="px-3 py-2 border border-slate-700 text-center w-[12%]">Batch</th>
                              <th className="px-3 py-2 border border-slate-700 text-center w-[10%]">Expiry</th>
                              <th className="px-3 py-2 border border-slate-700 text-right w-[8%]">Qty</th>
                              <th className="px-3 py-2 border border-slate-700 text-right w-[6%]">Free</th>
                              <th className="px-3 py-2 border border-slate-700 text-right w-[10%]">PTR (₹)</th>
                              <th className="px-3 py-2 border border-slate-700 text-right w-[6%]">Disc%</th>
                              <th className="px-3 py-2 border border-slate-700 text-right w-[6%]">GST%</th>
                              <th className="px-3 py-2 border border-slate-700 text-right w-[10%]">Total (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {completedInvoice.items.map((item: any, idx: number) => (
                              <tr key={idx} className={`font-semibold text-slate-700 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                                <td className="px-3 py-2 border border-slate-200 text-center font-mono">{idx + 1}</td>
                                <td className="px-3 py-2 border border-slate-200">
                                  <p className="font-extrabold text-slate-900 leading-tight">{item.medicineName}</p>
                                </td>
                                <td className="px-3 py-2 border border-slate-200 text-center font-mono font-bold text-slate-800">{item.batchNo}</td>
                                <td className="px-3 py-2 border border-slate-200 text-center font-mono text-[10px] text-slate-500">{item.expiryDate}</td>
                                <td className="px-3 py-2 border border-slate-200 text-right font-mono font-bold text-slate-800">{item.quantity}</td>
                                <td className="px-3 py-2 border border-slate-200 text-right font-mono font-bold text-slate-500">{item.freeQuantity}</td>
                                <td className="px-3 py-2 border border-slate-200 text-right font-mono">₹{(item.ptrPaisa / 100).toFixed(2)}</td>
                                <td className="px-3 py-2 border border-slate-200 text-right font-mono text-rose-650">{item.discountPercent}%</td>
                                <td className="px-3 py-2 border border-slate-200 text-right font-mono">{item.gstRate}%</td>
                                <td className="px-3 py-2 border border-slate-200 text-right font-mono font-bold text-slate-900">₹{(item.lineTotalPaisa / 100).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Financial Totals & Slabs Breakdowns */}
                        <div className="grid grid-cols-12 gap-6 mt-6">
                          
                          {/* GST Slab Table (Left) */}
                          <div className="col-span-7 space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Detailed GST Tax Breakdowns</p>
                            <table className="w-full text-left text-[10px] border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 font-bold text-slate-500">
                                  <th className="py-1">GST Slab</th>
                                  <th className="py-1 text-right">Taxable Amt</th>
                                  <th className="py-1 text-right">CGST (6%)</th>
                                  <th className="py-1 text-right">SGST (6%)</th>
                                  <th className="py-1 text-right">Total GST</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {Array.from(new Set(completedInvoice.items.map((i: any) => i.gstRate))).map((rate: any) => {
                                  const slabItems = completedInvoice.items.filter((i: any) => i.gstRate === rate);
                                  const slabTaxable = slabItems.reduce((acc: number, cur: any) => acc + cur.lineTotalPaisa - Math.round(cur.lineTotalPaisa * (rate / (100 + rate))), 0);
                                  const slabGst = slabItems.reduce((acc: number, cur: any) => acc + Math.round(cur.lineTotalPaisa * (rate / (100 + rate))), 0);
                                  const halfGst = Math.round(slabGst / 2);
                                  return (
                                    <tr key={rate}>
                                      <td className="py-1 font-bold text-slate-800">GST {rate}%</td>
                                      <td className="py-1 text-right font-mono">₹{(slabTaxable / 100).toFixed(2)}</td>
                                      <td className="py-1 text-right font-mono">₹{(halfGst / 100).toFixed(2)}</td>
                                      <td className="py-1 text-right font-mono">₹{(halfGst / 100).toFixed(2)}</td>
                                      <td className="py-1 text-right font-mono font-bold text-slate-900">₹{(slabGst / 100).toFixed(2)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Financial Summary Totals (Right) */}
                          <div className="col-span-5 space-y-2 border border-slate-200 rounded-lg p-3 bg-white font-semibold text-slate-655 text-xs shadow-xs">
                            <div className="flex justify-between">
                              <span>Invoice Subtotal:</span>
                              <span className="font-mono text-slate-900">₹{(completedInvoice.calculations.subtotalPaisa / 100).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-rose-650">
                              <span>Scheme Discounts:</span>
                              <span className="font-mono">- ₹{(completedInvoice.calculations.discountPaisa / 100).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>CGST + SGST Tax:</span>
                              <span className="font-mono text-slate-900">₹{(completedInvoice.calculations.gstPaisa / 100).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-sm">
                              <span className="text-emerald-700">NET PAYABLE:</span>
                              <span className="font-mono text-emerald-600">₹{(completedInvoice.calculations.totalPaisa / 100).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Words */}
                        <div className="mt-4 border-t border-slate-200 pt-3 text-[10px] text-slate-500 font-semibold italic">
                          <strong className="text-[9px] uppercase font-black text-slate-400 not-italic block mb-0.5">Total Amount in Words</strong>
                          {numberToRupeesWords(completedInvoice.calculations.totalPaisa)}
                        </div>
                      </div>

                      {/* Footer Terms & Signatures */}
                      <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-[10px] font-semibold text-slate-400 mt-8">
                        {/* Terms */}
                        <div className="col-span-2 space-y-1 text-slate-450 leading-normal pr-4 font-medium">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Standard B2B Terms & Conditions</p>
                          <p>1. Pharmaceutical B2B goods once billed cannot be returned or swapped.</p>
                          <p>2. Outstandings on trade credit must be settled within active distributor terms.</p>
                          <p>3. Subject to local business jurisdiction laws only.</p>
                        </div>
                        
                        {/* Signature */}
                        <div className="flex flex-col justify-between items-center h-20 text-center pl-2">
                          <div className="w-full text-center mt-2 relative">
                            <span className="font-serif italic font-black text-slate-800 text-sm tracking-wide block mb-0.5">{tenant?.name || "Medicare Distributors"}</span>
                            <span className="block text-[10px] font-mono text-slate-400 font-normal select-none pointer-events-none opacity-40 leading-none">authorized electronic copy</span>
                            <div className="w-full border-b border-dashed border-slate-350 mt-2"></div>
                          </div>
                          <span className="text-[9px] uppercase font-bold tracking-wider">Authorized Signatory</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // ────────────────────────────────────────────────────────
                    // 3-INCH THERMAL RECEIPT
                    // ────────────────────────────────────────────────────────
                    <div className="flex flex-col justify-start w-full">
                      {/* Store Header */}
                      <div className="text-center space-y-0.5">
                        <h3 className="font-black text-xs text-slate-900 uppercase">{tenant?.name || "MEDICARE DISTRIBUTORS"}</h3>
                        <p className="text-[9px] text-slate-505">B2B Wholesale Pharma Hub</p>
                        <p className="text-[9px] font-mono">GSTIN: {tenant?.gstin || "07AAAAA1111A1Z1"}</p>
                        <p className="text-[9px] font-mono">DL No: {tenant?.drugLicenseNo || "DL-20B-12948"}</p>
                        <p className="text-[9px]">Phone: {tenant?.phone || "+91 99999 88888"}</p>
                      </div>
                      
                      <p className="my-2 border-b border-dashed border-slate-800"></p>
                      
                      {/* Invoice Details */}
                      <div className="space-y-0.5 text-[10px] text-slate-700">
                        <p className="font-mono"><strong>Ref:</strong> {completedInvoice.invoiceNo}</p>
                        <p><strong>Date:</strong> {new Date(completedInvoice.date).toLocaleString("en-IN")}</p>
                        <p><strong>Retailer:</strong> {completedInvoice.partyName}</p>
                        {completedInvoice.partyGstin && <p className="font-mono"><strong>GST:</strong> {completedInvoice.partyGstin}</p>}
                        <p><strong>Terms:</strong> <span className="uppercase font-bold">{completedInvoice.paymentMode === "credit" ? "Trade Credit" : completedInvoice.paymentMode}</span></p>
                        {completedInvoice.salesmanName && <p><strong>Salesman:</strong> {completedInvoice.salesmanName}</p>}
                      </div>
                      
                      <p className="my-2 border-b border-dashed border-slate-800"></p>
                      
                      {/* Items List */}
                      <div className="space-y-1.5 text-slate-850 font-semibold">
                        <div className="flex justify-between font-bold text-[9px] uppercase">
                          <span className="w-[50%]">Item Description</span>
                          <span className="w-[20%] text-right font-mono">Qty</span>
                          <span className="w-[30%] text-right font-mono">Total</span>
                        </div>
                        
                        <p className="border-b border-slate-200/50 my-1"></p>
                        
                        {completedInvoice.items.map((item: any, idx: number) => (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex justify-between font-bold">
                              <span className="w-[50%] truncate">{item.medicineName}</span>
                              <span className="w-[20%] text-right font-mono">{item.quantity}{item.freeQuantity > 0 ? `+${item.freeQuantity}` : ""}</span>
                              <span className="w-[30%] text-right font-mono">₹{(item.lineTotalPaisa / 100).toFixed(0)}</span>
                            </div>
                            <div className="text-[9px] text-slate-500 font-mono pl-1 font-normal">
                              Batch: {item.batchNo} • Exp: {item.expiryDate} • Rate: ₹{(item.ptrPaisa / 100).toFixed(0)}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <p className="my-2 border-b border-dashed border-slate-800"></p>
                      
                      {/* Totals Summary */}
                      <div className="space-y-1 font-mono text-right text-[10px] text-slate-700">
                        <p className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>₹{(completedInvoice.calculations.subtotalPaisa / 100).toFixed(2)}</span>
                        </p>
                        <p className="flex justify-between text-slate-505">
                          <span>Discounts:</span>
                          <span>-₹{(completedInvoice.calculations.discountPaisa / 100).toFixed(2)}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>CGST/SGST Tax:</span>
                          <span>₹{(completedInvoice.calculations.gstPaisa / 100).toFixed(2)}</span>
                        </p>
                        <p className="flex justify-between font-black text-slate-900 border-t border-slate-300 pt-1 text-xs">
                          <span>NET PAYABLE:</span>
                          <span>₹{(completedInvoice.calculations.totalPaisa / 100).toFixed(2)}</span>
                        </p>
                      </div>
                      
                      <p className="my-2 border-b border-dashed border-slate-800"></p>
                      
                      {/* Footer Message */}
                      <div className="text-center space-y-1 text-[9px] font-sans text-slate-550 italic font-semibold">
                        <p className="font-bold text-slate-800 not-italic">Thank you for your business!</p>
                        <p>Please reconcile B2B credit outstandings within active distributor terms.</p>
                        <p className="text-[8px] font-mono text-slate-300 mt-2 not-italic">Powered by Medicare B2B</p>
                      </div>
                    </div>
                  )}
                  
                </div>
                
              </div>
            </div>
            
            <div className="px-4 sm:px-6 py-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 no-print">
              <button
                onClick={() => setCompletedInvoice(null)}
                className="h-10 px-4 rounded-xl border border-slate-700 bg-slate-800 font-bold text-slate-300 hover:text-white transition-colors text-xs active:scale-[0.98]"
              >
                Close Print Console
              </button>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Download PDF */}
                <button
                  onClick={async () => {
                    try {
                      setSharingPdf(true);
                      const html2canvas = (await import("html2canvas")).default;
                      const { jsPDF } = await import("jspdf");
                      const element = document.getElementById("b2b-print-target");
                      if (!element) { toast.error("Preview not found."); return; }
                      element.classList.add("force-b2b-pdf-capture");
                      const canvas = await html2canvas(element as HTMLElement, { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: "#ffffff", windowWidth: 1100 });
                      element.classList.remove("force-b2b-pdf-capture");
                      const imgData = canvas.toDataURL("image/jpeg", 0.95);
                      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
                      const imgWidth = 210; const pageHeight = 297;
                      const imgHeight = (canvas.height * imgWidth) / canvas.width;
                      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
                      if (imgHeight > pageHeight) { pdf.addPage(); pdf.addImage(imgData, "JPEG", 0, pageHeight - imgHeight, imgWidth, imgHeight); }
                      const url = URL.createObjectURL(pdf.output("blob"));
                      const a = document.createElement("a"); a.href = url; a.download = `B2B_${completedInvoice.invoiceNo}.pdf`;
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                      setTimeout(() => URL.revokeObjectURL(url), 3000);
                      toast.success("✅ PDF downloaded!");
                    } catch { toast.error("PDF generation failed."); } finally { setSharingPdf(false); }
                  }}
                  disabled={sharingPdf}
                  className="h-10 px-3 rounded-xl border border-slate-600 bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 text-xs flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                  {sharingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Download</span> PDF
                </button>

                {/* WhatsApp Share — NOW GENERATES REAL PDF */}
                <button
                  onClick={async () => {
                    if (!completedInvoice) return;
                    try {
                      setSharingPdf(true);
                      const html2canvas = (await import("html2canvas")).default;
                      const { jsPDF } = await import("jspdf");
                      const element = document.getElementById("b2b-print-target");
                      if (!element) { toast.error("Invoice preview not found."); return; }
                      element.classList.add("force-b2b-pdf-capture");
                      const canvas = await html2canvas(element as HTMLElement, { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: "#ffffff", windowWidth: 1100 });
                      element.classList.remove("force-b2b-pdf-capture");
                      const imgData = canvas.toDataURL("image/jpeg", 0.95);
                      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
                      const imgWidth = 210; const imgHeight = (canvas.height * imgWidth) / canvas.width;
                      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
                      const blob = pdf.output("blob");
                      const pdfFile = new File([blob], `B2B_${completedInvoice.invoiceNo}.pdf`, { type: "application/pdf" });
                      const cleaned = (completedInvoice.partyPhone || "").replace(/\D/g, "");
                      const phone = cleaned.length === 10 ? `91${cleaned}` : cleaned;
                      const waMsg = encodeURIComponent(`📦 *B2B Invoice ${completedInvoice.invoiceNo}*\n🏪 Retailer: *${completedInvoice.partyName}*\n💰 Net: *₹${(completedInvoice.calculations.totalPaisa/100).toFixed(2)}*\n_PDF invoice attached._`);
                      const waUrl = phone ? `https://wa.me/${phone}?text=${waMsg}` : `https://wa.me/?text=${waMsg}`;
                      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                        await navigator.share({ files: [pdfFile], title: `B2B Invoice ${completedInvoice.invoiceNo}`, text: "B2B invoice PDF attached." });
                        toast.success("✅ PDF shared on WhatsApp!");
                      } else {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href = url; a.download = `B2B_${completedInvoice.invoiceNo}.pdf`;
                        document.body.appendChild(a); a.click(); document.body.removeChild(a);
                        setTimeout(() => URL.revokeObjectURL(url), 3000);
                        setTimeout(() => window.open(waUrl, "_blank", "noopener,noreferrer"), 600);
                        toast.success("✅ PDF downloaded! Attach it in the WhatsApp window that's opening.", { duration: 8000 });
                      }
                    } catch (err: any) {
                      if (err?.name !== "AbortError") toast.error("PDF share failed.");
                    } finally { setSharingPdf(false); }
                  }}
                  disabled={sharingPdf}
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs flex items-center gap-2 shadow-md active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {sharingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  {sharingPdf ? "Generating..." : "Share PDF on WhatsApp"}
                </button>

                <button
                  onClick={() => window.print()}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-white shadow-md active:scale-[0.98] transition-all text-xs flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Trigger</span> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility function to convert numbers to Indian Rupees Words
function numberToRupeesWords(paisa: number): string {
  if (isNaN(paisa) || paisa < 0) return "Zero Rupees Only";
  const totalRupees = Math.floor(paisa / 100);
  if (totalRupees === 0) return "Zero Rupees Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) {
      const unit = n % 10;
      return tens[Math.floor(n / 10)] + (unit ? " " + ones[unit] : "");
    }
    const rem = n % 100;
    return ones[Math.floor(n / 100)] + " Hundred" + (rem ? " and " + convertLessThanThousand(rem) : "");
  }

  let num = totalRupees;
  let wordResult = "";

  if (Math.floor(num / 10000000) > 0) {
    wordResult += convertLessThanThousand(Math.floor(num / 10000000)) + " Crore ";
    num %= 10000000;
  }
  if (Math.floor(num / 100000) > 0) {
    wordResult += convertLessThanThousand(Math.floor(num / 100000)) + " Lakh ";
    num %= 100000;
  }
  if (Math.floor(num / 1000) > 0) {
    wordResult += convertLessThanThousand(Math.floor(num / 1000)) + " Thousand ";
    num %= 1000;
  }
  if (num > 0) {
    wordResult += convertLessThanThousand(num);
  }

  return wordResult.trim() + " Rupees Only";
}
