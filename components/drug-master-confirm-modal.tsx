"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Database, Edit3, Loader2, Sparkles, X, AlertTriangle, Pill } from "lucide-react";
import { toast } from "sonner";

export type DrugMasterSuggestion = {
  name: string;
  genericName: string;
  manufacturer: string;
  composition: string;
  dosageForm: string;
  strength: string;
  packSize: string;
  schedule: string;
  requiresPrescription: boolean;
  gstRate: number;
  hsnCode: string;
  mrpPaisa: number;
  source: "api" | "local" | "fallback";
  apiProductId?: string;
};

type ConfirmModalProps = {
  suggestion: DrugMasterSuggestion;
  onConfirm: (data: DrugMasterSuggestion) => void;
  onCancel: () => void;
  mode?: "medicine" | "stock"; // medicine = just add medicine, stock = add medicine + stock
};

const GST_OPTIONS = [0, 5, 12, 18] as const;
const SCHEDULE_OPTIONS = ["OTC", "G", "H", "H1", "X"] as const;
const DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Ointment", "Drops", "Powder", "Inhaler", "Gel", "Spray", "Suspension", "Solution", "Sachet", "Other"];

export function DrugMasterConfirmModal({ suggestion, onConfirm, onCancel, mode = "medicine" }: ConfirmModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [data, setData] = useState<DrugMasterSuggestion>({ ...suggestion });
  const [confirming, setConfirming] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  // Close on overlay click
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onCancel();
  }

  function handleConfirm() {
    if (!data.name.trim()) {
      toast.error("Medicine name is required");
      return;
    }
    if (data.mrpPaisa <= 0) {
      toast.error("MRP must be greater than 0");
      return;
    }
    setConfirming(true);
    // Small delay for visual feedback
    setTimeout(() => {
      onConfirm(data);
      setConfirming(false);
    }, 300);
  }

  function updateField(field: keyof DrugMasterSuggestion, value: string | number | boolean) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  const sourceLabel = data.source === "api" ? "Verified ✓" : data.source === "local" ? "Local Database" : "Medicine Database";
  const sourceColor = data.source === "api" ? "bg-emerald-100 text-emerald-700" : data.source === "local" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200/50">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Confirm Medicine Details
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sourceColor}`}>
                  <Database className="h-3 w-3" />
                  {sourceLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditMode(!editMode)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                editMode
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Edit3 className="h-3 w-3" />
              {editMode ? "Editing" : "Edit"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Info Banner */}
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800">
              <p className="font-semibold">Review before saving</p>
              <p className="mt-0.5 text-amber-700">Please verify all details below. Click &quot;Edit&quot; to make changes, then &quot;Confirm &amp; Save&quot; to add this medicine.</p>
            </div>
          </div>

          {/* Medicine Name — Always prominent */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Medicine Name</label>
            {editMode ? (
              <input
                value={data.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-base font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            ) : (
              <p className="mt-1 text-lg font-bold text-slate-900">{data.name}</p>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <ConfirmField
              label="Generic / Salt Name"
              value={data.genericName}
              editMode={editMode}
              onChange={(v) => updateField("genericName", v)}
            />
            <ConfirmField
              label="Manufacturer"
              value={data.manufacturer}
              editMode={editMode}
              onChange={(v) => updateField("manufacturer", v)}
            />
            <ConfirmField
              label="Composition"
              value={data.composition}
              editMode={editMode}
              onChange={(v) => updateField("composition", v)}
              className="sm:col-span-2"
            />
            <ConfirmField
              label="Strength"
              value={data.strength}
              editMode={editMode}
              onChange={(v) => updateField("strength", v)}
            />
            <ConfirmField
              label="Pack Size"
              value={data.packSize}
              editMode={editMode}
              onChange={(v) => updateField("packSize", v)}
            />
            {editMode ? (
              <label className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Dosage Form</span>
                <select
                  value={data.dosageForm}
                  onChange={(e) => updateField("dosageForm", e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                >
                  <option value="">Select</option>
                  {DOSAGE_FORMS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </label>
            ) : (
              <ConfirmField label="Dosage Form" value={data.dosageForm} editMode={false} onChange={() => {}} />
            )}
            <ConfirmField
              label="MRP (₹)"
              value={String(data.mrpPaisa / 100)}
              editMode={editMode}
              type="number"
              onChange={(v) => updateField("mrpPaisa", Math.round(Number(v) * 100))}
            />
            {editMode ? (
              <label className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">GST Rate</span>
                <select
                  value={data.gstRate}
                  onChange={(e) => updateField("gstRate", Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                >
                  {GST_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}%</option>
                  ))}
                </select>
              </label>
            ) : (
              <ConfirmField label="GST Rate" value={`${data.gstRate}%`} editMode={false} onChange={() => {}} />
            )}
            <ConfirmField
              label="HSN Code"
              value={data.hsnCode}
              editMode={editMode}
              onChange={(v) => updateField("hsnCode", v)}
            />
            {editMode ? (
              <label className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Schedule</span>
                <select
                  value={data.schedule}
                  onChange={(e) => {
                    const sched = e.target.value;
                    updateField("schedule", sched);
                    updateField("requiresPrescription", ["H", "H1", "X"].includes(sched));
                  }}
                  className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                >
                  {SCHEDULE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            ) : (
              <ConfirmField label="Schedule" value={data.schedule} editMode={false} onChange={() => {}} />
            )}
          </div>

          {/* Prescription Warning */}
          {data.requiresPrescription && (
            <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">This is a prescription-only medicine (Schedule {data.schedule})</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur-sm rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-200/50 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 transition-all"
          >
            {confirming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {confirming ? "Saving..." : "Confirm & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Field Component ────────────────────────────────────────

function ConfirmField({
  label,
  value,
  editMode,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  editMode: boolean;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      {editMode ? (
        <input
          value={value}
          type={type}
          step={type === "number" ? "0.01" : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-300 px-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
        />
      ) : (
        <p className="text-sm font-medium text-slate-800">{value || <span className="text-slate-400 italic">—</span>}</p>
      )}
    </div>
  );
}
