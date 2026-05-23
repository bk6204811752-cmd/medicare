"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Plus, Search, Sparkles, X } from "lucide-react";
import { AddMedicineForm } from "@/components/add-medicine-form";

type SelectItem = {
  id: string;
  name: string;
  genericName?: string;
  gstRate?: number;
  hsnCode?: string;
  mrpPaisa?: number;
};

export function AddStockForm({ medicines, suppliers }: { medicines: SelectItem[]; suppliers: SelectItem[] }) {
  const router = useRouter();
  const [localMedicines, setLocalMedicines] = useState<SelectItem[]>(medicines);
  const [medicineId, setMedicineId] = useState("");
  const selected = localMedicines.find((m) => m.id === medicineId);
  const [saving, setSaving] = useState(false);

  // Searchable combobox state
  const [medicineSearch, setMedicineSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredMedicines = localMedicines.filter((m) => {
    if (!medicineSearch.trim()) return true;
    const q = medicineSearch.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.genericName?.toLowerCase().includes(q);
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectMedicine(m: SelectItem) {
    setMedicineId(m.id);
    setMedicineSearch(m.name);
    setShowDropdown(false);
  }

  function clearSelection() {
    setMedicineId("");
    setMedicineSearch("");
    inputRef.current?.focus();
  }

  function handleAddMedicineSuccess(result: { medicine: any; inventory: any }) {
    const med = result.medicine;
    const newItem: SelectItem = {
      id: med.id,
      name: med.name,
      genericName: med.genericName,
      gstRate: med.gstRate,
      hsnCode: med.hsnCode,
      mrpPaisa: med.mrpPaisa,
    };
    setLocalMedicines((prev) => [newItem, ...prev]);
    selectMedicine(newItem);
    setShowAddMedicine(false);
    toast.success(`Medicine "${med.name}" created and selected`);
  }

  async function submit(formData: FormData) {
    if (!medicineId) {
      toast.error("Please select or enter a medicine first");
      return;
    }
    setSaving(true);
    let actualMedicineId = medicineId;

    // Auto-create medicine record if it's a new on-the-fly entry
    if (medicineId === "new") {
      const name = medicineSearch.trim();
      if (!name) {
        toast.error("Please enter a valid medicine name");
        setSaving(false);
        return;
      }

      try {
        const mrp = Math.round(Number(formData.get("mrp") || 0) * 100);
        const gstRate = Number(formData.get("gstRate") || 12);
        const hsnCode = String(formData.get("hsnCode") || "").trim();

        const response = await fetch("/api/medicines/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            genericName: "", // Default empty, editable in profile
            manufacturer: "",
            category: "Other",
            composition: "",
            dosageForm: "Tablet",
            strength: "",
            packSize: "",
            hsnCode,
            gstRate,
            mrpPaisa: mrp,
            schedule: "OTC",
            requiresPrescription: false
          })
        });

        const result = await response.json();
        if (!response.ok) {
          toast.error(result.error ?? "Failed to create new medicine record");
          setSaving(false);
          return;
        }

        actualMedicineId = result.data.id;
      } catch (err) {
        toast.error("Error creating new medicine record");
        setSaving(false);
        return;
      }
    }

    const payload = {
      medicineId: actualMedicineId,
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
    <div className="space-y-4">
      <form action={submit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
        {/* Searchable Medicine Combobox */}
        <div className="space-y-2 md:col-span-2" ref={dropdownRef}>
          <span className="text-sm font-medium text-slate-600">Medicine *</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              className="h-11 w-full rounded-md border border-slate-300 pl-9 pr-16 outline-none transition-shadow focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm"
              placeholder="Search or enter medicine name..."
              value={medicineSearch}
              onChange={(e) => {
                setMedicineSearch(e.target.value);
                setShowDropdown(true);
                if (!e.target.value.trim()) setMedicineId("");
              }}
              onFocus={() => setShowDropdown(true)}
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {medicineSearch && (
                <button type="button" onClick={clearSelection} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
            </div>
          </div>

          {/* Dropdown suggestions */}
          {showDropdown && (
            <div className="relative z-10 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {filteredMedicines.length === 0 ? (
                <div className="px-4 py-3 text-center text-xs text-slate-400">No matching medicines found</div>
              ) : (
                filteredMedicines.slice(0, 50).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectMedicine(m);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-med-greenSoft ${m.id === medicineId ? "bg-med-greenSoft" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-med-navy">{m.name}</p>
                      {m.genericName && <p className="truncate text-xs text-slate-500">{m.genericName}</p>}
                    </div>
                    {m.mrpPaisa ? <span className="shrink-0 text-xs text-slate-400 font-medium">₹{(m.mrpPaisa / 100).toFixed(2)}</span> : null}
                  </button>
                ))
              )}
              
              {/* On-the-fly Medicine Creation Trigger */}
              {medicineSearch.trim() && !localMedicines.some(m => m.name.toLowerCase() === medicineSearch.trim().toLowerCase()) && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setMedicineId("new");
                    setShowDropdown(false);
                  }}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-amber-600 bg-amber-50/40 transition-colors hover:bg-amber-50"
                >
                  <Sparkles className="h-4 w-4 shrink-0" /> Add &quot;{medicineSearch}&quot; as new medicine
                </button>
              )}

              {/* Add New Medicine button (Full form inline) */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowDropdown(false);
                  setShowAddMedicine(true);
                }}
                className="flex w-full items-center gap-2 border-t border-slate-105 px-4 py-3 text-left text-sm font-bold text-med-green transition-colors hover:bg-med-greenSoft"
              >
                <Plus className="h-4 w-4 shrink-0" /> Fill detailed new medicine form
              </button>
            </div>
          )}

          {/* Selected badge */}
          {medicineId && (
            <div className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs ${
              medicineId === "new" ? "bg-amber-50 border border-amber-200 text-amber-800" : "bg-med-greenSoft text-med-navy"
            }`}>
              <span className="font-bold">
                {medicineId === "new" ? "New Medicine (Auto-create on save):" : "Selected:"}
              </span>
              <span>{medicineId === "new" ? medicineSearch : selected?.name}</span>
              {selected?.genericName && <span className="text-slate-500">({selected.genericName})</span>}
            </div>
          )}
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600">Supplier</span>
          <select name="supplierId" className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm">
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
        <button disabled={saving || !medicineId} className="min-h-11 rounded-md bg-med-green font-semibold text-white disabled:opacity-60 md:col-span-2">
          {saving ? "Saving..." : "Save stock"}
        </button>
      </form>

      {/* Inline Add Medicine Form */}
      {showAddMedicine && (
        <div className="rounded-lg border border-dashed border-med-green bg-med-greenSoft/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-med-navy">Add New Medicine</h3>
            <button type="button" onClick={() => setShowAddMedicine(false)} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200">
              <X className="h-5 w-5" />
            </button>
          </div>
          <AddMedicineForm mode="inline" onSuccess={handleAddMedicineSuccess} />
        </div>
      )}
    </div>
  );
}

function Field({ label, name, type = "text", defaultValue, step, required }: {
  label: string; name: string; type?: string; defaultValue?: string; step?: string; required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <input name={name} type={type} step={step} defaultValue={defaultValue} required={required} className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" />
    </label>
  );
}
