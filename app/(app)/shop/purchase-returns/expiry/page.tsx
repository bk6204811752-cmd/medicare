"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  RotateCcw, ShieldAlert, Award, FileText, CheckCircle2,
  RefreshCw, Loader2, ArrowRight, Search, Building2, Trash2,
  AlertTriangle, IndianRupee, Sparkles, AlertCircle
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

type ExpiryStockItem = {
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
  daysRemaining: number;
  isExpired: boolean;
};

export default function ExpiryAutoReturnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ExpiryStockItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [returning, setReturning] = useState(false);

  const fetchExpiryStock = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/reports/expiry-returns");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load data");
      setItems(data.data ?? []);
      
      // Auto select all for returns pre-filling
      const initialIds = new Set<string>();
      (data.data ?? []).forEach((item: any) => initialIds.add(item.inventoryId));
      setSelectedIds(initialIds);
    } catch (error) {
      toast.error("Failed to load expiring batches");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpiryStock();
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

  const refundValuePaisa = useMemo(() => {
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
      toast.error("Please select at least one batch to return");
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
          reason: "Automated Marg ERP Expiry Return - Expiring within 60 days",
          items: supItems.map((i) => ({
            inventoryId: i.inventoryId,
            medicineName: i.medicineName,
            batchNo: i.batchNo,
            quantity: i.quantity,
            ratePaisa: i.purchaseRatePaisa,
          })),
        };

        // Fallback for anonymous suppliers
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

      toast.success(`Successfully processed ${successCount} expiry return debit voucher(s)! Stock cleared.`);
      router.push("/shop/purchase-returns");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to return expiring batches");
    } finally {
      setReturning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden animate-fade-in">
      <PageHeader
        title="Expiry Auto-Return Manager"
        description="Marg ERP-style batch expiry forecasting and single-window distributor credit-note returns"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => fetchExpiryStock(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Audit Expiries
            </button>
            <button
              onClick={handleProcessReturns}
              disabled={returning || selectedIds.size === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition-colors shadow-sm active:scale-95 duration-150 disabled:opacity-50"
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

      {/* Expiry Risk Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-4 bg-rose-50/10 border border-rose-100/50">
          <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Critical Batches</h3>
            <p className="text-2xl font-extrabold text-slate-800">
              {items.filter(i => i.isExpired).length}{" "}
              <span className="text-xs text-rose-600 font-extrabold uppercase">Expired</span>
            </p>
            <p className="text-[10px] text-slate-450 font-semibold mt-0.5">Need immediate clearance</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4 bg-amber-50/10 border border-amber-100/50">
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Near Expiry (60d)</h3>
            <p className="text-2xl font-extrabold text-slate-800">
              {items.filter(i => !i.isExpired).length}{" "}
              <span className="text-xs text-slate-500 font-semibold">batches</span>
            </p>
            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Eligible for stockist return</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4 bg-emerald-50/10 border border-emerald-100/50">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-emerald-600 animate-bounce" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Salvage Value</h3>
            <p className="text-2xl font-extrabold text-emerald-700">{formatCurrency(refundValuePaisa)}</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Estimated credit notes</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search expiring batches by name, distributor, or chemical formula..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold text-slate-700"
          />
        </div>
      </div>

      {/* Table view */}
      <div className="glass-card p-0 overflow-hidden border border-slate-100 shadow-md">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
            <p className="text-sm font-semibold">Running multi-batch expiration timelines audit...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-base font-extrabold text-slate-700">No expiring batches found!</p>
            <p className="text-xs text-slate-400">All shelf products have long shelf life remaining.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                      checked={filteredItems.every((item) => selectedIds.has(item.inventoryId))}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="py-3.5 px-4">Medicine / Wholesaler</th>
                  <th className="py-3.5 px-4 text-center">Batch No</th>
                  <th className="py-3.5 px-4 text-center">Expiry Date</th>
                  <th className="py-3.5 px-4 text-center">Quantity</th>
                  <th className="py-3.5 px-4 text-center">Status / Terms</th>
                  <th className="py-3.5 px-4 text-right">Refund Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredItems.map((item) => {
                  const isChecked = selectedIds.has(item.inventoryId);
                  return (
                    <tr
                      key={item.inventoryId}
                      className={`hover:bg-slate-50/30 transition-colors ${
                        isChecked ? "bg-rose-50/5" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
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
                          🚛 Wholesaler: <span className="text-slate-650">{item.supplierName}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs font-semibold text-slate-650">
                        {item.batchNo}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs font-semibold text-slate-600">
                        {formatDate(item.expiryDate)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-650">
                        {item.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {item.isExpired ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[9px] font-black text-red-700 uppercase animate-pulse">
                            Expired ({Math.abs(item.daysRemaining)}d ago)
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-105 bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-bold text-amber-700 uppercase">
                            Due in {item.daysRemaining} days
                          </span>
                        )}
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

      {/* Floating total display */}
      {selectedIds.size > 0 && (
        <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-rose-100 bg-rose-50/5 shadow-lg animate-fade-in no-print">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <RotateCcw className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                You have selected <span className="font-extrabold text-rose-600">{selectedIds.size}</span> expiring batch(es) for stockist return.
              </p>
              <p className="text-sm font-extrabold text-slate-800">
                Potential supplier credit note: <span className="text-rose-600">{formatCurrency(refundValuePaisa)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleProcessReturns}
            disabled={returning}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm px-5 py-2.5 transition-all shadow-md active:scale-95 duration-100"
          >
            {returning ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <RotateCcw className="h-4.5 w-4.5" />
            )}
            Process Supplier Expiry Return
          </button>
        </div>
      )}
    </div>
  );
}
