"use client";

import { useEffect, useState } from "react";
import { PackageMinus, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";

type SaleReturn = {
  id: string; returnNo: string; invoiceNo: string; customerName: string | null;
  reason: string; refundPaisa: number; status: string; createdAt: string | null;
  items: { id: string; medicineName: string; batchNo: string; quantity: number; refundPaisa: number }[];
};

type SaleItem = {
  id: string; inventory_id: string; medicine_name: string; batch_no: string;
  quantity: number; total_paisa: number; sale_rate_paisa: number;
};

export default function SaleReturnsPage() {
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [saleData, setSaleData] = useState<{ sale: Record<string, unknown>; items: SaleItem[] } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchReturns = () => {
    fetch("/api/sale-returns").then((r) => r.json()).then((d) => setReturns(d.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { fetchReturns(); }, []);

  const searchInvoice = async () => {
    if (!invoiceSearch.trim()) return;
    const res = await fetch(`/api/sales?id=${encodeURIComponent(invoiceSearch.trim())}`);
    const data = await res.json();
    if (data.data?.sale) {
      setSaleData(data.data);
      setSelectedItems({});
    } else { toast.error("Invoice not found"); }
  };

  const toggleItem = (item: SaleItem, qty: number) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (qty <= 0) { delete next[item.id]; } else { next[item.id] = Math.min(qty, item.quantity); }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!saleData || !reason) { toast.error("Fill in reason and select items"); return; }
    const items = Object.entries(selectedItems).filter(([, qty]) => qty > 0).map(([itemId, quantity]) => {
      const item = saleData.items.find((i) => i.id === itemId)!;
      return {
        saleItemId: itemId, inventoryId: String(item.inventory_id),
        medicineName: String(item.medicine_name), batchNo: String(item.batch_no),
        quantity, refundPaisa: Math.round(Number(item.sale_rate_paisa) * quantity)
      };
    });
    if (items.length === 0) { toast.error("Select at least one item to return"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/sale-returns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: String(saleData.sale.id), reason, items })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Sale return processed");
      setShowForm(false); setSaleData(null); setReason(""); setInvoiceSearch(""); setSelectedItems({});
      fetchReturns();
    } catch (e) { toast.error((e as Error).message); }
    setSaving(false);
  };

  if (loading) return <div className="space-y-4"><div className="h-8 w-48 skeleton" /><div className="h-64 skeleton rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Sale Returns" description="Process customer returns and refunds" action={
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-med-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-med-greenDark transition-colors">
          <Plus className="h-4 w-4" /> Process Return
        </button>
      } />

      {/* Return Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-lg p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-bold text-med-navy">Process Sale Return</h2>
              <button onClick={() => setShowForm(false)} className="rounded-md p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            {/* Invoice search */}
            <div className="flex gap-2">
              <input value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchInvoice()}
                placeholder="Enter invoice number or sale ID" className="flex-1 h-11 rounded-md border border-slate-300 px-3 focus:border-med-green outline-none" />
              <button onClick={searchInvoice} className="rounded-md bg-med-green px-4 text-white hover:bg-med-greenDark"><Search className="h-4 w-4" /></button>
            </div>

            {saleData && (
              <>
                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                  <p><strong>Invoice:</strong> {String(saleData.sale.invoice_no)}</p>
                  <p><strong>Customer:</strong> {String(saleData.sale.customer_name ?? "Walk-in")}</p>
                  <p><strong>Total:</strong> {formatCurrency(Number(saleData.sale.total_paisa))}</p>
                </div>

                <h3 className="mt-4 text-sm font-semibold text-med-navy">Select items to return:</h3>
                <div className="mt-2 space-y-2">
                  {saleData.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-med-navy">{String(item.medicine_name)}</p>
                        <p className="text-xs text-slate-500">Batch {String(item.batch_no)} | Sold: {item.quantity} | Rate: {formatCurrency(Number(item.sale_rate_paisa))}</p>
                      </div>
                      <input type="number" min={0} max={item.quantity} value={selectedItems[item.id] ?? 0}
                        onChange={(e) => toggleItem(item, Number(e.target.value))}
                        className="h-10 w-20 rounded-md border border-slate-300 px-2 text-center focus:border-med-green outline-none" />
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="text-sm font-medium text-slate-700">Reason *</label>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for return"
                    className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 focus:border-med-green outline-none" />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
                  <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-med-green px-6 py-2.5 text-sm font-semibold text-white hover:bg-med-greenDark disabled:opacity-60">
                    {saving ? "Processing..." : "Process Return"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Returns Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                {["Return#", "Invoice#", "Customer", "Reason", "Refund", "Date", "Items"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-med-navy">{r.returnNo}</td>
                  <td className="px-4 py-3">{r.invoiceNo}</td>
                  <td className="px-4 py-3">{r.customerName ?? "Walk-in"}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{r.reason}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{formatCurrency(r.refundPaisa)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(r.createdAt ?? "")}</td>
                  <td className="px-4 py-3">{r.items.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {returns.length === 0 && <div className="py-16 text-center text-slate-400"><PackageMinus className="h-10 w-10 mx-auto mb-3 text-slate-300" /><p>No sale returns yet</p></div>}
      </div>
    </div>
  );
}
