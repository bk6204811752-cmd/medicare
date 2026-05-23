"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type SelectItem = {
  id: string;
  name: string;
  gstRate?: number;
  hsnCode?: string;
  mrpPaisa?: number;
};

export function AddStockForm({ medicines, suppliers }: { medicines: SelectItem[]; suppliers: SelectItem[] }) {
  const router = useRouter();
  const [medicineId, setMedicineId] = useState(medicines[0]?.id ?? "");
  const selected = medicines.find((medicine) => medicine.id === medicineId);
  const [saving, setSaving] = useState(false);

  async function submit(formData: FormData) {
    setSaving(true);
    const payload = {
      medicineId,
      supplierId: String(formData.get("supplierId") || ""),
      batchNo: String(formData.get("batchNo") || ""),
      mfgDate: String(formData.get("mfgDate") || ""),
      expiryDate: String(formData.get("expiryDate") || ""),
      purchaseRatePaisa: Math.round(Number(formData.get("purchaseRate") || 0) * 100),
      mrpPaisa: Math.round(Number(formData.get("mrp") || 0) * 100),
      saleRatePaisa: Math.round(Number(formData.get("saleRate") || 0) * 100),
      gstRate: Number(formData.get("gstRate") || selected?.gstRate || 12),
      hsnCode: String(formData.get("hsnCode") || selected?.hsnCode || ""),
      quantity: Number(formData.get("quantity") || 0),
      reorderLevel: Number(formData.get("reorderLevel") || 10),
      rackLocation: String(formData.get("rackLocation") || "")
    };

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "Unable to save stock");
        return;
      }

      toast.success("Stock saved and inventory updated");
      router.push("/shop/inventory");
      router.refresh();
    } catch {
      toast.error("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={submit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-600">Medicine</span>
        <select name="medicineId" className="h-11 w-full rounded-md border border-slate-300 px-3" value={medicineId} onChange={(event) => setMedicineId(event.target.value)}>
          {medicines.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name}</option>)}
        </select>
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-slate-600">Supplier</span>
        <select name="supplierId" className="h-11 w-full rounded-md border border-slate-300 px-3">
          <option value="">No supplier</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
      </label>
      <Field name="batchNo" label="Batch no" required />
      <Field name="mfgDate" label="MFG date" type="date" />
      <Field name="expiryDate" label="Expiry date" type="date" required />
      <Field name="quantity" label="Quantity" type="number" required />
      <Field name="purchaseRate" label="Purchase rate" type="number" step="0.01" required />
      <Field key={`mrp-${medicineId}`} name="mrp" label="MRP" type="number" step="0.01" defaultValue={selected?.mrpPaisa ? String(selected.mrpPaisa / 100) : ""} required />
      <Field key={`sale-${medicineId}`} name="saleRate" label="Sale rate" type="number" step="0.01" defaultValue={selected?.mrpPaisa ? String(selected.mrpPaisa / 100) : ""} required />
      <Field key={`gst-${medicineId}`} name="gstRate" label="GST rate" type="number" defaultValue={String(selected?.gstRate ?? 12)} required />
      <Field key={`hsn-${medicineId}`} name="hsnCode" label="HSN code" defaultValue={selected?.hsnCode ?? ""} />
      <Field name="reorderLevel" label="Reorder level" type="number" defaultValue="10" />
      <Field name="rackLocation" label="Rack location" />
      <button disabled={saving} className="min-h-11 rounded-md bg-med-green font-semibold text-white disabled:opacity-60 md:col-span-2">
        {saving ? "Saving..." : "Save stock"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  step,
  required
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <input name={name} type={type} step={step} defaultValue={defaultValue} required={required} className="h-11 w-full rounded-md border border-slate-300 px-3" />
    </label>
  );
}
