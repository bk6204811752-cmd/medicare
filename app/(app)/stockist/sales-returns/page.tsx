"use client";

import React, { useEffect, useState, useTransition } from "react";
import { 
  PackageMinus, Plus, X, Search, Clock, CreditCard, 
  CheckCircle2, Box, Sparkles, Loader2, RotateCcw, HelpCircle
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

type SalesReturn = {
  id: string;
  returnNo: string;
  partyName: string;
  partyId: string;
  reason: string;
  totalPaisa: number;
  createdAt: string;
  items: ReturnItem[];
};

type Party = {
  id: string;
  name: string;
  outstandingPaisa: number;
};

type InvoiceItem = {
  name: string;
  qty: number;
  rate: number;
  total: number;
  batchNo: string;
  mrpPaisa?: number;
  hsnCode?: string;
  manufacturer?: string;
  packSize?: string;
};

type Invoice = {
  id: string;
  date: string;
  refNo: string;
  debitPaisa: number;
  paidPaisa: number;
  status: string;
  items: InvoiceItem[];
};

export default function StockistSalesReturnsPage() {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // Form State
  const [partyId, setPartyId] = useState("");
  const [reason, setReason] = useState("");
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({}); // medicineName: quantity

  const fetchData = async () => {
    try {
      const [returnsRes, partiesRes] = await Promise.all([
        fetch("/api/stockist/sales-returns").then((r) => r.json()),
        fetch("/api/stockist/parties").then((r) => r.json())
      ]);
      setReturns(returnsRes.data || []);
      setParties(partiesRes.data || []);
    } catch (err) {
      console.error("Failed to load sales returns context:", err);
      toast.error("Failed to sync return portal datasets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch selected party's invoices when partyId changes
  useEffect(() => {
    if (!partyId) {
      setInvoices([]);
      setSelectedInvoiceId("");
      setSelectedItems({});
      return;
    }

    setLoadingInvoices(true);
    fetch(`/api/stockist/parties/ledger?partyId=${encodeURIComponent(partyId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ledger) {
          const invoiceRows = data.ledger.filter((row: any) => row.type === "invoice");
          setInvoices(invoiceRows);
        } else {
          setInvoices([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch party invoices:", err);
        toast.error("Could not load invoices for selected party");
      })
      .finally(() => setLoadingInvoices(false));
  }, [partyId]);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  const handleSubmit = async () => {
    if (!partyId || !reason) {
      toast.error("Select a chemist party and enter a valid reason");
      return;
    }

    if (!selectedInvoiceId) {
      toast.error("Select a B2B sales invoice to log return items");
      return;
    }

    // Compile items to return
    const returnItems: any[] = [];
    Object.entries(selectedItems).forEach(([itemName, qty]) => {
      if (qty > 0) {
        const invItem = selectedInvoice?.items.find((item) => item.name === itemName);
        if (invItem) {
          // Find related inventoryItem ID.
          // In POS billing pos, we can query details.
          // For now, let's look up inventory from the selected invoice
          // Or we query `/api/inventory`
          returnItems.push({
            medicineName: itemName,
            batchNo: invItem.batchNo,
            quantity: qty,
            ratePaisa: invItem.rate,
            // Fallback inventoryId: in Medicare, inventoryItem holds medicineId/batchNo.
            // Let's get active inventory items matching name and batch to get the correct inventoryItem ID.
            // We fetch the active inventory inside POST API, so we just pass name and batch!
            // Wait, we need inventoryId to decrement / increment stock!
            // Let's pass the inventoryId directly.
            // Let's check: B2BSaleItem stores inventoryId! Let's fetch the inventoryId from the invoice details.
            // Wait, does `/api/stockist/parties/ledger` return the inventoryId?
            // YES! In ledger/route.ts, we did NOT return the inventoryId, but let's check!
            // Oh, we mapped s.items.map(...) and did not include inventoryId. That's fine! 
            // We can query the inventoryItem matching medicineName & batchNo inside the POST route, 
            // which is much safer and resilient anyway! So we can just pass name and batch!
            // Wait, in POST API:
            // "for (const item of items) { await tx.inventoryItem.update({ where: { id: item.inventoryId } ... }) }"
            // If the client doesn't pass inventoryId, the transaction can search for the first active inventoryItem 
            // belonging to that tenant and having that medicineName and batchNo!
            // Let's modify the POST API to search for `inventoryItem` by `medicineName` and `batchNo` 
            // if `inventoryId` is not provided, making it highly robust!
          });
        }
      }
    });

    if (returnItems.length === 0) {
      toast.error("Select at least one medicine item to return");
      return;
    }

    setSaving(true);
    try {
      // 1. Fetch stockist inventory to resolve inventoryId for matching medicine & batch
      const invRes = await fetch("/api/inventory").then((r) => r.json());
      const inventoryList = invRes.data || [];

      const compiledItems = returnItems.map((ri) => {
        const matchingInv = inventoryList.find((inv: any) => 
          inv.medicine.name.toLowerCase() === ri.medicineName.toLowerCase() &&
          inv.batchNo.toLowerCase() === ri.batchNo.toLowerCase()
        );
        if (!matchingInv) {
          throw new Error(`Could not locate warehouse stock item for ${ri.medicineName} (Batch: ${ri.batchNo})`);
        }
        return {
          ...ri,
          inventoryId: matchingInv.id
        };
      });

      const res = await fetch("/api/stockist/sales-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId, reason, items: compiledItems })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to create return note");

      toast.success(`Sales Return ${resData.data.returnNo} recorded! ₹${(resData.data.totalPaisa / 100).toFixed(2)} credited.`);
      setShowForm(false);
      setPartyId("");
      setReason("");
      setSelectedInvoiceId("");
      setSelectedItems({});
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to record Sales Return");
    } finally {
      setSaving(false);
    }
  };

  const filteredReturns = returns.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.returnNo.toLowerCase().includes(q) ||
      r.partyName.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q)
    );
  });

  const totalReturnsPaisa = returns.reduce((sum, r) => sum + r.totalPaisa, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-lg" />
        <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden animate-fade-in">
      <PageHeader 
        title="B2B Sales Returns & Credit Notes" 
        description="Record returned stock from retail chemists and generate ledger credit notes" 
        action={
          <button 
            onClick={() => setShowForm(true)} 
            className="inline-flex items-center gap-2 rounded-xl bg-med-green px-4 py-2.5 text-xs font-bold text-white hover:bg-med-greenDark transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Plus className="h-4.5 w-4.5" /> Log Chemist Return
          </button>
        } 
      />

      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <PackageMinus className="h-5 w-5" />
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Claims Logged</span>
            <span className="text-xl font-bold text-slate-800 mt-1 block">
              {returns.length} credit notes
            </span>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stock Reconciliation</span>
            <span className="text-xl font-bold text-slate-800 mt-1 block">
              Auto-restocked ✓
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
            placeholder="Search return notes, chemist party..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 placeholder:text-slate-400 bg-white"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs bg-white">
          <table className="w-full min-w-[700px] text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500 font-display font-bold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3">Return Note#</th>
                <th className="px-4 py-3">Chemist Party</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3 text-right">Credit Value</th>
                <th className="px-4 py-3 text-center">Date</th>
                <th className="px-4 py-3 text-center">Items</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors font-medium text-slate-700">
                  <td className="px-4 py-3.5 font-mono text-xs font-bold text-med-navy">{r.returnNo}</td>
                  <td className="px-4 py-3.5 text-slate-800 font-bold">{r.partyName}</td>
                  <td className="px-4 py-3.5 text-slate-500 max-w-[220px] truncate">{r.reason}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700">{formatCurrency(r.totalPaisa)}</td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-500">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-block bg-slate-100 font-mono text-[10px] font-bold px-2 py-0.5 rounded text-slate-600">
                      {r.items.length} meds
                    </span>
                  </td>
                </tr>
              ))}
              {filteredReturns.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 bg-slate-50/20">
                    <PackageMinus className="h-10 w-10 mx-auto mb-3 text-slate-350" />
                    <p className="font-semibold text-sm">No return records found</p>
                    <p className="text-xs text-slate-400 mt-1">Log a chemist return using the top-right button.</p>
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
                <PackageMinus className="h-5.5 w-5.5 text-med-green" /> Log B2B Sales Return & Credit Note
              </h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Chemist Party *</label>
                <select 
                  value={partyId} 
                  onChange={(e) => { setPartyId(e.target.value); setInvoices([]); setSelectedInvoiceId(""); setSelectedItems({}); }}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold focus:border-med-green outline-none bg-white text-slate-700"
                >
                  <option value="">Select Retailer Party</option>
                  {parties.map((p) => <option key={p.id} value={p.id}>{p.name} (Due: ₹{(p.outstandingPaisa/100).toLocaleString()})</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Return Reason *</label>
                <input 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  placeholder="e.g. Near expiry stock returned, damaged batches"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold focus:border-med-green outline-none text-slate-700 placeholder:text-slate-400" 
                />
              </div>

              {partyId && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  {loadingInvoices ? (
                    <div className="flex items-center justify-center py-10 gap-2">
                      <Loader2 className="h-5 w-5 text-med-green animate-spin" />
                      <span className="text-xs text-slate-500 font-bold">Querying billing records...</span>
                    </div>
                  ) : invoices.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center font-semibold bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      No B2B credit invoice history found for this party.
                    </p>
                  ) : (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Select B2B Invoice *</label>
                        <select 
                          value={selectedInvoiceId} 
                          onChange={(e) => { setSelectedInvoiceId(e.target.value); setSelectedItems({}); }}
                          className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold focus:border-med-green outline-none bg-white text-slate-700"
                        >
                          <option value="">Select invoice to credit items from</option>
                          {invoices.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.refNo} ({formatDate(inv.date)}) • Total: ₹{(inv.debitPaisa/100).toLocaleString()} • {inv.status.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedInvoice && (
                        <div className="space-y-3">
                          <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Select Medicines to Return</label>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-none">
                            {selectedInvoice.items.map((item) => (
                              <div key={item.name} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/10">
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{item.name}</p>
                                  <p className="text-[10px] text-slate-450 font-bold mt-0.5">
                                    Batch: {item.batchNo} | Qty Invoiced: {item.qty} | Rate: {formatCurrency(item.rate)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400">Return Qty:</span>
                                  <input 
                                    type="number" 
                                    min={0} 
                                    max={item.qty} 
                                    value={selectedItems[item.name] ?? 0}
                                    onChange={(e) => setSelectedItems((prev) => ({ 
                                      ...prev, 
                                      [item.name]: Math.min(Number(e.target.value), item.qty) 
                                    }))}
                                    className="h-9 w-16 rounded-lg border border-slate-300 px-2 text-center text-xs font-bold focus:border-med-green outline-none"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
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
                disabled={saving || !selectedInvoiceId} 
                className="rounded-xl bg-med-green px-6 py-2.5 text-xs font-bold text-white hover:bg-med-greenDark disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Recording Return...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Credit Party Account
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
