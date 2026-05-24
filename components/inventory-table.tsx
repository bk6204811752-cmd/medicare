"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { LocalInventoryRow } from "@/lib/local-db";
import { daysUntil, formatCurrency, formatDate, parseUnitsPerPack } from "@/lib/utils";

type StockStatus = "all" | "healthy" | "low" | "expiring" | "expired";
const PAGE_SIZE = 50;

export function InventoryTable({ rows }: { rows: LocalInventoryRow[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StockStatus>("all");
  const [page, setPage] = useState(0);

  const categories = useMemo(
    () => Array.from(new Set(rows.map((row) => row.medicine.category).filter(Boolean))).sort() as string[],
    [rows]
  );

  // Pre-compute daysUntil once per row (was computed 4-5x per row before)
  const rowsWithExpiry = useMemo(
    () => rows.map(row => ({ ...row, _days: daysUntil(row.expiryDate) })),
    [rows]
  );

  // Memoized summary metrics — computed once, not on every render
  const { lowCount, expiryCount, stockValue } = useMemo(() => ({
    lowCount: rowsWithExpiry.filter(r => r.quantity <= r.reorderLevel).length,
    expiryCount: rowsWithExpiry.filter(r => r._days <= 60).length,
    stockValue: rowsWithExpiry.reduce((sum, r) => sum + r.purchaseRatePaisa * r.quantity, 0),
  }), [rowsWithExpiry]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rowsWithExpiry
      .filter((row) => {
        const days = row._days;
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
        const aRisk = Number(a.quantity <= a.reorderLevel) + Number(a._days <= 60);
        const bRisk = Number(b.quantity <= b.reorderLevel) + Number(b._days <= 60);
        return bRisk - aRisk || a._days - b._days;
      });
  }, [category, query, rowsWithExpiry, status]);

  // Reset to page 0 when filters change
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  if (safePage !== page) setPage(safePage);

  const paginatedRows = filteredRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_180px_180px_auto]">
        <label className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input
            className="h-11 w-full rounded-md border border-slate-300 pl-10 pr-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20"
            placeholder="Search medicine, batch, supplier, rack, barcode..."
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(0); }}
          />
        </label>
        <label className="relative">
          <Filter className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <select className="h-11 w-full rounded-md border border-slate-300 pl-9 pr-3" value={category} onChange={(event) => { setCategory(event.target.value); setPage(0); }}>
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <select className="h-11 rounded-md border border-slate-300 px-3" value={status} onChange={(event) => { setStatus(event.target.value as StockStatus); setPage(0); }}>
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
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {["Medicine", "Batch", "Expiry", "Packs", "Stock", "Rate", "MRP", "GST", "Supplier", "Rack", "Status"].map((head) => (
                <th key={head} className={`px-3 py-2.5 font-medium text-xs ${["MRP", "GST", "Supplier", "Rack"].includes(head) ? "hidden lg:table-cell" : ""}`}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => {
              const days = row._days;
              const low = row.quantity <= row.reorderLevel;
              const expired = days < 0;
              const expiring = days >= 0 && days <= 60;
              const unitsPerPack = parseUnitsPerPack(row.medicine.packSize);
              const packs = Math.floor(row.quantity / unitsPerPack);
              const loose = row.quantity % unitsPerPack;
              return (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5">
                    <Link href={`/shop/inventory/${encodeURIComponent(row.id)}`} className="font-semibold text-med-navy hover:text-med-greenDark hover:underline">
                      {row.medicine.name}
                    </Link>
                    <p className="text-xs text-slate-500">{row.medicine.composition ?? row.medicine.genericName ?? ""}</p>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.batchNo}</td>
                  <td className="px-3 py-2.5">{formatDate(row.expiryDate)}</td>
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-slate-700">{packs}</span>
                    {loose > 0 && (
                      <span className="text-xs text-slate-500 ml-1">+{loose} loose</span>
                    )}
                    <span className="text-[10px] text-slate-400 block">{row.medicine.packSize || "1 unit"}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={low ? "font-semibold text-orange-700" : "font-medium text-slate-600"}>{row.quantity} units</span>
                    <span className="text-xs text-slate-400 block">min: {row.reorderLevel}</span>
                  </td>
                  <td className="px-3 py-2.5">{formatCurrency(row.saleRatePaisa)}</td>
                  <td className="hidden lg:table-cell px-3 py-2.5">{formatCurrency(row.mrpPaisa)}</td>
                  <td className="hidden lg:table-cell px-3 py-2.5">{row.gstRate}%</td>
                  <td className="hidden lg:table-cell px-3 py-2.5">{row.supplier?.name ?? "Unassigned"}</td>
                  <td className="hidden lg:table-cell px-3 py-2.5">{row.rackLocation ?? ""}</td>
                  <td className="px-3 py-2.5">
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

      {/* Pagination */}
      {filteredRows.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500">
            Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (safePage < 3) {
                pageNum = i;
              } else if (safePage > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = safePage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium ${pageNum === safePage ? "bg-med-green text-white" : "border border-slate-200 hover:bg-slate-50"}`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
