import Link from "next/link";
import { AlertTriangle, BarChart3, Clock, IndianRupee, Package, Plus, ShoppingCart, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { getSalesSummary, getSalesTrend, getNotifications } from "@/lib/local-db";

export default async function ShopDashboard() {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div>No tenant found</div>;

  const [summary, trend, notifications] = await Promise.all([
    getSalesSummary(tid),
    getSalesTrend(tid),
    getNotifications(tid),
  ]);

  const lowStock = notifications.filter((n) => n.type === "low_stock");
  const expiry = notifications.filter((n) => n.type === "expiry_alert");

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader title="Dashboard" description="Your pharmacy at a glance" action={
        <div className="flex gap-2">
          <Link href="/shop/billing/history" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
            <Clock className="h-4 w-4 text-slate-500" /> Bill History
          </Link>
          <Link href="/shop/billing" className="inline-flex items-center gap-2 rounded-lg bg-med-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-med-greenDark active:scale-95 transition-all">
            <Plus className="h-4 w-4" /> New Bill
          </Link>
        </div>
      } />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/shop/billing/history" className="block transition-transform hover:scale-[1.01]">
          <StatCard title="Today's Sales" value={formatCurrency(summary?.todaySalesPaisa ?? 0)} hint={`${summary?.todayBills ?? 0} bills today`} icon={IndianRupee} tone="green" />
        </Link>
        <Link href="/shop/billing/history" className="block transition-transform hover:scale-[1.01]">
          <StatCard title="Total Revenue" value={formatCurrency(summary?.totalPaisa ?? 0)} hint={`${summary?.bills ?? 0} total invoices`} icon={TrendingUp} tone="blue" />
        </Link>
        <StatCard title="GST Collected" value={formatCurrency(summary?.todayGstPaisa ?? 0)} hint="Today's GST" icon={BarChart3} tone="purple" />
        <StatCard title="Credit Outstanding" value={formatCurrency(summary?.duePaisa ?? 0)} hint="Pending collections" icon={Clock} tone="orange" />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] min-w-0 w-full overflow-hidden">
        {/* Left: Trend + Quick actions */}
        <div className="space-y-6 min-w-0 w-full overflow-hidden">
          {/* Sales trend */}
          <section className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy">7-Day Sales Trend</h2>
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium">Daily sales revenue in Rupees (₹)</p>
              </div>
              <span className="md:hidden rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-slate-500 flex items-center gap-1 animate-pulse">
                Swipe ↔
              </span>
            </div>            {trend && trend.length > 0 ? (
              <div className="overflow-x-auto pb-2 scrollbar-none">
                <div className="relative h-48 min-w-[500px]">
                  <svg className="w-full h-full" viewBox="0 0 600 160" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="maxBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="normalBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f8fafc" />
                        <stop offset="100%" stopColor="#cbd5e1" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines & Y-axis labels */}
                    {(() => {
                      const maxSales = Math.max(...trend.map((d) => d.sales), 100);
                      const yAxisMax = Math.ceil(maxSales / 500) * 500;
                      const steps = [yAxisMax, (yAxisMax * 2) / 3, yAxisMax / 3, 0];
                      return (
                        <>
                          {steps.map((val, idx) => {
                            const y = 15 + idx * 35;
                            return (
                              <g key={idx} className="opacity-45">
                                <line x1="60" y1={y} x2="580" y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                                <text x="50" y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400 font-sans">
                                  ₹{Math.round(val)}
                                </text>
                              </g>
                            );
                          })}

                          {/* Bars */}
                          {trend.map((item, idx) => {
                            const x = 85 + idx * 70;
                            const barHeight = yAxisMax > 0 ? (item.sales / yAxisMax) * 105 : 0;
                            const y = 120 - barHeight;
                            const isMax = item.sales === maxSales && maxSales > 0;

                            return (
                              <g key={idx} className="group cursor-pointer">
                                {/* Tooltip on hover */}
                                <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <rect x={x - 20} y={y - 25} width="70" height="20" rx="4" fill="#0f172a" />
                                  <text x={x + 15} y={y - 12} textAnchor="middle" className="text-[9px] font-bold fill-white">
                                    ₹{item.sales}
                                  </text>
                                  <path d={`M ${x + 15} ${y - 5} L ${x + 11} ${y} L ${x + 19} ${y} Z`} fill="#0f172a" />
                                </g>

                                {/* Bar */}
                                <rect
                                  x={x}
                                  y={y}
                                  width="30"
                                  height={Math.max(barHeight, 4)}
                                  rx="5"
                                  fill={isMax ? "url(#maxBar)" : "url(#normalBar)"}
                                  className="transition-all duration-300 hover:opacity-90"
                                />

                                {/* Day Label */}
                                <text x={x + 15} y="140" textAnchor="middle" className="text-[11px] font-bold fill-slate-500 font-sans">
                                  {item.day}
                                </text>

                                {/* Bills count */}
                                <text x={x + 15} y="152" textAnchor="middle" className="text-[9px] fill-slate-400 font-semibold font-sans">
                                  {item.bills} bills
                                </text>
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            ) : (
              <div className="flex h-36 items-center justify-center text-sm text-slate-400">
                No trend data available
              </div>
            )}
          </section>

          {/* Quick actions */}
          <section className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
            <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4">
              {[
                { label: "New Bill", href: "/shop/billing", icon: ShoppingCart, color: "bg-emerald-50/70 text-med-green hover:bg-emerald-100 border border-emerald-100/50" },
                { label: "Add Stock", href: "/shop/inventory", icon: Package, color: "bg-sky-50/70 text-sky-600 hover:bg-sky-100 border border-sky-100/50" },
                { label: "Reports", href: "/shop/reports", icon: BarChart3, color: "bg-purple-50/70 text-purple-600 hover:bg-purple-100 border border-purple-100/50" },
                { label: "Purchase", href: "/shop/purchases", icon: Plus, color: "bg-orange-50/70 text-orange-600 hover:bg-orange-100 border border-orange-100/50" },
              ].map((action) => (
                <Link key={action.href} href={action.href} className={`flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 sm:p-4 transition-all hover:scale-[1.03] hover:shadow-xs active:scale-95 duration-200 ${action.color}`}>
                  <action.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-[11px] sm:text-xs font-bold">{action.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Alerts */}
        <div className="space-y-6 min-w-0 w-full overflow-hidden">
          {/* Low stock */}
          <section className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold text-med-navy">Low Stock Alerts</h2>
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-600">{lowStock.length}</span>
            </div>
            {lowStock.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">All items are well-stocked ✓</p>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {lowStock.slice(0, 8).map((n) => (
                  <div key={n.id} className="flex items-center gap-2.5 rounded-xl border border-orange-100 bg-orange-50/40 p-2.5 sm:p-3 shadow-xs transition-colors hover:bg-orange-50">
                    <div className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                      <AlertTriangle className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] sm:text-xs font-semibold text-slate-800 leading-tight">{n.message}</p>
                      <span className="inline-block mt-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100/50 px-1.5 py-0.5 rounded">Low Stock</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Expiry alerts */}
          <section className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold text-med-navy">Expiry Alerts</h2>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-600">{expiry.length}</span>
            </div>
            {expiry.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No expiry warnings ✓</p>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {expiry.slice(0, 8).map((n) => (
                  <div key={n.id} className={`flex items-center gap-2.5 rounded-xl border p-2.5 sm:p-3 shadow-xs transition-colors ${n.severity === "danger" ? "border-red-100 bg-red-50/40 hover:bg-red-50" : "border-yellow-100 bg-yellow-50/40 hover:bg-yellow-50"}`}>
                    <div className={`flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg ${n.severity === "danger" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"}`}>
                      <Clock className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[11px] sm:text-xs font-semibold leading-tight ${n.severity === "danger" ? "text-slate-800" : "text-slate-700"}`}>{n.message}</p>
                      <span className={`inline-block mt-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${n.severity === "danger" ? "text-red-600 bg-red-100/50" : "text-yellow-600 bg-yellow-100/50"}`}>
                        {n.severity === "danger" ? "Expired" : "Expiring"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
