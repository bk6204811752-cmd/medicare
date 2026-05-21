"use client";

import { useEffect, useState } from "react";
import { PackageX, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";

type PurchaseReturn = {
  id: string; returnNo: string; supplierName: string; reason: string;
  totalPaisa: number; status: string; createdAt: string | null;
  items: { id: string; medicineName: string; batchNo: string; quantity: number; ratePaisa: number; totalPaisa: number }[];
};
type Supplier = { id: string; name: string };
type InventoryRow = { id: string; batchNo: string; quantity: number; purchaseRatePaisa: number; supplierId: string | null; medicine: { name: string } };

export default function PurchaseReturnsPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [reason, setReason] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    Promise.all([
      fetch("/api/purchase-returns").then((r) => r.json()),
      fetch("/api/suppliers").then((r) => r.json()),
      fetch("/api/inventory").then((r) => r.json())
    ]).then(([pr, s, inv]) => {
      setReturns(pr.data ?? []);
      setSuppliers(s.data ?? []);
      setInventory(inv.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const supplierInventory = inventory.filter((i) => i.supplierId === supplierId && i.quantity > 0);

  const handleSubmit = async () => {
    if (!supplierId || !reason) { toast.error("Select supplier and enter reason"); return; }
    const items = Object.entries(selectedItems).filter(([, qty]) => qty > 0).map(([invId, quantity]) => {
      const inv = inventory.find((i) => i.id === invId)!;
      return { inventoryId: invId, medicineName: inv.medicine.name, batchNo: inv.batchNo, quantity, ratePaisa: inv.purchaseRatePaisa };
    });
    if (items.length === 0) { toast.error("Select at least one item"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/purchase-returns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, reason, items })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Purchase return created");
      setShowForm(false); setSupplierId(""); setReason(""); setSelectedItems({});
      fetchData();
    } catch (e) { toast.error((e as Error).message); }
    setSaving(false);
  };

  if (loading) return <div className="space-y-4"><div className="h-8 w-48 skeleton" /><div className="h-64 skeleton rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Returns" description="Return stock to suppliers and track debit notes" action={
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-med-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-med-greenDark transition-colors">
          <Plus className="h-4 w-4" /> Create Return
        </button>
      } />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-lg p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-bold text-med-navy">Purchase Return / Debit Note</h2>
              <button onClick={() => setShowForm(false)} className="rounded-md p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Supplier *</label>
              <select value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setSelectedItems({}); }}
                className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 focus:border-med-green outline-none">
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-slate-700">Reason *</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Expired stock, damaged goods"
                className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 focus:border-med-green outline-none" />
            </div>

            {supplierId && (
              <>
                <h3 className="mt-5 text-sm font-semibold text-med-navy">Select items from this supplier ({supplierInventory.length} items)</h3>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {supplierInventory.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-med-navy">{inv.medicine.name}</p>
                        <p className="text-xs text-slate-500">Batch {inv.batchNo} | Stock: {inv.quantity} | Cost: {formatCurrency(inv.purchaseRatePaisa)}</p>
                      </div>
                      <input type="number" min={0} max={inv.quantity} value={selectedItems[inv.id] ?? 0}
                        onChange={(e) => setSelectedItems((prev) => ({ ...prev, [inv.id]: Math.min(Number(e.target.value), inv.quantity) }))}
                        className="h-10 w-20 rounded-md border border-slate-300 px-2 text-center focus:border-med-green outline-none" />
                    </div>
                  ))}
                  {supplierInventory.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No inventory from this supplier</p>}
                </div>
              </>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-med-green px-6 py-2.5 text-sm font-semibold text-white hover:bg-med-greenDark disabled:opacity-60">
                {saving ? "Creating..." : "Create Return"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              {["Return#", "Supplier", "Reason", "Total", "Date", "Items"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-med-navy">{r.returnNo}</td>
                  <td className="px-4 py-3 font-medium">{r.supplierName}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{r.reason}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(r.totalPaisa)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(r.createdAt ?? "")}</td>
                  <td className="px-4 py-3">{r.items.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {returns.length === 0 && <div className="py-16 text-center text-slate-400"><PackageX className="h-10 w-10 mx-auto mb-3 text-slate-300" /><p>No purchase returns yet</p></div>}
      </div>
    </div>
  );
}
