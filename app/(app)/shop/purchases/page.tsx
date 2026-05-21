"use client";

import { useEffect, useState } from "react";
import { Plus, Truck, PackageCheck, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";

type PurchaseOrder = {
  id: string; poNumber: string; supplierName: string; status: string;
  totalPaisa: number; notes: string | null; orderDate: string | null;
  expectedDate: string | null; receivedDate: string | null;
  items: { id: string; medicineName: string; quantity: number; receivedQuantity: number; ratePaisa: number; totalPaisa: number }[];
};
type Supplier = { id: string; name: string };

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600", sent: "bg-sky-100 text-sky-700",
  partially_received: "bg-yellow-100 text-yellow-700", completed: "bg-emerald-100 text-emerald-700"
};

export default function PurchasesPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [items, setItems] = useState([{ medicineName: "", quantity: 1, ratePaisa: 0 }]);
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    Promise.all([
      fetch("/api/purchases").then((r) => r.json()),
      fetch("/api/suppliers").then((r) => r.json())
    ]).then(([p, s]) => {
      setOrders(p.data ?? []);
      setSuppliers(s.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const addItem = () => setItems((prev) => [...prev, { medicineName: "", quantity: 1, ratePaisa: 0 }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string | number) => setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handleSubmit = async () => {
    if (!supplierId) { toast.error("Select a supplier"); return; }
    if (items.some((i) => !i.medicineName || i.quantity < 1 || i.ratePaisa < 1)) { toast.error("Fill all item fields"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, notes, expectedDate: expectedDate || undefined, items: items.map((i) => ({ ...i, ratePaisa: Math.round(Number(i.ratePaisa) * 100) })) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`PO ${data.data?.poNumber ?? ""} created`);
      setShowForm(false);
      setSupplierId(""); setNotes(""); setExpectedDate(""); setItems([{ medicineName: "", quantity: 1, ratePaisa: 0 }]);
      fetchData();
    } catch (e) { toast.error((e as Error).message); }
    setSaving(false);
  };

  const handleReceive = async (po: PurchaseOrder) => {
    try {
      const res = await fetch("/api/purchases", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receive", poId: po.id, items: po.items.map((i) => ({ itemId: i.id, receivedQuantity: i.quantity })) })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`PO ${po.poNumber} marked as received`);
      fetchData();
    } catch (e) { toast.error((e as Error).message); }
  };

  if (loading) return <div className="space-y-4"><div className="h-8 w-48 skeleton" /><div className="h-64 skeleton rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Orders" description="Manage stock purchases from suppliers" action={
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-med-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-med-greenDark transition-colors">
          <Plus className="h-4 w-4" /> Create PO
        </button>
      } />

      {/* Create PO Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-lg p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-bold text-med-navy">New Purchase Order</h2>
              <button onClick={() => setShowForm(false)} className="rounded-md p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Supplier *</label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 focus:border-med-green focus:ring-2 focus:ring-med-green/20 outline-none">
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Expected Date</label>
                <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 focus:border-med-green focus:ring-2 focus:ring-med-green/20 outline-none" />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 focus:border-med-green focus:ring-2 focus:ring-med-green/20 outline-none" placeholder="Optional notes" />
            </div>
            <h3 className="mt-5 text-sm font-semibold text-med-navy">Items</h3>
            <div className="mt-2 space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end">
                  <input value={item.medicineName} onChange={(e) => updateItem(i, "medicineName", e.target.value)} placeholder="Medicine name" className="h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-med-green outline-none" />
                  <input type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} min={1} placeholder="Qty" className="h-10 rounded-md border border-slate-300 px-2 text-sm text-center focus:border-med-green outline-none" />
                  <input type="number" value={item.ratePaisa || ""} onChange={(e) => updateItem(i, "ratePaisa", Number(e.target.value))} placeholder="Rate ₹" step="0.01" className="h-10 rounded-md border border-slate-300 px-2 text-sm focus:border-med-green outline-none" />
                  {items.length > 1 && <button onClick={() => removeItem(i)} className="h-10 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4 mx-auto" /></button>}
                </div>
              ))}
            </div>
            <button onClick={addItem} className="mt-2 text-sm text-med-green font-semibold hover:underline">+ Add item</button>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-med-green px-6 py-2.5 text-sm font-semibold text-white hover:bg-med-greenDark disabled:opacity-60">
                {saving ? "Creating..." : "Create PO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                {["PO#", "Supplier", "Date", "Status", "Total", "Items", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-med-navy">{po.poNumber}</td>
                  <td className="px-4 py-3 font-medium">{po.supplierName}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(po.orderDate ?? "")}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[po.status] ?? "bg-slate-100"}`}>{po.status.replace("_", " ")}</span></td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(po.totalPaisa)}</td>
                  <td className="px-4 py-3">{po.items.length} items</td>
                  <td className="px-4 py-3">
                    {po.status !== "completed" && (
                      <button onClick={() => handleReceive(po)} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                        <PackageCheck className="h-3.5 w-3.5" /> Receive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && <div className="py-16 text-center text-slate-400"><Truck className="h-10 w-10 mx-auto mb-3 text-slate-300" /><p>No purchase orders yet</p><p className="text-xs mt-1">Create your first PO to start tracking purchases</p></div>}
      </div>
    </div>
  );
}
