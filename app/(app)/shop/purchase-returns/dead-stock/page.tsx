"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  RotateCcw, ShieldAlert, Award, FileText, CheckCircle2,
  RefreshCw, Loader2, ArrowRight, Search, Building2, Trash2,
  AlertTriangle, IndianRupee, HelpCircle
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

type DeadStockItem = {
  inventoryId: string;
  medicineName: string;
  genericName: string | null;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  purchaseRatePaisa: number;
  riskValuePaisa: number;
  supplierId: string | null;
  supplierName: string;
  daysInStock: number;
};

export default function DeadStockReturnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<DeadStockItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [returning, setReturning] = useState(false);

  const fetchDeadStock = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/reports/dead-stock");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load data");
      setItems(data.data ?? []);
      
      // Auto select all for return pre-filling
      const initialIds = new Set<string>();
      (data.data ?? []).forEach((item: any) => initialIds.add(item.inventoryId));
      setSelectedIds(initialIds);
    } catch (error) {
      toast.error("Failed to load dead stock candidates");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeadStock();
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredItems.map((item) => item.inventoryId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (inventoryId: string) => {
    const next = new Set(selectedIds);
    if (next.has(inventoryId)) {
      next.delete(inventoryId);
    } else {
      next.add(inventoryId);
    }
    setSelectedIds(next);
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.genericName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  const riskValuePaisa = useMemo(() => {
    let total = 0;
    items.forEach((item) => {
      if (selectedIds.has(item.inventoryId)) {
        total += item.riskValuePaisa;
      }
    });
    return total;
  }, [selectedIds, items]);

  const handleProcessReturns = async () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.inventoryId));
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    // Group items by supplierId
    const grouped = new Map<string, typeof selectedItems>();
    for (const item of selectedItems) {
      const supId = item.supplierId || "unknown";
      const list = grouped.get(supId) || [];
      list.push(item);
      grouped.set(supId, list);
    }

    setReturning(true);
    let successCount = 0;

    try {
      for (const [supId, supItems] of grouped.entries()) {
        const payload = {
          supplierId: supId === "unknown" ? supItems[0].supplierId : supId,
          reason: "Automated Gofrugal Dead Stock return - Zero sales in 90+ days",
          items: supItems.map((i) => ({
            inventoryId: i.inventoryId,
            medicineName: i.medicineName,
            batchNo: i.batchNo,
            quantity: i.quantity,
            ratePaisa: i.purchaseRatePaisa,
          })),
        };

        // If supplierId is null (anonymous), we need to prevent server crash by finding first supplier
        if (!payload.supplierId) {
          const supRes = await fetch("/api/suppliers");
          const supData = await supRes.json();
          if (supData.data && supData.data.length > 0) {
            payload.supplierId = supData.data[0].id;
          } else {
            throw new Error("Add at least one active Supplier to map returns.");
          }
        }

        const res = await fetch("/api/purchase-returns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to process supplier return");
        }
        successCount++;
      }

      toast.success(`Successfully processed ${successCount} supplier credit return(s)! Stock updated.`);
      router.push("/shop/purchase-returns");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to return dead stock");
    } finally {
      setReturning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="Dead Stock & Supplier Returns"
        description="Gofrugal-style auto-detection of dead stock batches (>90 days zero sales) and automated B2B reverse credit returns"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => fetchDeadStock(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Audit Ledger
            </button>
            <button
              onClick={handleProcessReturns}
              disabled={returning || selectedIds.size === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm active:scale-95 duration-150 disabled:opacity-50"
            >
              {returning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {returning ? "Returning..." : `Return Selected (${selectedIds.size})`}
            </button>
          </div>
        }
      />

      {/* Financial widget stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-4 bg-red-50/10 border border-red-100/50">
          <div className="h-10 w-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Risk Outstanding</h3>
            <p className="text-2xl font-extrabold text-slate-800">{items.length} batches</p>
            <p className="text-[10px] text-red-600 font-semibold mt-0.5">Expired demand capital risk</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4 bg-orange-50/10 border border-orange-100/50">
          <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Refund Value</h3>
            <p className="text-2xl font-extrabold text-slate-800">{formatCurrency(riskValuePaisa)}</p>
            <p className="text-[10px] text-orange-600 font-semibold mt-0.5">Potential supplier credits</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4 bg-emerald-50/10 border border-emerald-100/50">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Stock Saved</h3>
            <p className="text-2xl font-extrabold text-slate-800">
              {items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
              <span className="text-xs text-slate-500 font-semibold">units</span>
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Audited shelf slots cleared</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by drug name, supplier wholesaler, or generic formula..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold text-slate-700"
          />
        </div>
      </div>

      {/* Table view */}
      <div className="glass-card p-0 overflow-hidden border border-slate-100 shadow-md">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            <p className="text-sm font-semibold">Scrutinizing active shelf listings for low-velocity dead stock...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-base font-extrabold text-slate-700">Shelf turnover optimized!</p>
            <p className="text-xs text-slate-400">All high-stock items are selling frequently.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-4 w-4"
                      checked={filteredItems.every((item) => selectedIds.has(item.inventoryId))}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="py-3.5 px-4">Medicine / Wholesaler</th>
                  <th className="py-3.5 px-4 text-center">Batch No</th>
                  <th className="py-3.5 px-4 text-center">Shelf Stock</th>
                  <th className="py-3.5 px-4 text-center">Days Unsold</th>
                  <th className="py-3.5 px-4 text-center">Cost Rate (PTR)</th>
                  <th className="py-3.5 px-4 text-right">Refund Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredItems.map((item) => {
                  const isChecked = selectedIds.has(item.inventoryId);
                  return (
                    <tr
                      key={item.inventoryId}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isChecked ? "bg-red-50/10" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-4 w-4"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(item.inventoryId)}
                        />
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-extrabold text-slate-700 truncate">{item.medicineName}</p>
                        {item.genericName && (
                          <span className="text-[10px] text-slate-400 font-semibold block truncate mt-0.5">
                            🧪 {item.genericName}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                          🚛 Wholesaler: <span className="text-slate-600">{item.supplierName}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs font-semibold text-slate-600">
                        {item.batchNo}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                        {item.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-red-600 animate-pulse">
                        {item.daysInStock} <span className="text-[9px] text-slate-400 font-medium block">days unsold</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-650">
                        {formatCurrency(item.purchaseRatePaisa)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-800">
                        {formatCurrency(item.riskValuePaisa)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom action trigger bar */}
      {selectedIds.size > 0 && (
        <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-red-100 bg-red-50/5 shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <RotateCcw className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                You have selected <span className="font-extrabold text-red-600">{selectedIds.size}</span> dead stock batch(es) for reverse logistics.
              </p>
              <p className="text-sm font-extrabold text-slate-800">
                Potential supplier credit refund: <span className="text-red-600">{formatCurrency(riskValuePaisa)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleProcessReturns}
            disabled={returning}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-red-650 hover:bg-red-700 text-white font-extrabold text-sm px-5 py-2.5 transition-all shadow-md active:scale-95 duration-100"
          >
            {returning ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <RotateCcw className="h-4.5 w-4.5" />
            )}
            Process Reverse Logistics Return
          </button>
        </div>
      )}
    </div>
  );
}
