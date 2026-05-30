"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { 
  ChevronLeft, ChevronRight, Filter, Search, 
  AlertTriangle, CalendarClock, DollarSign, Percent, Trash2,
  Grid3X3, List
} from "lucide-react";
import { daysUntil, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type StockStatus = "all" | "healthy" | "low" | "expiring" | "expired";
const PAGE_SIZE = 50;

interface StockistInventoryRow {
  id: string;
  batchNo: string;
  expiryDate: Date;
  purchaseRatePaisa: number;
  ptrPaisa: number;
  ptsPaisa: number;
  mrpPaisa: number;
  quantity: number;
  reorderLevel: number;
  rackLocation: string | null;
  medicine: {
    id: string;
    name: string;
    composition: string | null;
    category: string | null;
    manufacturer: string | null;
    barcode: string | null;
    packSize: string | null;
    gstRate: number;
  };
  supplier?: {
    id: string;
    name: string;
  } | null;
}

export function StockistInventoryTable({ rows }: { rows: StockistInventoryRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [manufacturer, setManufacturer] = useState("all");
  const [supplier, setSupplier] = useState("all");
  const [status, setStatus] = useState<StockStatus>("all");
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [showFilters, setShowFilters] = useState(false);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; batchNo: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const categories = useMemo(() => {
    return Array.from(
      new Set(rows.map((row) => row.medicine.category).filter(Boolean))
    ).sort() as string[];
  }, [rows]);

  const manufacturers = useMemo(() => {
    return Array.from(
      new Set(rows.map((row) => row.medicine.manufacturer).filter(Boolean))
    ).sort() as string[];
  }, [rows]);

  const suppliers = useMemo(() => {
    return Array.from(
      new Set(rows.map((row) => row.supplier?.name).filter(Boolean))
    ).sort() as string[];
  }, [rows]);

  // Pre-compute days until expiry
  const rowsWithExpiry = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      _days: daysUntil(row.expiryDate),
    }));
  }, [rows]);

  // Aggregate metrics
  const { lowCount, expiryCount, ptsValue, ptrValue } = useMemo(() => {
    return {
      lowCount: rowsWithExpiry.filter((r) => r.quantity <= r.reorderLevel).length,
      expiryCount: rowsWithExpiry.filter((r) => r._days <= 60).length,
      ptsValue: rowsWithExpiry.reduce((sum, r) => sum + (r.ptsPaisa || r.purchaseRatePaisa) * r.quantity, 0),
      ptrValue: rowsWithExpiry.reduce((sum, r) => sum + r.ptrPaisa * r.quantity, 0),
    };
  }, [rowsWithExpiry]);

  // Multi-word token search: each word must match somewhere in the haystack
  const filteredRows = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return rowsWithExpiry
      .filter((row) => {
        const days = row._days;
        const low = row.quantity <= row.reorderLevel;
        const expired = days < 0;
        const expiring = days >= 0 && days <= 60;
        
        const haystack = [
          row.medicine.name,
          row.medicine.composition,
          row.medicine.manufacturer,
          row.medicine.category,
          row.medicine.barcode,
          row.batchNo,
          row.rackLocation,
          row.supplier?.name
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        // Every token must be present in the haystack (multi-word AND search)
        if (tokens.length > 0 && !tokens.every(t => haystack.includes(t))) return false;
        if (category !== "all" && row.medicine.category !== category) return false;
        if (manufacturer !== "all" && row.medicine.manufacturer !== manufacturer) return false;
        if (supplier !== "all" && row.supplier?.name !== supplier) return false;
        
        if (status === "healthy" && (low || expiring || expired)) return false;
        if (status === "low" && !low) return false;
        if (status === "expiring" && !expiring) return false;
        if (status === "expired" && !expired) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Sort expired & near-expiry to the top, then sort alphabetically by medicine name
        const aRisk = Number(a.quantity <= a.reorderLevel) + Number(a._days <= 60);
        const bRisk = Number(b.quantity <= b.reorderLevel) + Number(b._days <= 60);
        return bRisk - aRisk || a._days - b._days || a.medicine.name.localeCompare(b.medicine.name);
      });
  }, [category, query, rowsWithExpiry, status, manufacturer, supplier]);

  async function handleDeleteBatch() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/inventory?id=${deleteConfirm.id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete");
      toast.success(`✅ Batch "${deleteConfirm.batchNo}" of "${deleteConfirm.name}" deleted from stock.`);
      setDeleteConfirm(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete batch");
    } finally {
      setDeleting(false);
    }
  }

  // Pagination bounds checking
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedRows = filteredRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const activeFilterCount = [
    category !== "all",
    manufacturer !== "all",
    supplier !== "all",
    status !== "all",
  ].filter(Boolean).length;

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Delete Medicine Batch?</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-1">
              <p className="text-sm font-bold text-red-900">Do you really want to delete this medicine from your stock?</p>
              <p className="text-xs text-red-700 font-semibold">Medicine: <span className="font-black">{deleteConfirm.name}</span></p>
              <p className="text-xs text-red-700 font-semibold">Batch No: <span className="font-mono font-black">{deleteConfirm.batchNo}</span></p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                ⚠️ The stock quantity will be set to zero and this batch will be permanently hidden. This change is logged as a stock adjustment.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl border border-slate-200 bg-white font-semibold text-slate-600 hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBatch}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl bg-red-600 font-bold text-white hover:bg-red-700 active:scale-95 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {deleting ? "Deleting..." : "Yes, Delete Batch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📊 Metrics Dashboard Grid */}
      <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <div className="glass-card p-3 sm:p-4 flex flex-col justify-between h-20 sm:h-24 bg-white shadow-xs hover:shadow transition-all duration-200">
          <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Visible Lots</span>
          <span className="text-xl sm:text-2xl font-black text-slate-800 mt-1">{filteredRows.length} <span className="text-xs text-slate-400 font-bold">batches</span></span>
          <span className="text-[9px] text-slate-450 font-bold flex items-center gap-1">
            <Search className="h-3 w-3 text-emerald-500" /> Filtered dynamically
          </span>
        </div>

        <div className="glass-card p-3 sm:p-4 flex flex-col justify-between h-20 sm:h-24 bg-white shadow-xs hover:shadow transition-all duration-200">
          <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Low Stock Lots</span>
          <span className={`text-xl sm:text-2xl font-black mt-1 ${lowCount > 0 ? "text-orange-600" : "text-emerald-650"}`}>{lowCount}</span>
          <span className="text-[9px] text-slate-450 font-bold flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-orange-500" /> <span className="hidden sm:inline">Requires distributor reorder</span><span className="sm:hidden">Reorder needed</span>
          </span>
        </div>

        <div className="glass-card p-3 sm:p-4 flex flex-col justify-between h-20 sm:h-24 bg-white shadow-xs hover:shadow transition-all duration-200">
          <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Expiry / Near Risk</span>
          <span className={`text-xl sm:text-2xl font-black mt-1 ${expiryCount > 0 ? "text-rose-600" : "text-emerald-650"}`}>{expiryCount}</span>
          <span className="text-[9px] text-slate-450 font-bold flex items-center gap-1">
            <CalendarClock className="h-3 w-3 text-rose-500" /> Expiring in &lt;60 days
          </span>
        </div>

        <div className="glass-card p-3 sm:p-4 flex flex-col justify-between h-20 sm:h-24 bg-white shadow-xs hover:shadow transition-all duration-200 col-span-2 lg:col-span-1">
          <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Distribution Valuation</span>
          <div className="mt-1 flex flex-col">
            <span className="text-base sm:text-lg font-black text-slate-800 leading-tight">PTR: {formatCurrency(ptrValue)}</span>
            <span className="text-[10px] text-slate-400 font-bold">PTS (Cost): {formatCurrency(ptsValue)}</span>
          </div>
          <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Live portfolio net value
          </span>
        </div>
      </div>

      {/* 🔍 Search Bar */}
      <div className="glass-card p-3 sm:p-4">
        <div className="flex gap-2 mb-3">
          <label className="relative flex-1 block">
            <Search className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
            <input
              className="h-10 sm:h-11 w-full rounded-lg border border-slate-200 pl-9 sm:pl-10 pr-4 outline-none focus:border-med-green focus:ring-1 focus:ring-med-green/20 text-sm font-semibold text-slate-700 placeholder:text-slate-400 bg-slate-50/50"
              placeholder="Search drug, batch, composition..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`h-10 sm:h-11 px-3 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-all ${showFilters || activeFilterCount > 0 ? "border-med-green bg-med-green/10 text-med-green" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="h-5 w-5 rounded-full bg-med-green text-white text-[10px] font-black flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
          {/* View toggle - hidden on mobile, show on md+ */}
          <div className="hidden md:flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`h-10 sm:h-11 px-3 flex items-center gap-1.5 text-xs font-bold transition-all ${viewMode === "table" ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`h-10 sm:h-11 px-3 flex items-center gap-1.5 text-xs font-bold transition-all ${viewMode === "cards" ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Advanced Filters - Collapsible */}
        {showFilters && (
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-slate-100 animate-slide-up">
            <label className="relative block">
              <Filter className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
              <select 
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs font-bold text-slate-700 bg-white" 
                value={category} 
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <select 
              className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 bg-white" 
              value={manufacturer} 
              onChange={(e) => {
                setManufacturer(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">All Manufacturers</option>
              {manufacturers.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select 
              className="h-10 rounded-lg border border-slate-205 px-3 text-xs font-bold text-slate-700 bg-white" 
              value={supplier} 
              onChange={(e) => {
                setSupplier(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select 
              className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 bg-white" 
              value={status} 
              onChange={(e) => {
                setStatus(e.target.value as StockStatus);
                setPage(0);
              }}
            >
              <option value="all">All stock status</option>
              <option value="healthy">Healthy Stock</option>
              <option value="low">Low Stock</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired Batches</option>
            </select>

            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setCategory("all");
                  setManufacturer("all");
                  setSupplier("all");
                  setStatus("all");
                  setPage(0);
                }}
                className="h-10 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors sm:col-span-2 lg:col-span-1"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* 📋 Distribution Stocks — Desktop Table View */}
      <div className={`glass-card overflow-hidden ${viewMode === "cards" ? "hidden md:block" : ""}`}>
        {/* Mobile Card View (always shown on mobile) */}
        <div className="md:hidden p-3 space-y-3">
          {paginatedRows.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No matching distribution batches found.
            </div>
          ) : (
            paginatedRows.map((item, index) => {
              const days = item._days;
              const isExpired = days < 0;
              const isExpiring = days >= 0 && days <= 60;
              const isFefoPick = index < 3 && item.quantity > 0;
              const cost = item.ptsPaisa || item.purchaseRatePaisa;
              const sell = item.ptrPaisa;
              const profit = sell - cost;
              const marginPct = sell > 0 ? Math.round((profit / sell) * 100) : 0;
              const isLow = item.quantity <= item.reorderLevel;

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3.5 bg-white shadow-xs transition-all ${
                    isExpired ? "border-red-200 bg-red-50/30" : 
                    isLow ? "border-orange-200 bg-orange-50/20" : 
                    isExpiring ? "border-yellow-200 bg-yellow-50/10" : 
                    "border-slate-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 text-sm leading-tight">{item.medicine.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{item.medicine.composition || "Composition unlisted"}</p>
                      {item.medicine.manufacturer && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                            Mfg: {item.medicine.manufacturer}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isExpired ? (
                        <span className="text-[9px] font-extrabold uppercase tracking-wide text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">Expired</span>
                      ) : isFefoPick ? (
                        <span className="text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">FEFO Pick</span>
                      ) : null}
                      <button
                        onClick={() => setDeleteConfirm({ id: item.id, name: item.medicine.name, batchNo: item.batchNo })}
                        title="Delete this batch"
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Batch</span>
                      <p className="font-mono font-bold text-slate-700 text-xs">{item.batchNo}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Expiry</span>
                      <p className={`text-xs font-bold ${isExpired ? "text-red-500" : isExpiring ? "text-orange-500" : "text-slate-700"}`}>
                        {formatDate(item.expiryDate.toISOString())}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">PTS (Cost)</span>
                      <p className="font-mono text-xs text-slate-600 font-bold">{formatCurrency(cost)}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">PTR (Wholesale)</span>
                      <p className="font-mono text-xs text-slate-800 font-bold">{formatCurrency(sell)}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">MRP</span>
                      <p className="font-mono text-xs text-slate-500">{formatCurrency(item.mrpPaisa)}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Margin</span>
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded ${
                        marginPct > 15 ? "text-emerald-700 bg-emerald-50" : marginPct > 5 ? "text-sky-700 bg-sky-50" : "text-amber-700 bg-amber-50"
                      }`}>
                        <Percent className="h-2.5 w-2.5 shrink-0" /> {marginPct}%
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between border-t border-slate-100 pt-1.5 mt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Qty (Lots)</span>
                        <span className={`font-mono font-bold text-base ${isLow ? "text-orange-500 font-extrabold" : "text-slate-800"}`}>
                          {item.quantity}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">/ Reorder: {item.reorderLevel}</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {item.rackLocation || "MAIN_WH"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block p-4 sm:p-5 overflow-hidden">
          <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs bg-white">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-display font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-3">Medicine / Formulation</th>
                  <th className="px-4 py-3">Batch & Expiry</th>
                  <th className="px-4 py-3 text-center">Picking Sequence</th>
                  <th className="px-4 py-3 text-right">PTS (Cost)</th>
                  <th className="px-4 py-3 text-right">PTR (Wholesale)</th>
                  <th className="px-4 py-3 text-right">MRP</th>
                  <th className="px-4 py-3 text-right">Margin</th>
                  <th className="px-4 py-3 text-right">Qty (Lots)</th>
                  <th className="px-4 py-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 bg-slate-50/50 border-dashed border-slate-200">
                      No matching distribution batches found. Search or filter again.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((item, index) => {
                    const days = item._days;
                    const isExpired = days < 0;
                    const isExpiring = days >= 0 && days <= 60;
                    const isFefoPick = index < 3 && item.quantity > 0;
                    
                    // Calculate Margin between PTS (our cost) and PTR (retailer selling price)
                    const cost = item.ptsPaisa || item.purchaseRatePaisa;
                    const sell = item.ptrPaisa;
                    const profit = sell - cost;
                    const marginPct = sell > 0 ? Math.round((profit / sell) * 100) : 0;

                    return (
                      <tr key={item.id} className="hover:bg-emerald-50/10 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-med-navy text-sm leading-snug">
                            {item.medicine.name}
                          </p>
                          <p className="text-[10px] text-slate-455 font-bold mt-0.5 max-w-xs truncate">
                            {item.medicine.composition || "Composition unlisted"}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {item.medicine.manufacturer && (
                              <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                                Mfg: {item.medicine.manufacturer}
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 font-extrabold bg-slate-100 px-1.5 py-0.5 rounded">
                              Loc: {item.rackLocation || "MAIN_WH"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-mono font-bold text-slate-700 text-xs">Batch: {item.batchNo}</p>
                          <p className={`text-[10px] font-bold mt-0.5 ${isExpired ? "text-red-500" : isExpiring ? "text-orange-500" : "text-slate-400"}`}>
                            Exp: {formatDate(item.expiryDate.toISOString())}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {isExpired ? (
                            <span className="inline-flex text-[9px] font-extrabold uppercase tracking-wider text-red-650 bg-red-50 border border-red-100/50 px-2 py-0.5 rounded-full">🔴 Expired</span>
                          ) : isFefoPick ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/70 animate-pulse">
                              ⭐ FEFO Pick {index + 1}
                            </span>
                          ) : (
                            <span className="inline-flex text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Pick {index + 1}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-500 font-bold">
                          {formatCurrency(cost)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(sell)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-450 text-xs">
                          {formatCurrency(item.mrpPaisa)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded ${
                            marginPct > 15 ? "text-emerald-700 bg-emerald-50" : marginPct > 5 ? "text-sky-700 bg-sky-50" : "text-amber-700 bg-amber-50"
                          }`}>
                            <Percent className="h-2.5 w-2.5 shrink-0" /> {marginPct}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`font-mono font-bold text-sm ${item.quantity <= item.reorderLevel ? "text-orange-500 font-extrabold" : "text-slate-800"}`}>
                            {item.quantity}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium">Reorder: {item.reorderLevel}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => setDeleteConfirm({ id: item.id, name: item.medicine.name, batchNo: item.batchNo })}
                            title="Delete this batch"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Pagination Controller ─── */}
      {filteredRows.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold text-slate-400">
            Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} batches
          </p>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-250 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (safePage < 3) {
                pageNum = i;
              } else if (safePage > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = safePage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                    pageNum === safePage 
                      ? "bg-med-green text-white shadow-sm font-extrabold scale-105" 
                      : "border border-slate-250 hover:bg-slate-50 text-slate-650"
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-250 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
