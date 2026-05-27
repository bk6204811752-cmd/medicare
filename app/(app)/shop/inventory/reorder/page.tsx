"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, AlertTriangle, CheckCircle, Package, ArrowRight,
  Loader2, RefreshCw, ShoppingCart, Info, Search, ShieldAlert
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

type ReorderSuggestion = {
  medicineId: string;
  medicineName: string;
  genericName: string | null;
  category: string | null;
  currentStock: number;
  reorderLevel: number;
  suggestedReorderLevel: number;
  avgDailySales: number;
  sales30Days: number;
  suggestedQty: number;
  urgency: "critical" | "warning" | "adequate";
  preferredSupplierId: string | null;
  preferredSupplierName: string | null;
  ptrPaisa: number;
  mrpPaisa: number;
};

export default function SmartReorderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUrgency, setFilterUrgency] = useState<string>("all");

  const fetchSuggestions = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/reorder");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load data");
      
      const list: ReorderSuggestion[] = data.data ?? [];
      setSuggestions(list);
      
      // Initialize checkboxes and custom quantities
      const initialIds = new Set<string>();
      const initialQtys: Record<string, number> = {};
      list.forEach((item) => {
        initialIds.add(item.medicineId);
        initialQtys[item.medicineId] = item.suggestedQty;
      });
      setSelectedIds(initialIds);
      setQuantities(initialQtys);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load suggestions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredSuggestions.map((item) => item.medicineId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (medicineId: string) => {
    const next = new Set(selectedIds);
    if (next.has(medicineId)) {
      next.delete(medicineId);
    } else {
      next.add(medicineId);
    }
    setSelectedIds(next);
  };

  const handleQtyChange = (medicineId: string, val: number) => {
    setQuantities((prev) => ({
      ...prev,
      [medicineId]: Math.max(0, val),
    }));
  };

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((item) => {
      const matchesSearch =
        item.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.genericName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.preferredSupplierName || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesUrgency =
        filterUrgency === "all" || item.urgency === filterUrgency;

      return matchesSearch && matchesUrgency;
    });
  }, [suggestions, searchQuery, filterUrgency]);

  // Calculations
  const criticalCount = suggestions.filter((s) => s.urgency === "critical").length;
  const warningCount = suggestions.filter((s) => s.urgency === "warning").length;
  
  const estimatedCostPaisa = useMemo(() => {
    let total = 0;
    suggestions.forEach((item) => {
      if (selectedIds.has(item.medicineId)) {
        const qty = quantities[item.medicineId] ?? item.suggestedQty;
        total += qty * item.ptrPaisa;
      }
    });
    return total;
  }, [selectedIds, quantities, suggestions]);

  const handleBulkReorder = () => {
    const selectedItems = suggestions.filter((s) => selectedIds.has(s.medicineId));
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to reorder");
      return;
    }

    // Map to draft B2B cart format
    const draftCart = selectedItems.map((item) => ({
      medicineName: item.medicineName,
      quantity: quantities[item.medicineId] ?? item.suggestedQty,
      ratePaisa: item.ptrPaisa,
    }));

    // Save to local storage for integration
    localStorage.setItem("b2b_draft_cart", JSON.stringify(draftCart));
    toast.success("Draft items pre-filled! Redirecting to B2B ordering channel...");
    
    // Redirect to Single-Window B2B Ordering page
    router.push("/shop/order-stockist?draft=true");
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="Smart Reorder Engine"
        description="Medikabazaar-style Sales Velocity stock forecasting & auto-replenishment"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => fetchSuggestions(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Sync Inventory
            </button>
            <button
              onClick={handleBulkReorder}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-95 duration-150"
            >
              <ShoppingCart className="h-4 w-4" />
              Procure Selected ({selectedIds.size})
            </button>
          </div>
        }
      />

      {/* Medikabazaar Style Forecast Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Critical Shortages</h3>
            <p className="text-2xl font-extrabold text-slate-800">{criticalCount}</p>
            <p className="text-[10px] text-red-600 font-semibold mt-0.5">Stock exhausted or critical</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Low Stock Items</h3>
            <p className="text-2xl font-extrabold text-slate-800">{warningCount}</p>
            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Below optimal safety buffer</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Avg Daily Demand</h3>
            <p className="text-2xl font-extrabold text-slate-800">
              {suggestions.length > 0
                ? (suggestions.reduce((s, i) => s + i.avgDailySales, 0) / suggestions.length).toFixed(1)
                : "0.0"}{" "}
              <span className="text-xs text-slate-500 font-semibold">units</span>
            </p>
            <p className="text-[10px] text-blue-600 font-semibold mt-0.5">30-day forecast velocity</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Estimated Cost</h3>
            <p className="text-xl font-extrabold text-slate-800">{formatCurrency(estimatedCostPaisa)}</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Tax and wholesale margins pre-computed</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by drug name, generic formulation, or preferred supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-semibold text-slate-700"
          />
        </div>

        <div className="flex gap-2">
          {["all", "critical", "warning"].map((opt) => (
            <button
              key={opt}
              onClick={() => setFilterUrgency(opt)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold border transition-all ${
                filterUrgency === opt
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {opt === "all" ? "All Suggestions" : opt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions Table */}
      <div className="glass-card p-0 overflow-hidden border border-slate-100 shadow-md">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm font-semibold">Running Medikabazaar AI demand forecasting models...</p>
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
            <p className="text-base font-extrabold text-slate-700">All inventory levels optimized!</p>
            <p className="text-xs text-slate-400">Current stock covers sales velocity buffers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      checked={filteredSuggestions.every((item) => selectedIds.has(item.medicineId))}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="py-3.5 px-4">Medicine / Generic Formulation</th>
                  <th className="py-3.5 px-4 text-center">Current Qty</th>
                  <th className="py-3.5 px-4 text-center">Min Buffer</th>
                  <th className="py-3.5 px-4 text-center">30d Velocity</th>
                  <th className="py-3.5 px-4 text-center">Suggested Order</th>
                  <th className="py-3.5 px-4 text-center">Supplier Cost (PTR)</th>
                  <th className="py-3.5 px-4 text-center">Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSuggestions.map((item) => {
                  const isChecked = selectedIds.has(item.medicineId);
                  const qty = quantities[item.medicineId] ?? item.suggestedQty;

                  return (
                    <tr
                      key={item.medicineId}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isChecked ? "bg-emerald-50/10" : ""
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(item.medicineId)}
                        />
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-extrabold text-slate-700 truncate">{item.medicineName}</p>
                        {item.genericName && (
                          <span className="text-[10px] text-slate-400 font-semibold block truncate mt-0.5">
                            🧪 {item.genericName}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                          🚛 Preferred: <span className="text-slate-600">{item.preferredSupplierName}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-600">
                        {item.currentStock}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-500">
                        {item.reorderLevel} <span className="text-[9px] text-slate-400 block">Static Min</span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {item.sales30Days} <span className="text-[9px] text-slate-400 block">{item.avgDailySales}/day</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            value={qty}
                            onChange={(e) => handleQtyChange(item.medicineId, Number(e.target.value))}
                            className="w-16 px-1.5 py-1 text-xs border border-slate-200 rounded text-center font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">units</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <p className="font-bold text-slate-700">{formatCurrency(item.ptrPaisa)}</p>
                        <p className="text-[9px] text-slate-400 font-medium">MRP: {formatCurrency(item.mrpPaisa)}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${
                            item.urgency === "critical"
                              ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {item.urgency}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom CTA bar */}
      {selectedIds.size > 0 && (
        <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-100 bg-emerald-50/10 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Info className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                You have selected <span className="font-extrabold text-emerald-600">{selectedIds.size}</span> item(s) for auto-replenishment.
              </p>
              <p className="text-sm font-extrabold text-slate-800">
                Estimated Order Value: <span className="text-emerald-600">{formatCurrency(estimatedCostPaisa)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleBulkReorder}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-all active:scale-95 duration-150 shadow-md"
          >
            Route to B2B Order Channel
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
