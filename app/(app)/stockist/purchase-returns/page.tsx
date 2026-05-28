"use client";

import React, { useEffect, useState } from "react";
import { 
  PackageX, Plus, X, Search, Clock, CreditCard, 
  CheckCircle2, Box, Sparkles, Loader2, RotateCcw, AlertTriangle
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

type ReturnItem = {
  id: string;
  medicineName: string;
  batchNo: string;
  quantity: number;
  ratePaisa: number;
  totalPaisa: number;
};

type PurchaseReturn = {
  id: string;
  returnNo: string;
  supplierName: string;
  supplierId: string;
  reason: string;
  totalPaisa: number;
  createdAt: string;
  items: ReturnItem[];
};

type Supplier = {
  id: string;
  name: string;
  balancePaisa: number;
};

type InventoryRow = {
  id: string;
  batchNo: string;
  quantity: number;
  purchaseRatePaisa: number;
  supplierId: string | null;
  medicine: {
    name: string;
  };
};

export default function StockistPurchaseReturnsPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState("");
  const [reason, setReason] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({}); // inventoryId: quantity

  const fetchData = async () => {
    try {
      const [returnsRes, suppliersRes, inventoryRes] = await Promise.all([
        fetch("/api/purchase-returns").then((r) => r.json()),
        fetch("/api/suppliers").then((r) => r.json()),
        fetch("/api/inventory").then((r) => r.json())
      ]);
      setReturns(returnsRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setInventory(inventoryRes.data || []);
    } catch (err) {
      console.error("Failed to load purchase returns context:", err);
      toast.error("Failed to sync return portal datasets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const supplierInventory = inventory.filter((i) => i.supplierId === supplierId && i.quantity > 0);

  const handleSubmit = async () => {
    if (!supplierId || !reason) {
      toast.error("Select a manufacturer and enter a return reason");
      return;
    }

    const items = Object.entries(selectedItems)
      .filter(([, qty]) => qty > 0)
      .map(([invId, quantity]) => {
        const inv = inventory.find((i) => i.id === invId)!;
        return {
          inventoryId: invId,
          medicineName: inv.medicine.name,
          batchNo: inv.batchNo,
          quantity,
          ratePaisa: inv.purchaseRatePaisa
        };
      });

    if (items.length === 0) {
      toast.error("Select at least one medicine batch item to return");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/purchase-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, reason, items })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to create return claim");

      toast.success(`Debit Note ${resData.data.returnNo} generated successfully!`);
      setShowForm(false);
      setSupplierId("");
      setReason("");
      setSelectedItems({});
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to record purchase return");
    } finally {
      setSaving(false);
    }
  };

  const filteredReturns = returns.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.returnNo.toLowerCase().includes(q) ||
      r.supplierName.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q)
    );
  });

  const totalReturnsPaisa = returns.reduce((sum, r) => sum + r.totalPaisa, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-lg" />
        <div className="h-64 bg-slate-55 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden animate-fade-in">
      <PageHeader 
        title="Distribution Purchase Returns" 
        description="Return near-expiry or surplus batch stock to manufacturers and track debit notes" 
        action={
          <button 
            onClick={() => setShowForm(true)} 
            className="inline-flex items-center gap-2 rounded-xl bg-med-green px-4 py-2.5 text-xs font-bold text-white hover:bg-med-greenDark transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Plus className="h-4.5 w-4.5" /> Log Debit Return
          </button>
        } 
      />

      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <PackageX className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Returned (YTD)</span>
            <span className="font-mono text-xl font-bold text-slate-800 mt-1 block">
              {formatCurrency(totalReturnsPaisa)}
            </span>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Debit Notes Tracked</span>
            <span className="text-xl font-bold text-slate-800 mt-1 block">
              {returns.length} claims sent
            </span>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Warehouse Reconciliation</span>
            <span className="text-xl font-bold text-slate-800 mt-1 block">
              Auto-deducted ✓
            </span>
          </div>
        </div>
      </div>

      {/* Main Table List */}
      <div className="glass-card p-4 sm:p-5 overflow-hidden">
        
        {/* Search Bar */}
        <div className="relative w-full max-w-sm mb-4">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search debit notes, manufacturer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 placeholder:text-slate-400 bg-white"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs bg-white">
          <table className="w-full min-w-[700px] text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500 font-display font-bold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3">Debit Return No.</th>
                <th className="px-4 py-3">Manufacturer</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3 text-right">Debit Amount</th>
                <th className="px-4 py-3 text-center">Date</th>
                <th className="px-4 py-3 text-center">Items</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors font-medium text-slate-700">
                  <td className="px-4 py-3.5 font-mono text-xs font-bold text-med-navy">{r.returnNo}</td>
                  <td className="px-4 py-3.5 text-slate-800 font-bold">{r.supplierName}</td>
                  <td className="px-4 py-3.5 text-slate-505 max-w-[220px] truncate">{r.reason}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">{formatCurrency(r.totalPaisa)}</td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-500">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-block bg-slate-100 font-mono text-[10px] font-bold px-2 py-0.5 rounded text-slate-600">
                      {r.items.length} lots
                    </span>
                  </td>
                </tr>
              ))}
              {filteredReturns.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 bg-slate-50/20">
                    <PackageX className="h-10 w-10 mx-auto mb-3 text-slate-350" />
                    <p className="font-semibold text-sm">No debit return claims logged yet</p>
                    <p className="text-xs text-slate-400 mt-1">Select batches to return to bulk manufacturers.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Return Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl p-6 border border-slate-100 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
              <h2 className="font-display text-lg font-extrabold text-med-navy flex items-center gap-2">
                <PackageX className="h-5.5 w-5.5 text-med-green" /> Log Purchase Return & Debit Note
              </h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Manufacturer *</label>
                <select 
                  value={supplierId} 
                  onChange={(e) => { setSupplierId(e.target.value); setSelectedItems({}); }}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold focus:border-med-green outline-none bg-white text-slate-700"
                >
                  <option value="">Select Manufacturer / CFA</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} (Balance: {formatCurrency(s.balancePaisa)})</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Debit Note Reason *</label>
                <input 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  placeholder="e.g. Near expiry lot return, drug recall by Cipla"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold focus:border-med-green outline-none text-slate-700 placeholder:text-slate-400" 
                />
              </div>

              {supplierId && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="text-xs font-extrabold text-slate-450 uppercase tracking-wider block">Select Stock Batches to Return</label>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-none">
                    {supplierInventory.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-205 bg-slate-50/10">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold text-slate-800 truncate">{inv.medicine.name}</p>
                          <p className="text-[10px] text-slate-450 font-bold mt-0.5">
                            Batch: {inv.batchNo} | Stock: {inv.quantity} | Rate: {formatCurrency(inv.purchaseRatePaisa)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400">Return Qty:</span>
                          <input 
                            type="number" 
                            min={0} 
                            max={inv.quantity} 
                            value={selectedItems[inv.id] ?? 0}
                            onChange={(e) => setSelectedItems((prev) => ({ 
                              ...prev, 
                              [inv.id]: Math.min(Number(e.target.value), inv.quantity) 
                            }))}
                            className="h-9 w-16 rounded-lg border border-slate-300 px-2 text-center text-xs font-bold focus:border-med-green outline-none"
                          />
                        </div>
                      </div>
                    ))}
                    {supplierInventory.length === 0 && (
                      <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/30 p-4 text-center">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-700 font-semibold text-left">
                          No active warehouse batches associated with this manufacturer. Create stock addition first.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button 
                onClick={() => setShowForm(false)} 
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={saving || !supplierId} 
                className="rounded-xl bg-med-green px-6 py-2.5 text-xs font-bold text-white hover:bg-med-greenDark disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating debit claim...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Create Return Note
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
