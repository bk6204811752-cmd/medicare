"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function SupplierForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function submit(formData: FormData) {
    setSaving(true);
    const response = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") || ""),
        phone: String(formData.get("phone") || ""),
        email: String(formData.get("email") || ""),
        address: String(formData.get("address") || ""),
        gstin: String(formData.get("gstin") || ""),
        creditDays: Number(formData.get("creditDays") || 30),
        balancePaisa: Math.round(Number(formData.get("balance") || 0) * 100)
      })
    });
    const result = await response.json();
    setSaving(false);

    if (!response.ok) {
      toast.error(result.error ?? "Unable to save supplier");
      return;
    }

    toast.success("Supplier saved");
    router.push("/shop/suppliers");
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
      <Field name="name" label="Supplier name" required />
      <Field name="phone" label="Phone" type="tel" />
      <Field name="email" label="Email" type="email" />
      <Field name="gstin" label="GSTIN" />
      <Field name="creditDays" label="Credit days" type="number" defaultValue="30" />
      <Field name="balance" label="Opening payable" type="number" step="0.01" defaultValue="0" />
      <label className="space-y-2 md:col-span-2">
        <span className="text-sm font-medium text-slate-600">Address</span>
        <textarea name="address" rows={4} className="w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <button disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-med-green font-semibold text-white disabled:opacity-60 md:col-span-2">
        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save supplier"}
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
