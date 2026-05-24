"use client";

import { Save, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";

export function SupplierForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [initialData, setInitialData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((res) => {
        const match = res.data?.find((s: any) => s.id === id);
        if (match) {
          setInitialData(match);
        } else {
          toast.error("Supplier profile not found");
        }
      })
      .catch((err) => {
        console.error("Error loading supplier details:", err);
        toast.error("Error loading supplier profile");
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function submit(formData: FormData) {
    setSaving(true);
    const response = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: id || undefined,
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

    toast.success(id ? "Supplier profile updated" : "Supplier saved");
    router.push("/shop/suppliers");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-med-green" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Loading profile details...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={id ? "Edit Supplier" : "Add Supplier"}
        description={id ? "Modify distributor contacts, GSTIN records, credit days limit, and payable balances." : "Create distributor profiles for purchase entries, GSTIN records, credit days, and payables."}
      />
      <form action={submit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <Field name="name" label="Supplier name" defaultValue={initialData?.name} required />
        <Field name="phone" label="Phone" type="tel" defaultValue={initialData?.phone || ""} />
        <Field name="email" label="Email" type="email" defaultValue={initialData?.email || ""} />
        <Field name="gstin" label="GSTIN" defaultValue={initialData?.gstin || ""} />
        <Field name="creditDays" label="Credit days" type="number" defaultValue={initialData ? initialData.creditDays.toString() : "30"} />
        <Field name="balance" label={id ? "Current outstanding balance" : "Opening payable"} type="number" step="0.01" defaultValue={initialData ? (initialData.balancePaisa / 100).toString() : "0"} />
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-600">Address</span>
          <textarea name="address" rows={4} defaultValue={initialData?.address || ""} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-med-green focus:ring-1 focus:ring-med-green" />
        </label>
        <button disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-med-green font-semibold text-white hover:bg-med-greenDark disabled:opacity-60 md:col-span-2 transition-colors">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? "Saving..." : id ? "Update profile" : "Save supplier"}
        </button>
      </form>
    </>
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
      <input name={name} type={type} step={step} defaultValue={defaultValue} required={required} className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-1 focus:ring-med-green" />
    </label>
  );
}
