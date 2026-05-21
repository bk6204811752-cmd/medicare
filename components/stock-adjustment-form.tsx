"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { LocalInventoryRow } from "@/lib/local-db";

export function StockAdjustmentForm({ rows }: { rows: LocalInventoryRow[] }) {
  const router = useRouter();
  const [inventoryId, setInventoryId] = useState(rows[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const selected = useMemo(() => rows.find((row) => row.id === inventoryId), [inventoryId, rows]);

  async function submit(formData: FormData) {
    const quantity = Number(formData.get("quantity") || 0);
    const direction = String(formData.get("direction") || "increase") === "decrease" ? -1 : 1;

    setSaving(true);
    const response = await fetch("/api/inventory/adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inventoryId,
        adjustmentType: String(formData.get("adjustmentType") || "correction"),
        quantityDelta: quantity * direction,
        reason: String(formData.get("reason") || ""),
        referenceNo: String(formData.get("referenceNo") || ""),
        notes: String(formData.get("notes") || "")
      })
    });
    const result = await response.json();
    setSaving(false);

    if (!response.ok) {
      toast.error(result.error ?? "Unable to save adjustment");
      return;
    }

    toast.success("Stock adjusted and movement logged");
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-2">
      <label className="space-y-2 lg:col-span-2">
        <span className="text-sm font-medium text-slate-600">Batch</span>
        <select className="h-11 w-full rounded-md border border-slate-300 px-3" value={inventoryId} onChange={(event) => setInventoryId(event.target.value)}>
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.medicine.name} | Batch {row.batchNo} | Stock {row.quantity}
            </option>
          ))}
        </select>
        {selected ? <p className="text-xs text-slate-500">Current stock: {selected.quantity}. Rack: {selected.rackLocation || "Not set"}.</p> : null}
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-600">Adjustment type</span>
        <select name="adjustmentType" className="h-11 w-full rounded-md border border-slate-300 px-3" defaultValue="correction">
          <option value="opening">Opening balance</option>
          <option value="damage">Damaged stock</option>
          <option value="loss">Loss or theft</option>
          <option value="sample">Sample/free issue</option>
          <option value="correction">Physical count correction</option>
          <option value="return_in">Sale return to stock</option>
          <option value="return_out">Purchase return to supplier</option>
        </select>
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-600">Direction</span>
        <select name="direction" className="h-11 w-full rounded-md border border-slate-300 px-3">
          <option value="increase">Increase stock</option>
          <option value="decrease">Decrease stock</option>
        </select>
      </label>
      <Field name="quantity" label="Quantity" type="number" defaultValue="1" required />
      <Field name="referenceNo" label="Reference no" />
      <label className="space-y-2 lg:col-span-2">
        <span className="text-sm font-medium text-slate-600">Reason</span>
        <input name="reason" required className="h-11 w-full rounded-md border border-slate-300 px-3" placeholder="Physical count, expired return, damaged strip..." />
      </label>
      <label className="space-y-2 lg:col-span-2">
        <span className="text-sm font-medium text-slate-600">Notes</span>
        <textarea name="notes" rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <button disabled={saving || !rows.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-med-green font-semibold text-white disabled:opacity-60 lg:col-span-2">
        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save adjustment"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <input name={name} type={type} min={type === "number" ? 1 : undefined} defaultValue={defaultValue} required={required} className="h-11 w-full rounded-md border border-slate-300 px-3" />
    </label>
  );
}
