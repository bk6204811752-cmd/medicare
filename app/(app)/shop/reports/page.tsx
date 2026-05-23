"use client";

import { useEffect, useState } from "react";
import { BarChart3, Download, AlertTriangle, Clock, TrendingUp, Package, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";

type Tab = "sales" | "gst" | "profit" | "expiry" | "slow-moving";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  const [salesData, setSalesData] = useState<Record<string, unknown> | null>(null);
  const [trendData, setTrendData] = useState<{ day: string; sales: number; bills: number }[] | null>(null);
  const [gstData, setGstData] = useState<Record<string, unknown>[] | null>(null);
  const [profitData, setProfitData] = useState<Record<string, unknown> | null>(null);
  const [expiryData, setExpiryData] = useState<Record<string, unknown> | null>(null);
  const [slowData, setSlowData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [selectedExpiryGroup, setSelectedExpiryGroup] = useState<"expired" | "within30" | "within90" | "within180">("expired");

  useEffect(() => {
    setLoading(true);
    const fetchMap: Record<Tab, string> = {
      sales: "/api/reports?type=summary",
      gst: "/api/reports/gst",
      profit: "/api/reports?type=profit",
      expiry: "/api/reports?type=expiry",
      "slow-moving": "/api/reports?type=slow-moving"
    };

    if (activeTab === "sales") {
      Promise.all([
        fetch("/api/reports?type=summary").then((r) => r.json()),
        fetch("/api/reports?type=trend").then((r) => r.json())
      ])
        .then(([summaryRes, trendRes]) => {
          setSalesData(summaryRes.data);
          setTrendData(trendRes.data);
          setLastUpdated(new Date().toLocaleTimeString());
        })
        .catch((err) => console.error("Error fetching sales reports:", err))
        .finally(() => setLoading(false));
    } else {
      fetch(fetchMap[activeTab])
        .then((r) => r.json())
        .then((d) => {
          if (activeTab === "gst") setGstData(d.data);
          else if (activeTab === "profit") setProfitData(d.data);
          else if (activeTab === "expiry") setExpiryData(d.data);
          else setSlowData(d.data);
          setLastUpdated(new Date().toLocaleTimeString());
        })
        .catch((err) => console.error("Error fetching report:", err))
        .finally(() => setLoading(false));
    }
  }, [activeTab, refreshTrigger]);

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
        <div className="flex flex-wrap items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-slate-400 mr-2">
              Last updated: {lastUpdated}
            </span>
          )}
          <button
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <a href={`/api/export/${activeTab === "slow-moving" ? "inventory" : activeTab}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
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
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Total Sales" value={formatCurrency(Number(salesData.totalPaisa ?? 0))} sub={`${salesData.bills ?? 0} invoices`} color="emerald" />
                <MetricCard label="Today's Sales" value={formatCurrency(Number(salesData.todaySalesPaisa ?? 0))} sub={`${salesData.todayBills ?? 0} bills`} color="sky" />
                <MetricCard label="GST Collected" value={formatCurrency(Number(salesData.gstPaisa ?? 0))} sub="Total tax" color="purple" />
                <MetricCard label="Outstanding" value={formatCurrency(Number(salesData.duePaisa ?? 0))} sub="Credit pending" color="orange" />
              </div>

              {trendData && trendData.length > 0 && (
                <SalesTrendChart data={trendData} />
              )}
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
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { key: "expired", label: "Expired", data: expiryData.expired as Record<string, unknown>, color: "red" as const },
                  { key: "within30", label: "Within 30 Days", data: expiryData.within30 as Record<string, unknown>, color: "orange" as const },
                  { key: "within90", label: "Within 90 Days", data: expiryData.within90 as Record<string, unknown>, color: "yellow" as const },
                  { key: "within180", label: "Within 180 Days", data: expiryData.within180 as Record<string, unknown>, color: "emerald" as const },
                ].map((g) => {
                  const isSelected = selectedExpiryGroup === g.key;
                  return (
                    <div
                      key={g.label}
                      onClick={() => setSelectedExpiryGroup(g.key as any)}
                      className={`glass-card p-4 border-l-4 cursor-pointer transition-all hover:shadow-md hover:translate-y-[-2px] ${
                        isSelected 
                          ? "bg-slate-50 ring-2 ring-med-green/20 scale-[1.02]" 
                          : "bg-white"
                      } ${
                        g.color === "red" 
                          ? "border-l-red-500" 
                          : g.color === "orange" 
                          ? "border-l-orange-500" 
                          : g.color === "yellow" 
                          ? "border-l-yellow-500" 
                          : "border-l-emerald-500"
                      }`}
                    >
                      <p className="text-sm text-slate-500 font-medium">{g.label}</p>
                      <p className="text-2xl font-bold text-med-navy mt-1">{Number(g.data?.count ?? 0)} items</p>
                      <p className="text-xs text-slate-400 mt-1">Value at risk: {formatCurrency(Number(g.data?.valuePaisa ?? 0))}</p>
                    </div>
                  );
                })}
              </div>

              {/* Expiring items details table */}
              <div className="glass-card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-med-navy capitalize">
                    {selectedExpiryGroup === "expired" ? "Expired Items" : `Expiring ${selectedExpiryGroup.replace("within", "within ")} Days`}
                  </h3>
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    Showing max 20
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-left text-slate-500">
                        <th className="px-4 py-3 font-medium">Medicine</th>
                        <th className="px-4 py-3 font-medium">Batch</th>
                        <th className="px-4 py-3 font-medium text-center">Expiry Date</th>
                        <th className="px-4 py-3 font-medium text-center">Stock</th>
                        <th className="px-4 py-3 font-medium text-right">Value (MRP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((expiryData[selectedExpiryGroup] as Record<string, unknown>)?.items as any[] ?? []).map((row: any, i: number) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <p className="font-medium text-med-navy">{row.medicine?.name}</p>
                            {row.medicine?.genericName && (
                              <p className="text-xs text-slate-400 italic">{row.medicine?.genericName}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.batchNo}</td>
                          <td className="px-4 py-3 text-center font-medium text-slate-700">
                            {row.expiryDate}
                          </td>
                          <td className="px-4 py-3 text-center">{row.quantity}</td>
                          <td className="px-4 py-3 font-semibold text-right text-slate-900">
                            {formatCurrency(row.mrpPaisa * row.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {((expiryData[selectedExpiryGroup] as Record<string, unknown>)?.items as any[] ?? []).length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    <Package className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                    <p>No items found in this category</p>
                  </div>
                )}
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

function SalesTrendChart({ data }: { data: { day: string; sales: number; bills: number }[] }) {
  const maxSales = Math.max(...data.map((d) => d.sales), 100);
  const yAxisMax = Math.ceil(maxSales / 500) * 500;
  const steps = [yAxisMax, (yAxisMax * 3) / 4, yAxisMax / 2, yAxisMax / 4, 0];

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-lg font-semibold text-med-navy">7-Day Sales Trend</h3>
          <p className="text-xs text-slate-400">Daily sales revenue in Rupees (₹)</p>
        </div>
      </div>
      <div className="relative h-64 w-full">
        <svg className="w-full h-full" viewBox="0 0 600 220" preserveAspectRatio="none">
          {/* Grid lines & Y-axis labels */}
          {steps.map((val, idx) => {
            const y = 20 + idx * 35;
            return (
              <g key={idx} className="opacity-40">
                <line x1="60" y1={y} x2="580" y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                <text x="50" y={y + 4} textAnchor="end" className="text-[10px] font-semibold fill-slate-400 font-sans">
                  ₹{val}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, idx) => {
            const x = 85 + idx * 70;
            const barHeight = yAxisMax > 0 ? (item.sales / yAxisMax) * 140 : 0;
            const y = 160 - barHeight;
            const isMax = item.sales === maxSales && maxSales > 0;

            return (
              <g key={idx} className="group cursor-pointer">
                {/* Tooltip on hover */}
                <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <rect x={x - 20} y={y - 30} width="70" height="24" rx="4" fill="#0f172a" />
                  <text x={x + 15} y={y - 14} textAnchor="middle" className="text-[10px] font-bold fill-white">
                    ₹{item.sales}
                  </text>
                  <path d={`M ${x + 15} ${y - 6} L ${x + 10} ${y} L ${x + 20} ${y} Z`} fill="#0f172a" />
                </g>

                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width="30"
                  height={Math.max(barHeight, 4)}
                  rx="4"
                  className={`transition-all duration-300 ${
                    isMax 
                      ? "fill-med-green hover:fill-med-greenDark" 
                      : "fill-slate-300 hover:fill-med-greenSoft text-slate-500"
                  }`}
                />

                {/* Labels */}
                <text x={x + 15} y="185" textAnchor="middle" className="text-[11px] font-semibold fill-slate-500 font-sans">
                  {item.day}
                </text>
                <text x={x + 15} y="198" textAnchor="middle" className="text-[9px] fill-slate-400 font-sans">
                  {item.bills} bills
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
