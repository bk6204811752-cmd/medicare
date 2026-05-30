"use client";

import { useState, useTransition } from "react";
import { TrendingUp, Users, Package, Search, Download, FileSpreadsheet, Calendar, Loader2, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type MonthlyEntry = {
  month: string;
  label: string;
  revenuePaisa: number;
  costPaisa: number;
  profitPaisa: number;
};

type TopChemist = {
  partyId: string;
  name: string;
  revenuePaisa: number;
  invoices: number;
};

type TopMedicine = {
  name: string;
  qty: number;
  revenuePaisa: number;
};

type Analytics = {
  monthlyProfit: MonthlyEntry[];
  topChemists: TopChemist[];
  topMedicines: TopMedicine[];
  totalRevenuePaisa: number;
  totalCostPaisa: number;
  totalProfitPaisa: number;
  totalInvoices: number;
};

type GstrRow = {
  partyName: string;
  gstin: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceValue: string;
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  totalTax: string;
};

export function StockistAnalyticsClient({
  initialAnalytics,
  gstr1,
  initialFrom,
  initialTo,
  totalTaxableValue,
  totalTaxValue,
}: {
  initialAnalytics: Analytics;
  gstr1: GstrRow[];
  initialFrom: string;
  initialTo: string;
  totalTaxableValue: number;
  totalTaxValue: number;
}) {
  const [analytics, setAnalytics] = useState<Analytics>(initialAnalytics);
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [isPending, startTransition] = useTransition();
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<"monthly" | "chemists" | "medicines">("monthly");

  const handleSearch = () => {
    if (!fromDate || !toDate) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/stockist/analytics?from=${fromDate}&to=${toDate}`);
        const json = await res.json();
        if (json.data) setAnalytics(json.data);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      }
    });
  };

  // Compute max value for bar chart scaling
  const maxMonthlyRevenue = Math.max(...analytics.monthlyProfit.map(m => m.revenuePaisa), 1);

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ─── Custom Date Range Search ─── */}
      <div className="glass-card p-4 sm:p-5">
        <h2 className="font-display text-sm sm:text-base font-semibold text-med-navy flex items-center gap-2 mb-3 sm:mb-4">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-med-green" /> Custom Analytics Date Range
        </h2>
        <div className="flex flex-col gap-3">
          {/* Date inputs row */}
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">From Date</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">To Date</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors"
              />
            </label>
          </div>

          {/* Quick Presets + Search row */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: "This Month", getRange: () => {
                const now = new Date();
                return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
              }},
              { label: "Last 3M", getRange: () => {
                const now = new Date();
                const from = new Date(now); from.setMonth(now.getMonth() - 3);
                return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
              }},
              { label: "This Year", getRange: () => {
                const now = new Date();
                return { from: `${now.getFullYear()}-01-01`, to: now.toISOString().slice(0, 10) };
              }},
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  const range = preset.getRange();
                  setFromDate(range.from);
                  setToDate(range.to);
                }}
                className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleSearch}
              disabled={isPending}
              className="ml-auto h-9 sm:h-10 px-4 sm:px-5 rounded-lg bg-med-green font-bold text-white text-sm flex items-center gap-2 hover:bg-med-greenDark active:scale-95 transition-all disabled:opacity-50 shrink-0"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isPending ? "Loading..." : "Search"}
            </button>
          </div>
        </div>
      </div>

      {/* ─── KPI Summary Cards ─── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="glass-card p-3 sm:p-4 bg-white">
          <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Revenue</p>
          <p className="text-lg sm:text-xl font-black text-slate-800 mt-1 font-mono">{formatCurrency(analytics.totalRevenuePaisa)}</p>
          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{analytics.totalInvoices} invoices</p>
        </div>
        <div className="glass-card p-3 sm:p-4 bg-white">
          <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Cost</p>
          <p className="text-lg sm:text-xl font-black text-red-600 mt-1 font-mono">{formatCurrency(analytics.totalCostPaisa)}</p>
          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Purchase value</p>
        </div>
        <div className="glass-card p-3 sm:p-4 bg-white">
          <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Net Profit</p>
          <p className={`text-lg sm:text-xl font-black mt-1 font-mono ${analytics.totalProfitPaisa >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {analytics.totalProfitPaisa >= 0 ? "+" : ""}{formatCurrency(analytics.totalProfitPaisa)}
          </p>
          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Gross margin</p>
        </div>
        <div className="glass-card p-3 sm:p-4 bg-white col-span-2 sm:col-span-1">
          <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Margin %</p>
          <p className={`text-lg sm:text-xl font-black mt-1 ${analytics.totalRevenuePaisa > 0 && ((analytics.totalProfitPaisa / analytics.totalRevenuePaisa) * 100) >= 20 ? "text-emerald-600" : "text-orange-600"}`}>
            {analytics.totalRevenuePaisa > 0 
              ? ((analytics.totalProfitPaisa / analytics.totalRevenuePaisa) * 100).toFixed(1) 
              : "0.0"}%
          </p>
          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Overall profitability</p>
        </div>
      </div>

      {/* ─── Analytics Tabs ─── */}
      <div className="glass-card p-3 sm:p-4 sm:p-5">
        {/* Tab Nav */}
        <div className="flex gap-1 border-b border-slate-100 pb-0 mb-4 sm:mb-5 overflow-x-auto">
          {[
            { key: "monthly", label: "📈 Monthly", fullLabel: "📈 Monthly Profit", icon: TrendingUp },
            { key: "chemists", label: "🏪 Chemists", fullLabel: "🏪 Top Chemists", icon: Users },
            { key: "medicines", label: "💊 Medicines", fullLabel: "💊 Top Medicines", icon: Package },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveAnalyticsTab(tab.key as any)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold rounded-t-lg transition-all outline-none whitespace-nowrap border-b-2 ${
                activeAnalyticsTab === tab.key
                  ? "bg-white text-emerald-700 border-b-2 border-emerald-500 shadow-sm -mb-px"
                  : "text-slate-500 border-transparent hover:text-slate-700"
              }`}
            >
              <span className="sm:hidden">{tab.label}</span>
              <span className="hidden sm:inline">{tab.fullLabel}</span>
            </button>
          ))}
        </div>

        {/* ── Tab: Monthly Profit ── */}
        {activeAnalyticsTab === "monthly" && (
          <div className="space-y-4 sm:space-y-5">
            <h2 className="font-display text-sm sm:text-base font-semibold text-med-navy flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-med-green" /> Monthly Revenue vs Profit
            </h2>

            {analytics.monthlyProfit.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                No sales data available for the selected period.
              </div>
            ) : (
              <>
                {/* Visual Bar Chart */}
                <div className="space-y-2">
                  {analytics.monthlyProfit.map((m) => {
                    const revPct = Math.round((m.revenuePaisa / maxMonthlyRevenue) * 100);
                    const profitPct = m.revenuePaisa > 0 ? Math.round((m.profitPaisa / m.revenuePaisa) * revPct) : 0;
                    const isNeg = m.profitPaisa < 0;
                    return (
                      <div key={m.month} className="group">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-xs font-bold text-slate-500 w-16 sm:w-20 shrink-0 truncate">{m.label}</span>
                          <div className="flex-1 relative h-9 sm:h-10 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                            {/* Revenue bar */}
                            <div
                              className="absolute inset-y-0 left-0 bg-blue-200 rounded-lg transition-all duration-500"
                              style={{ width: `${revPct}%` }}
                            />
                            {/* Profit bar */}
                            <div
                              className={`absolute inset-y-0 left-0 rounded-lg transition-all duration-500 ${isNeg ? "bg-red-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.max(0, profitPct)}%` }}
                            />
                            {/* Labels */}
                            <div className="absolute inset-0 flex items-center justify-between px-2 sm:px-3">
                              <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 z-10 truncate mr-1">Rev: {formatCurrency(m.revenuePaisa)}</span>
                              <span className={`text-[9px] sm:text-[10px] font-black z-10 shrink-0 ${isNeg ? "text-red-700" : "text-emerald-700"}`}>
                                {isNeg ? "-" : "+"}{formatCurrency(Math.abs(m.profitPaisa))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Monthly Table — scrollable on mobile */}
                <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
                  <table className="w-full text-left text-sm border-collapse bg-white min-w-[480px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 font-display font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                        <th className="px-3 sm:px-4 py-3">Month</th>
                        <th className="px-3 sm:px-4 py-3 text-right">Revenue</th>
                        <th className="px-3 sm:px-4 py-3 text-right">Cost</th>
                        <th className="px-3 sm:px-4 py-3 text-right">Net Profit</th>
                        <th className="px-3 sm:px-4 py-3 text-right">Margin%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analytics.monthlyProfit.map((m) => {
                        const margin = m.revenuePaisa > 0 ? ((m.profitPaisa / m.revenuePaisa) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={m.month} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-3 sm:px-4 py-3 font-bold text-slate-800 text-xs sm:text-sm">{m.label}</td>
                            <td className="px-3 sm:px-4 py-3 text-right font-mono font-semibold text-slate-700 text-xs sm:text-sm">{formatCurrency(m.revenuePaisa)}</td>
                            <td className="px-3 sm:px-4 py-3 text-right font-mono font-semibold text-red-600 text-xs sm:text-sm">{formatCurrency(m.costPaisa)}</td>
                            <td className={`px-3 sm:px-4 py-3 text-right font-mono font-black text-xs sm:text-sm ${m.profitPaisa >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                              {m.profitPaisa >= 0 ? "+" : ""}{formatCurrency(m.profitPaisa)}
                            </td>
                            <td className={`px-3 sm:px-4 py-3 text-right font-bold text-xs sm:text-sm ${Number(margin) >= 20 ? "text-emerald-600" : Number(margin) >= 10 ? "text-orange-600" : "text-red-600"}`}>
                              {margin}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200">
                      <tr className="bg-slate-50 font-black text-slate-800">
                        <td className="px-3 sm:px-4 py-3 text-xs uppercase tracking-wider">Total</td>
                        <td className="px-3 sm:px-4 py-3 text-right font-mono text-xs sm:text-sm">{formatCurrency(analytics.totalRevenuePaisa)}</td>
                        <td className="px-3 sm:px-4 py-3 text-right font-mono text-red-600 text-xs sm:text-sm">{formatCurrency(analytics.totalCostPaisa)}</td>
                        <td className={`px-3 sm:px-4 py-3 text-right font-mono text-xs sm:text-sm ${analytics.totalProfitPaisa >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                          {analytics.totalProfitPaisa >= 0 ? "+" : ""}{formatCurrency(analytics.totalProfitPaisa)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right font-mono text-xs sm:text-sm">
                          {analytics.totalRevenuePaisa > 0 
                            ? ((analytics.totalProfitPaisa / analytics.totalRevenuePaisa) * 100).toFixed(1) 
                            : "0.0"}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Tab: Top Chemists ── */}
        {activeAnalyticsTab === "chemists" && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="font-display text-sm sm:text-base font-semibold text-med-navy flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-med-green" /> Top Chemists by Purchase Volume
            </h2>
            {analytics.topChemists.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                No chemist data for the selected period.
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-2.5">
                {analytics.topChemists.map((chemist, idx) => {
                  const maxRevenue = analytics.topChemists[0]?.revenuePaisa || 1;
                  const pct = Math.round((chemist.revenuePaisa / maxRevenue) * 100);
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={chemist.partyId} className="rounded-xl border border-slate-100 bg-white p-3 sm:p-4 shadow-xs hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-lg sm:text-xl shrink-0 w-7 sm:w-8 text-center">
                          {medals[idx] || <span className="text-xs font-black text-slate-400">#{idx + 1}</span>}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="font-bold text-slate-800 text-sm truncate">{chemist.name}</p>
                            <div className="text-right shrink-0">
                              <p className="font-mono font-black text-emerald-700 text-xs sm:text-sm">{formatCurrency(chemist.revenuePaisa)}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{chemist.invoices} inv.</p>
                            </div>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Top Medicines ── */}
        {activeAnalyticsTab === "medicines" && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="font-display text-sm sm:text-base font-semibold text-med-navy flex items-center gap-2">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-med-green" /> Top Medicines by Quantity Sold
            </h2>
            {analytics.topMedicines.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                No medicine data for the selected period.
              </div>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="sm:hidden space-y-2">
                  {analytics.topMedicines.map((med, idx) => {
                    const maxQty = analytics.topMedicines[0]?.qty || 1;
                    const pct = Math.round((med.qty / maxQty) * 100);
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <div key={med.name} className="rounded-xl border border-slate-100 bg-white p-3 shadow-xs">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{medals[idx] || `#${idx + 1}`}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{med.name}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-black text-slate-700">{med.qty.toLocaleString()} units</span>
                              <span className="text-xs font-mono text-emerald-700 font-semibold">{formatCurrency(med.revenuePaisa)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
                  <table className="w-full text-left text-sm border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 font-display font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Medicine</th>
                        <th className="px-4 py-3 text-right">Qty Sold (incl. free)</th>
                        <th className="px-4 py-3 text-right">Total Revenue</th>
                        <th className="px-4 py-3">Volume Bar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analytics.topMedicines.map((med, idx) => {
                        const maxQty = analytics.topMedicines[0]?.qty || 1;
                        const pct = Math.round((med.qty / maxQty) * 100);
                        const medals = ["🥇", "🥈", "🥉"];
                        return (
                          <tr key={med.name} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-4 py-3 text-lg">{medals[idx] || `#${idx + 1}`}</td>
                            <td className="px-4 py-3 font-bold text-slate-800">{med.name}</td>
                            <td className="px-4 py-3 text-right font-mono font-black text-slate-800">{med.qty.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">{formatCurrency(med.revenuePaisa)}</td>
                            <td className="px-4 py-3 w-32">
                              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ─── GSTR-1 Invoices Table ─── */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px] min-w-0 w-full">
        <div className="glass-card p-3 sm:p-4 sm:p-5 min-w-0 w-full overflow-hidden">
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-3">
            <h2 className="font-display text-sm sm:text-base font-semibold text-med-navy flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5 text-med-green shrink-0" /> 
              <span className="hidden sm:inline">GSTR-1 Outward Supplies (B2B) — This Month</span>
              <span className="sm:hidden">GSTR-1 (B2B)</span>
            </h2>
            <button className="inline-flex items-center gap-1.5 rounded bg-med-navy px-2 sm:px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90 active:scale-95 transition-all font-sans shrink-0">
              <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export Excel</span><span className="sm:hidden">Export</span>
            </button>
          </div>

          {gstr1.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
              No sales recorded in this period. Generated B2B POS Invoices automatically compile here for CA filings.
            </div>
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <div className="sm:hidden space-y-2">
                {gstr1.map((row, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-100 bg-white p-3 shadow-xs">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{row.partyName}</p>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{row.gstin}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-black text-slate-800 text-sm">₹{row.invoiceValue}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{row.invoiceDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                      <span className="font-mono">{row.invoiceNo}</span>
                      <span>•</span>
                      <span>Tax: ₹{row.totalTax}</span>
                      <span>•</span>
                      <span>Taxable: ₹{row.taxableValue}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
                <table className="w-full text-left text-sm border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 font-display font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Chemist (Party)</th>
                      <th className="px-4 py-3">GSTIN No.</th>
                      <th className="px-4 py-3">Invoice No / Date</th>
                      <th className="px-4 py-3 text-right">Taxable Amt</th>
                      <th className="px-4 py-3 text-right">CGST / SGST</th>
                      <th className="px-4 py-3 text-right">Total Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {gstr1.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-med-navy">{row.partyName}</td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600 font-bold">{row.gstin}</td>
                        <td className="px-4 py-3.5">
                          <p className="font-mono text-slate-800 text-xs">{row.invoiceNo}</p>
                          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{row.invoiceDate}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-700">₹{row.taxableValue}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-500 text-xs">
                          ₹{row.cgst} / ₹{row.sgst}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">₹{row.invoiceValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="glass-card p-3 sm:p-4 sm:p-5 h-fit space-y-3 sm:space-y-4">
          <h2 className="font-display text-sm sm:text-base font-bold text-med-navy flex items-center gap-2">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-med-green" /> CA Filing Checklist
          </h2>
          <div className="text-xs text-slate-500 leading-normal space-y-3">
            <p>MedCare compiles drug distribution reports into standard formats compatible directly with the Indian government&apos;s GST portal offline tool.</p>
            <div className="rounded-lg border border-purple-100 bg-purple-50/30 p-3 text-purple-950 font-medium text-[11px] space-y-2">
              <p className="font-bold text-purple-900 flex items-center gap-1">✦ GSTR-1 Invoicing</p>
              <p>Section 4A, 4B, 4C, 6B, 6C handles all inter-state and intra-state B2B drug deliveries.</p>
              <p className="font-bold text-purple-900 flex items-center gap-1 mt-2">✦ GSTR-3B Taxable Totals</p>
              <p>Section 3.1(a) represents your outward taxable supplies logs.</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 text-emerald-950 font-medium text-[11px] space-y-1.5">
              <p className="font-bold text-emerald-900">✅ Summary (This Month)</p>
              <div className="flex justify-between"><span>GSTR-1 Taxable:</span><span className="font-mono font-bold">₹{totalTaxableValue.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>GST Collected:</span><span className="font-mono font-bold">₹{totalTaxValue.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
