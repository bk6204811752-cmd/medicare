"use client";

import Link from "next/link";
import { Download, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { LocalInventoryRow } from "@/lib/local-db";
import { daysUntil, formatCurrency, formatDate } from "@/lib/utils";

type StockStatus = "all" | "healthy" | "low" | "expiring" | "expired";

export function InventoryTable({ rows }: { rows: LocalInventoryRow[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StockStatus>("all");

  const categories = useMemo(
    () => Array.from(new Set(rows.map((row) => row.medicine.category).filter(Boolean))).sort() as string[],
    [rows]
  );

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const days = daysUntil(row.expiryDate);
        const low = row.quantity <= row.reorderLevel;
        const expired = days < 0;
        const expiring = days >= 0 && days <= 60;
        const haystack = [
          row.medicine.name,
          row.medicine.genericName,
          row.medicine.manufacturer,
          row.medicine.composition,
          row.medicine.barcode,
          row.batchNo,
          row.rackLocation,
          row.supplier?.name
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (normalized && !haystack.includes(normalized)) return false;
        if (category !== "all" && row.medicine.category !== category) return false;
        if (status === "healthy" && (low || expiring || expired)) return false;
        if (status === "low" && !low) return false;
        if (status === "expiring" && !expiring) return false;
        if (status === "expired" && !expired) return false;
        return true;
      })
      .sort((a, b) => {
        const aRisk = Number(a.quantity <= a.reorderLevel) + Number(daysUntil(a.expiryDate) <= 60);
        const bRisk = Number(b.quantity <= b.reorderLevel) + Number(daysUntil(b.expiryDate) <= 60);
        return bRisk - aRisk || daysUntil(a.expiryDate) - daysUntil(b.expiryDate);
      });
  }, [category, query, rows, status]);

  const lowCount = rows.filter((row) => row.quantity <= row.reorderLevel).length;
  const expiryCount = rows.filter((row) => daysUntil(row.expiryDate) <= 60).length;
  const stockValue = rows.reduce((sum, row) => sum + row.purchaseRatePaisa * row.quantity, 0);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_180px_180px_auto]">
        <label className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input
            className="h-11 w-full rounded-md border border-slate-300 pl-10 pr-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20"
            placeholder="Search medicine, batch, supplier, rack, barcode..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="relative">
          <Filter className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <select className="h-11 w-full rounded-md border border-slate-300 pl-9 pr-3" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <select className="h-11 rounded-md border border-slate-300 px-3" value={status} onChange={(event) => setStatus(event.target.value as StockStatus)}>
          <option value="all">All stock status</option>
          <option value="healthy">Healthy</option>
          <option value="low">Low stock</option>
          <option value="expiring">Expiring soon</option>
          <option value="expired">Expired</option>
        </select>
        <a href="/api/export/inventory" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 font-semibold text-med-navy hover:bg-slate-50">
          <Download className="h-4 w-4" /> CSV
        </a>
      </div>

      <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
        <Metric label="Visible batches" value={String(filteredRows.length)} />
        <Metric label="Low stock" value={String(lowCount)} tone={lowCount ? "text-orange-700" : "text-emerald-700"} />
        <Metric label="Expiry risk" value={String(expiryCount)} tone={expiryCount ? "text-red-700" : "text-emerald-700"} />
        <Metric label="Stock value" value={formatCurrency(stockValue)} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {["Medicine", "Batch", "Expiry", "Stock", "Rate", "MRP", "GST", "Supplier", "Rack", "Status"].map((head) => (
                <th key={head} className="px-4 py-3 font-medium">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const days = daysUntil(row.expiryDate);
              const low = row.quantity <= row.reorderLevel;
              const expired = days < 0;
              const expiring = days >= 0 && days <= 60;
              return (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link href={`/shop/inventory/${encodeURIComponent(row.id)}`} className="font-semibold text-med-navy hover:text-med-greenDark hover:underline">
                      {row.medicine.name}
                    </Link>
                    <p className="text-xs text-slate-500">{row.medicine.composition ?? row.medicine.genericName ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.batchNo}</td>
                  <td className="px-4 py-3">{formatDate(row.expiryDate)}</td>
                  <td className="px-4 py-3">
                    <span className={low ? "font-semibold text-orange-700" : ""}>{row.quantity}</span>
                    <span className="text-xs text-slate-500"> / {row.reorderLevel}</span>
                  </td>
                  <td className="px-4 py-3">{formatCurrency(row.saleRatePaisa)}</td>
                  <td className="px-4 py-3">{formatCurrency(row.mrpPaisa)}</td>
                  <td className="px-4 py-3">{row.gstRate}%</td>
                  <td className="px-4 py-3">{row.supplier?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3">{row.rackLocation ?? ""}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-1 text-xs ${expired ? "bg-red-100 text-red-700" : expiring ? "bg-orange-100 text-orange-700" : low ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {expired ? "Expired" : expiring ? "Expiry risk" : low ? "Low stock" : "Healthy"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!filteredRows.length ? <div className="p-10 text-center text-slate-500">No inventory matches these filters.</div> : null}
    </section>
  );
}

function Metric({ label, value, tone = "text-med-navy" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="text-slate-500">{label}</p>
      <p className={`font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
