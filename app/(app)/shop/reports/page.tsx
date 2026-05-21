"use client";

import { useEffect, useState } from "react";
import { BarChart3, Download, AlertTriangle, Clock, TrendingUp, Package } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";

type Tab = "sales" | "gst" | "profit" | "expiry" | "slow-moving";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  const [salesData, setSalesData] = useState<Record<string, unknown> | null>(null);
  const [gstData, setGstData] = useState<Record<string, unknown>[] | null>(null);
  const [profitData, setProfitData] = useState<Record<string, unknown> | null>(null);
  const [expiryData, setExpiryData] = useState<Record<string, unknown> | null>(null);
  const [slowData, setSlowData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetchMap: Record<Tab, string> = {
      sales: "/api/reports?type=summary",
      gst: "/api/reports/gst",
      profit: "/api/reports?type=profit",
      expiry: "/api/reports?type=expiry",
      "slow-moving": "/api/reports?type=slow-moving"
    };
    fetch(fetchMap[activeTab]).then((r) => r.json()).then((d) => {
      if (activeTab === "sales") setSalesData(d.data);
      else if (activeTab === "gst") setGstData(d.data);
      else if (activeTab === "profit") setProfitData(d.data);
      else if (activeTab === "expiry") setExpiryData(d.data);
      else setSlowData(d.data);
    }).finally(() => setLoading(false));
  }, [activeTab]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "sales", label: "Sales", icon: <TrendingUp className="h-4 w-4" /> },
    { key: "gst", label: "GST", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "profit", label: "Profit & Loss", icon: <TrendingUp className="h-4 w-4" /> },
    { key: "expiry", label: "Expiry Analysis", icon: <AlertTriangle className="h-4 w-4" /> },
    { key: "slow-moving", label: "Slow Moving", icon: <Clock className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Comprehensive business intelligence for your pharmacy" action={
        <div className="flex gap-2">
          <a href={`/api/export/${activeTab === "slow-moving" ? "inventory" : activeTab}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors">
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </div>
      } />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-white text-med-navy shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
      ) : (
        <div className="animate-fade-in">
          {/* Sales Summary */}
          {activeTab === "sales" && salesData && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total Sales" value={formatCurrency(Number(salesData.totalPaisa ?? 0))} sub={`${salesData.bills ?? 0} invoices`} color="emerald" />
              <MetricCard label="Today's Sales" value={formatCurrency(Number(salesData.todaySalesPaisa ?? 0))} sub={`${salesData.todayBills ?? 0} bills`} color="sky" />
              <MetricCard label="GST Collected" value={formatCurrency(Number(salesData.gstPaisa ?? 0))} sub="Total tax" color="purple" />
              <MetricCard label="Outstanding" value={formatCurrency(Number(salesData.duePaisa ?? 0))} sub="Credit pending" color="orange" />
            </div>
          )}

          {/* GST Report */}
          {activeTab === "gst" && gstData && (
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">HSN Code</th>
                  <th className="px-4 py-3 font-medium">GST Rate</th>
                  <th className="px-4 py-3 font-medium">Taxable Amount</th>
                  <th className="px-4 py-3 font-medium">GST Amount</th>
                </tr></thead>
                <tbody>
                  {gstData.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{String(row.hsnCode ?? "-")}</td>
                      <td className="px-4 py-3">{Number(row.gstRate)}%</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(Number(row.taxablePaisa))}</td>
                      <td className="px-4 py-3 font-semibold text-med-green">{formatCurrency(Number(row.gstPaisa))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {gstData.length === 0 && <div className="py-12 text-center text-slate-400">No GST data yet</div>}
            </div>
          )}

          {/* Profit & Loss */}
          {activeTab === "profit" && profitData && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Total Revenue" value={formatCurrency(Number(profitData.totalRevenue ?? 0))} sub={`${profitData.itemCount ?? 0} items sold`} color="emerald" />
                <MetricCard label="Cost of Goods" value={formatCurrency(Number(profitData.totalCost ?? 0))} sub="Purchase cost" color="sky" />
                <MetricCard label="Tax Collected" value={formatCurrency(Number(profitData.totalGst ?? 0))} sub="GST" color="purple" />
                <MetricCard label="Gross Profit" value={formatCurrency(Number(profitData.grossProfit ?? 0))} sub={`${profitData.marginPercent ?? 0}% margin`} color={Number(profitData.grossProfit) >= 0 ? "emerald" : "red"} />
              </div>
              <div className="glass-card p-6">
                <h3 className="font-display text-lg font-semibold text-med-navy mb-4">Profit Breakdown</h3>
                <div className="space-y-3">
                  <BarRow label="Revenue" value={Number(profitData.totalRevenue ?? 0)} max={Number(profitData.totalRevenue ?? 1)} color="bg-emerald-400" />
                  <BarRow label="COGS" value={Number(profitData.totalCost ?? 0)} max={Number(profitData.totalRevenue ?? 1)} color="bg-sky-400" />
                  <BarRow label="GST" value={Number(profitData.totalGst ?? 0)} max={Number(profitData.totalRevenue ?? 1)} color="bg-purple-400" />
                  <BarRow label="Gross Profit" value={Number(profitData.grossProfit ?? 0)} max={Number(profitData.totalRevenue ?? 1)} color="bg-med-green" />
                </div>
              </div>
            </div>
          )}

          {/* Expiry Analysis */}
          {activeTab === "expiry" && expiryData && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Expired", data: expiryData.expired as Record<string, unknown>, color: "red" as const },
                  { label: "Within 30 Days", data: expiryData.within30 as Record<string, unknown>, color: "orange" as const },
                  { label: "Within 90 Days", data: expiryData.within90 as Record<string, unknown>, color: "yellow" as const },
                  { label: "Within 180 Days", data: expiryData.within180 as Record<string, unknown>, color: "emerald" as const },
                ].map((g) => (
                  <div key={g.label} className={`glass-card p-4 border-l-4 ${g.color === "red" ? "border-l-red-500" : g.color === "orange" ? "border-l-orange-500" : g.color === "yellow" ? "border-l-yellow-500" : "border-l-emerald-500"}`}>
                    <p className="text-sm text-slate-500">{g.label}</p>
                    <p className="text-2xl font-bold text-med-navy mt-1">{Number(g.data?.count ?? 0)} items</p>
                    <p className="text-xs text-slate-400 mt-1">Value at risk: {formatCurrency(Number(g.data?.valuePaisa ?? 0))}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slow Moving */}
          {activeTab === "slow-moving" && slowData && (
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Medicine</th>
                  <th className="px-4 py-3 font-medium">Batch</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Days Since Last Sale</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                </tr></thead>
                <tbody>
                  {(slowData as Record<string, unknown>[]).map((row: Record<string, unknown>, i: number) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-med-navy">{String((row.medicine as Record<string, unknown>)?.name ?? "")}</td>
                      <td className="px-4 py-3 font-mono text-xs">{String(row.batchNo)}</td>
                      <td className="px-4 py-3">{Number(row.quantity)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${Number(row.daysSinceLastSale) > 90 ? "bg-red-100 text-red-700" : Number(row.daysSinceLastSale) > 60 ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {row.daysSinceLastSale === 999 ? "Never sold" : `${row.daysSinceLastSale} days`}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(Number(row.mrpPaisa) * Number(row.quantity))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {slowData.length === 0 && <div className="py-12 text-center text-slate-400"><Package className="h-10 w-10 mx-auto mb-3 text-slate-300" /><p>All items are moving well</p></div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const bgMap: Record<string, string> = { emerald: "bg-emerald-50 border-l-emerald-500", sky: "bg-sky-50 border-l-sky-500", purple: "bg-purple-50 border-l-purple-500", orange: "bg-orange-50 border-l-orange-500", red: "bg-red-50 border-l-red-500", yellow: "bg-yellow-50 border-l-yellow-500" };
  return (
    <div className={`glass-card p-4 border-l-4 ${bgMap[color] ?? bgMap.emerald}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-xl font-bold text-med-navy mt-1">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm text-slate-500 shrink-0">{label}</span>
      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-28 text-right text-sm font-semibold text-med-navy">{formatCurrency(value)}</span>
    </div>
  );
}
