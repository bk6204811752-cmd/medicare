"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  medicine: {
    name: string;
  };
  batchNo: string;
}

export function VirtualTransferForm({ inventory }: { inventory: InventoryItem[] }) {
  const [batchId, setBatchId] = useState("");
  const [qty, setQty] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simulate API delay and log virtual transfer successfully
    setTimeout(() => {
      toast.success("Stock transfer movement logged successfully!");
      setBatchId("");
      setQty("");
      setLocation("");
      setLoading(false);
    }, 600);
  }

  return (
    <div className="glass-card p-4 sm:p-5">
      <h2 className="font-display text-base font-bold text-med-navy mb-4 flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-med-green" /> Virtual Stock Transfer
      </h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-500">Choose Stock Batch</span>
          <select
            required
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green bg-white font-medium"
          >
            <option value="">Select Batch Lot</option>
            {inventory.slice(0, 10).map((i) => (
              <option key={i.id} value={i.id}>
                {i.medicine.name} (Batch: {i.batchNo})
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-500">Qty to Move</span>
            <input
              type="number"
              min="1"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green font-bold"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-500">Target Location</span>
            <input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green font-bold"
              placeholder="e.g. COLD_STORAGE"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-med-navy font-semibold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all text-xs disabled:opacity-60"
        >
          {loading ? "Logging Movement..." : "Log Transfer Movement"}
        </button>
      </form>
    </div>
  );
}
