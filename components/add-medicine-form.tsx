"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Database, Loader2, Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { DrugMasterSuggestion } from "@/components/drug-master-confirm-modal";

type AddMedicineFormProps = {
  onSuccess?: (result: { medicine: any; inventory: any }) => void;
  onCancel?: () => void;
  prefillBarcode?: string;
  prefillName?: string;
  mode?: "standalone" | "inline";
  showInventoryFields?: boolean;
};

const GST_OPTIONS = [0, 5, 12, 18, 28] as const;
const SCHEDULE_OPTIONS = ["OTC", "G", "H", "H1", "X"] as const;
const DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Ointment", "Drops", "Powder", "Inhaler", "Gel", "Spray", "Suspension", "Solution", "Sachet", "Other"];
const CATEGORIES = ["Pain relief", "Antibiotic", "Antifungal", "Antiviral", "Diabetes", "Cardiac", "Vitamin", "Hydration", "Respiratory", "Dermatology", "Gastro", "Neuro", "Ophthalmic", "Hormonal", "Other"];

// ─── Medicine Database suggestion type ─────────────────────────
type MedicineDbHit = DrugMasterSuggestion;

export function AddMedicineForm({ onSuccess, onCancel, prefillBarcode = "", prefillName = "", mode = "standalone", showInventoryFields = true }: AddMedicineFormProps) {
  const [saving, setSaving] = useState(false);
  const [showInventory, setShowInventory] = useState(mode === "inline" && showInventoryFields);
  const [nameValue, setNameValue] = useState(prefillName);
  const [medicineDbResults, setMedicineDbResults] = useState<MedicineDbHit[]>([]);
  const [medicineDbLoading, setMedicineDbLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const formRef = useRef<HTMLFormElement>(null);

  // Debounced medicine database search (246K local CSV)
  useEffect(() => {
    if (nameValue.length < 2) {
      setMedicineDbResults([]);
      setMedicineDbLoading(false);
      return;
    }
    setMedicineDbLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/drug-master/search?q=${encodeURIComponent(nameValue)}`, { signal: controller.signal })
        .then(r => r.json())
        .then(result => {
          setMedicineDbResults(result.data ?? []);
          setMedicineDbLoading(false);
        })
        .catch(() => setMedicineDbLoading(false));
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [nameValue]);

  // Simple name change handler
  function handleNameChange(value: string) {
    setNameValue(value);
    setSubmitStatus("idle");
  }

  // Fill from Medicine Database suggestion — auto-fills ALL fields
  function fillFromMedicineDb(hit: MedicineDbHit) {
    setNameValue(hit.name);
    setMedicineDbResults([]);
    if (!formRef.current) return;
    const form = formRef.current;
    const setValue = (name: string, val: string) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
      if (el) el.value = val;
    };
    setValue("genericName", hit.genericName || "");
    setValue("manufacturer", hit.manufacturer || "");
    setValue("composition", hit.composition || "");
    setValue("strength", hit.strength || "");
    setValue("packSize", hit.packSize || "");
    setValue("dosageForm", hit.dosageForm || "");
    setValue("category", ""); // category may not map directly
    setValue("hsnCode", hit.hsnCode || "");
    setValue("schedule", hit.schedule || "OTC");
    setValue("gstRate", String(hit.gstRate ?? 12));
    if (hit.mrpPaisa > 0) setValue("mrp", String(hit.mrpPaisa / 100));
    toast.success(`✅ Auto-filled: ${hit.name}`, { duration: 2500 });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    try {
      const mrp = Math.round(Number(fd.get("mrp") || 0) * 100);
      if (mrp <= 0) {
        toast.error("MRP must be greater than 0");
        setSaving(false);
        return;
      }

      // If inventory fields are filled, use quick-add endpoint
      const batchNo = String(fd.get("batchNo") || "").trim();
      const expiryDate = String(fd.get("expiryDate") || "").trim();
      const quantity = Number(fd.get("quantity") || 0);

      const useQuickAdd = batchNo && expiryDate && quantity > 0;
      const endpoint = useQuickAdd ? "/api/medicines/quick-add" : "/api/medicines/create";

      const payload: Record<string, unknown> = {
        name: String(fd.get("name") || "").trim(),
        genericName: String(fd.get("genericName") || "").trim(),
        manufacturer: String(fd.get("manufacturer") || "").trim(),
        category: String(fd.get("category") || "").trim(),
        composition: String(fd.get("composition") || "").trim(),
        dosageForm: String(fd.get("dosageForm") || "").trim(),
        strength: String(fd.get("strength") || "").trim(),
        packSize: String(fd.get("packSize") || "").trim(),
        hsnCode: String(fd.get("hsnCode") || "").trim(),
        gstRate: Number(fd.get("gstRate") || 12),
        mrpPaisa: mrp,
        schedule: String(fd.get("schedule") || "OTC"),
        barcode: String(fd.get("barcode") || "").trim(),
        requiresPrescription: fd.get("schedule") === "H" || fd.get("schedule") === "H1" || fd.get("schedule") === "X",
      };

      if (useQuickAdd) {
        payload.batchNo = batchNo;
        payload.expiryDate = expiryDate;
        payload.mfgDate = String(fd.get("mfgDate") || "").trim() || undefined;
        payload.purchaseRatePaisa = Math.round(Number(fd.get("purchaseRate") || 0) * 100);
        payload.saleRatePaisa = Math.round(Number(fd.get("saleRate") || mrp / 100) * 100);
        payload.quantity = quantity;
        payload.reorderLevel = Number(fd.get("reorderLevel") || 10);
        payload.rackLocation = String(fd.get("rackLocation") || "").trim();
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "Failed to add medicine");
        return;
      }

      toast.success(`Medicine "${payload.name}" added successfully!`);
      setSubmitStatus("success");
      if (onSuccess) {
        onSuccess(useQuickAdd ? result.data : { medicine: result.data, inventory: null });
      }
      // Reset form for next entry (standalone mode)
      if (mode === "standalone" && formRef.current) {
        formRef.current.reset();
        setNameValue("");
        setTimeout(() => setSubmitStatus("idle"), 3000);
      }
    } catch {
      toast.error("Network error — please check your connection.");
      setSubmitStatus("error");
    } finally {
      setSaving(false);
    }
  }

  const isInline = mode === "inline";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={`rounded-lg border bg-white shadow-sm ${
      isInline ? "border-blue-200 bg-blue-50/30 p-4" : "border-slate-200 p-5"
    }`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`font-display font-semibold ${
          isInline ? "text-base text-blue-900" : "text-lg text-med-navy"
        }`}>
          <Plus className="mr-2 inline-block h-4 w-4" />
          {isInline ? "Quick Add New Medicine + Stock" : "Add New Medicine"}
        </h3>
        <div className="flex items-center gap-2">
          {submitStatus === "success" && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Added!
            </span>
          )}
          {submitStatus === "error" && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
              <AlertCircle className="h-3.5 w-3.5" /> Failed
            </span>
          )}
          {onCancel && (
            <button type="button" onClick={onCancel} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Essential Fields */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative space-y-1">
          <span className="text-xs font-medium text-slate-600">Medicine Name *</span>
          <input
            name="name"
            required
            value={nameValue}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Dolo 650 Tablet"
            className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-med-green focus:ring-1 focus:ring-med-green/20"
            autoComplete="off"
          />
          {(medicineDbResults.length > 0 || medicineDbLoading) && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
              <div>
                <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5">
                  {medicineDbLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                  ) : (
                    <Database className="h-3 w-3 text-blue-500" />
                  )}
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    Medicine Database {medicineDbLoading ? "— Searching..." : `— ${medicineDbResults.length} found`}
                  </span>
                  <Sparkles className="h-3 w-3 text-blue-400 ml-auto" />
                </div>
                {medicineDbResults.slice(0, 10).map((hit, i) => (
                  <button
                    key={`db-${hit.name}-${i}`}
                    type="button"
                    onClick={() => fillFromMedicineDb(hit)}
                    className="block w-full border-b border-slate-50 px-3 py-2 text-left hover:bg-blue-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="block text-sm font-semibold text-slate-800">{hit.name}</span>
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">Database ✓</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {hit.genericName}{hit.strength ? ` • ${hit.strength}` : ""}{hit.manufacturer ? ` • ${hit.manufacturer}` : ""}
                    </span>
                    {hit.mrpPaisa > 0 && (
                      <span className="ml-1 text-xs font-medium text-emerald-600">₹{(hit.mrpPaisa / 100).toFixed(2)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <FormField name="genericName" label="Generic / Salt Name" placeholder="e.g. Paracetamol" />
        <FormField name="manufacturer" label="Manufacturer" placeholder="e.g. Micro Labs" />
        <FormField name="composition" label="Composition" placeholder="e.g. Paracetamol 650mg" />
        <FormField name="strength" label="Strength" placeholder="e.g. 650mg" />
        <FormField name="packSize" label="Pack Size" placeholder="e.g. Strip of 15" />
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">Dosage Form</span>
          <select name="dosageForm" className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm">
            <option value="">Select</option>
            {DOSAGE_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">Category</span>
          <select name="category" className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm">
            <option value="">Select</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <FormField name="mrp" label="MRP (₹) *" type="number" step="0.01" required placeholder="e.g. 33.50" />
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">GST Rate</span>
          <select name="gstRate" defaultValue="12" className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm">
            {GST_OPTIONS.map(g => <option key={g} value={g}>{g}%</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">Schedule</span>
          <select name="schedule" defaultValue="OTC" className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm">
            {SCHEDULE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <FormField name="hsnCode" label="HSN Code" placeholder="e.g. 30049099" />
        <FormField name="barcode" label="Barcode" defaultValue={prefillBarcode} placeholder="e.g. 8901234500028" />
      </div>

      {/* Inventory Section (toggle for standalone, always show for inline) */}
      {showInventoryFields && !isInline && (
        <button
          type="button"
          onClick={() => setShowInventory(!showInventory)}
          className="mt-4 text-sm font-medium text-med-green hover:text-med-greenDark"
        >
          {showInventory ? "▾ Hide stock details" : "▸ Also add stock entry (optional)"}
        </button>
      )}

      {showInventory && showInventoryFields && (
        <div className={`mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 ${isInline ? "border-blue-100" : ""}`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stock / Inventory Details {isInline ? "(Required)" : "(Optional)"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField name="batchNo" label={`Batch No ${isInline ? "*" : ""}`} required={isInline} placeholder="e.g. DL650A" />
            <FormField name="expiryDate" label={`Expiry Date ${isInline ? "*" : ""}`} type="date" required={isInline} />
            <FormField name="mfgDate" label="MFG Date" type="date" />
            <FormField name="quantity" label={`Quantity ${isInline ? "*" : ""}`} type="number" required={isInline} placeholder="e.g. 100" />
            <FormField name="purchaseRate" label="Purchase Rate (₹)" type="number" step="0.01" placeholder="e.g. 21.00" />
            <FormField name="saleRate" label="Sale Rate (₹)" type="number" step="0.01" placeholder="e.g. 32.00" />
            <FormField name="reorderLevel" label="Reorder Level" type="number" defaultValue="10" />
            <FormField name="rackLocation" label="Rack Location" placeholder="e.g. B2" />
          </div>
        </div>
      )}

      <div className={`mt-4 flex gap-2 ${isInline ? "" : "justify-end"}`}>
        {onCancel && (
          <button type="button" onClick={onCancel} className="min-h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
        )}
        {!isInline && (
          <button
            type="button"
            onClick={() => { formRef.current?.reset(); setNameValue(""); setSubmitStatus("idle"); toast.info("Form cleared."); }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-6 text-sm font-semibold text-white disabled:opacity-60 ${
            isInline ? "bg-blue-600 hover:bg-blue-700" : "bg-med-green hover:bg-med-greenDark"
          } ${isInline ? "flex-1" : ""}`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {saving ? "Adding..." : isInline ? "Add Medicine & Stock" : showInventory ? "Add Medicine & Stock" : "Add Medicine"}
        </button>
      </div>
    </form>
  );
}

function FormField({
  name, label, type = "text", defaultValue, step, required, placeholder,
}: {
  name: string; label: string; type?: string; defaultValue?: string;
  step?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-med-green focus:ring-1 focus:ring-med-green/20"
      />
    </label>
  );
}
