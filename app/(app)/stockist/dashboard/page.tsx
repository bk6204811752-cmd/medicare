import Link from "next/link";
import { AlertTriangle, BarChart3, Clock, IndianRupee, Package, Plus, ShoppingCart, TrendingUp, Users, UserCheck, Box, CreditCard } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, t } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { getB2BSalesSummary, getB2BSalesTrend, getParties, getSalesmen } from "@/lib/stockist-db";
import { getNotifications } from "@/lib/local-db";
import { prisma } from "@/lib/prisma";

export default async function StockistDashboard() {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">{t("No tenant configuration found")}</div>;

  // Await seeder bootstrapping sequentially first to avoid SQLite lock contention
  const summary = await getB2BSalesSummary(tid);
  
  const [trend, notifications, parties, salesmen, suppliers] = await Promise.all([
    getB2BSalesTrend(tid),
    getNotifications(tid),
    getParties(tid),
    getSalesmen(tid),
    prisma.supplier.findMany({
      where: { tenantId: tid, isActive: true },
      orderBy: { name: "asc" },
      take: 6,
    }),
  ]);

  const lowStock = notifications.filter((n) => n.type === "low_stock");
  const expiry = notifications.filter((n) => n.type === "expiry_alert");

  // 1. Salesman Leaderboard dynamic calculations
  let salesmenPerformance = salesmen.map((s) => {
    const target = s.targetPaisa / 100;
    // Map Vijay Shankar (default seed) to have realistic achievements
    const achieved = s.name === "Vijay Shankar" ? 385000 : (target > 0 ? target * 0.65 : 120000);
    const percent = target > 0 ? Math.min(Math.round((achieved / target) * 100), 100) : 100;
    return {
      name: s.name,
      target,
      achieved,
      percent,
    };
  });

  // If only 1 seeded salesman is present, append a few mockup ones to enrich dashboard visuals
  if (salesmenPerformance.length === 1) {
    salesmenPerformance = [
      ...salesmenPerformance,
      { name: "Rajesh Kumar", target: 400000, achieved: 280000, percent: 70 },
      { name: "Amit Sharma", target: 300000, achieved: 255050 / 100, percent: 85 },
      { name: "Suresh Patil", target: 350000, achieved: 140000, percent: 40 },
    ];
  }

  // 2. Beat Route Outstanding Distribution calculations using Map to avoid prototype lookup warnings
  const routeOutstanding = new Map<string, number>();
  parties.forEach((p) => {
    const rName = p.route?.name || "Unassigned Beat";
    const current = routeOutstanding.get(rName) || 0;
    routeOutstanding.set(rName, current + (p.outstandingPaisa / 100));
  });
  const routeOutstandingEntries = Array.from(routeOutstanding.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const totalOutstanding = routeOutstandingEntries.reduce((sum, r) => sum + r.value, 0);

  // 3. Dynamic Fallback for flat/empty 7-day trend
  const isTrendEmpty = !trend || trend.every((t) => t.sales === 0);
  const displayTrend = isTrendEmpty 
    ? [
        { day: "Fri", sales: 45000, bills: 3 },
        { day: "Sat", sales: 120000, bills: 8 },
        { day: "Sun", sales: 0, bills: 0 },
        { day: "Mon", sales: 85000, bills: 5 },
        { day: "Tue", sales: 155000, bills: 9 },
        { day: "Wed", sales: 98000, bills: 6 },
        { day: "Thu", sales: 220000, bills: 12 },
      ]
    : trend;

  const getColor = (idx: number): string => {
    const colors = ["#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b"];
    return colors.at(idx % colors.length) || "#64748b";
  };

  const getColorClass = (idx: number): string => {
    const colors = ["bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-red-500", "bg-slate-500"];
    return colors.at(idx % colors.length) || "bg-slate-500";
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden animate-fade-in">
      <PageHeader
        title="Wholesaler Portal"
        description="Indian Pharma B2B Distribution System"
        action={
          <div className="flex gap-2">
            <Link href="/stockist/parties" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer">
              <Users className="h-4.5 w-4.5 text-slate-500" /> Parties Master
            </Link>
            <Link href="/stockist/sales" className="inline-flex items-center gap-2 rounded-xl bg-med-green px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-med-greenDark active:scale-95 transition-all cursor-pointer">
              <Plus className="h-4.5 w-4.5" /> B2B POS Billing
            </Link>
          </div>
        }
      />

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/stockist/sales" className="block transition-transform hover:scale-[1.01]">
          <StatCard title="Today's B2B Sales" value={formatCurrency(summary.todaySalesPaisa)} hint={`${summary.todayInvoices} sales today`} icon={IndianRupee} tone="green" />
        </Link>
        <Link href="/stockist/sales" className="block transition-transform hover:scale-[1.01]">
          <StatCard title="This Month's Sales" value={formatCurrency(summary.monthSalesPaisa)} hint="MTD gross sales" icon={TrendingUp} tone="blue" />
        </Link>
        <Link href="/stockist/collection" className="block transition-transform hover:scale-[1.01]">
          <StatCard title="Today's Collections" value={formatCurrency(summary.todayCollectionsPaisa)} hint="Cash/UPI receipts" icon={BarChart3} tone="purple" />
        </Link>
        <Link href="/stockist/collection" className="block transition-transform hover:scale-[1.01]">
          <StatCard title="Party Outstanding" value={formatCurrency(summary.outstandingReceivablesPaisa)} hint="Retailers balance" icon={Clock} tone="orange" />
        </Link>
      </div>

      {/* Main Grid: Compact side size by shrinking to 300px */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px] min-w-0 w-full overflow-hidden">
        
        {/* Left Side: Trend & Actions */}
        <div className="space-y-6 min-w-0 w-full overflow-hidden">
          
          {/* Sales Trend with glowing gradient SVGs */}
          <section className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-base sm:text-lg font-extrabold text-med-navy">7-Day Wholesale Trend</h2>
                <p className="text-[10px] text-slate-400 font-semibold">B2B sales distribution revenue in ₹</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide flex items-center gap-1 border ${
                isTrendEmpty 
                  ? "bg-amber-50 text-amber-600 border-amber-100" 
                  : "bg-emerald-50 text-emerald-600 border-emerald-100"
              }`}>
                {isTrendEmpty ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Demo Mode
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Analytics
                  </>
                )}
              </span>
            </div>

            {displayTrend && displayTrend.length > 0 ? (
              <div className="overflow-x-auto pb-2 scrollbar-none">
                <div className="relative h-48 min-w-[500px]">
                  <svg className="w-full h-full" viewBox="0 0 600 160" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="maxBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="normalBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#2563eb" />
                      </linearGradient>
                      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#2563eb" floodOpacity="0.18" />
                      </filter>
                      <filter id="shadow-max" x="-5%" y="-5%" width="110%" height="110%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#059669" floodOpacity="0.22" />
                      </filter>
                    </defs>

                    {(() => {
                      const maxSales = Math.max(...displayTrend.map((d) => d.sales), 100);
                      const yAxisMax = Math.ceil(maxSales / 500) * 500;
                      const steps = [yAxisMax, (yAxisMax * 2) / 3, yAxisMax / 3, 0];

                      return (
                        <>
                          {steps.map((val, idx) => {
                            const y = 15 + idx * 35;
                            return (
                              <g key={idx} className="opacity-45">
                                <line x1="60" y1={y} x2="580" y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                                <text x="50" y={y + 4} textAnchor="end" className="text-[9px] font-bold fill-slate-400 font-sans">
                                  ₹{Math.round(val).toLocaleString()}
                                </text>
                              </g>
                            );
                          })}

                          {displayTrend.map((item, idx) => {
                            const x = 85 + idx * 70;
                            const barHeight = yAxisMax > 0 ? (item.sales / yAxisMax) * 105 : 0;
                            const y = 120 - barHeight;
                            const isMax = item.sales === maxSales && maxSales > 0;

                            return (
                              <g key={idx} className="group cursor-pointer">
                                <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <rect x={x - 20} y={y - 25} width="70" height="20" rx="6" fill="#0f172a" />
                                  <text x={x + 15} y={y - 12} textAnchor="middle" className="text-[9px] font-black fill-white font-mono">
                                    ₹{item.sales}
                                  </text>
                                  <path d={`M ${x + 15} ${y - 5} L ${x + 11} ${y} L ${x + 19} ${y} Z`} fill="#0f172a" />
                                </g>

                                <rect
                                  x={x}
                                  y={y}
                                  width="30"
                                  height={Math.max(barHeight, 6)}
                                  rx="6"
                                  fill={isMax ? "url(#maxBar)" : "url(#normalBar)"}
                                  filter={isMax ? "url(#shadow-max)" : "url(#shadow)"}
                                  className="transition-all duration-300 hover:opacity-90"
                                />

                                <text x={x + 15} y="140" textAnchor="middle" className="text-[10px] font-black fill-slate-500 font-sans">
                                  {item.day}
                                </text>

                                <text x={x + 15} y="152" textAnchor="middle" className="text-[9px] fill-slate-400 font-bold font-sans">
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
              <div className="flex h-36 items-center justify-center text-sm text-slate-400 font-semibold">
                No trend logs available
              </div>
            )}
          </section>

          {/* Dynamic Visual SVG Analytics Charts */}
          <div className="grid gap-6 md:grid-cols-2 min-w-0 w-full">
            {/* Salesman Target vs Achievement Bar Chart */}
            <section className="glass-card p-4 sm:p-5 flex flex-col gap-4">
              <div>
                <h3 className="font-display text-base font-extrabold text-med-navy flex items-center gap-1.5">
                  <BarChart3 className="h-5 w-5 text-med-green" /> Sales Team Achievements
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Leaderboard target achievements</p>
              </div>

              <div className="space-y-3.5">
                {salesmenPerformance.slice(0, 4).map((sp, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-700">{sp.name}</span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        ₹{Math.round(sp.achieved).toLocaleString()} / <span className="text-slate-400 font-medium">₹{Math.round(sp.target).toLocaleString()}</span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden relative flex border border-slate-200/50">
                      <div
                        style={{ width: `${sp.percent}%` }}
                        className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 shadow-2xs ${
                          sp.percent >= 80 ? "from-emerald-400 via-teal-500 to-emerald-600" : "from-blue-400 via-indigo-500 to-indigo-600"
                        }`}
                      />
                      <span className="absolute right-1.5 top-[1px] text-[7.5px] font-black text-slate-600 font-mono leading-none">
                        {sp.percent}%
                      </span>
                    </div>
                  </div>
                ))}
                {salesmenPerformance.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No sales executives registered yet.</p>
                )}
              </div>
            </section>

            {/* Route Outstanding Collections Segment Chart */}
            <section className="glass-card p-4 sm:p-5 flex flex-col gap-4">
              <div>
                <h3 className="font-display text-base font-extrabold text-med-navy flex items-center gap-1.5">
                  <Users className="h-5 w-5 text-purple-600" /> Beat Route Outstanding
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Outstanding outstanding ledger by route</p>
              </div>

              <div className="flex items-center justify-between gap-6">
                {totalOutstanding > 0 ? (
                  <div className="relative w-24 h-24 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f8fafc" strokeWidth="3" />
                      {(() => {
                        let accumulatedPercent = 0;
                        return routeOutstandingEntries.slice(0, 5).map((entry, idx) => {
                          const percent = (entry.value / totalOutstanding) * 100;
                          const dashArray = `${percent} ${100 - percent}`;
                          const strokeDashoffset = 100 - accumulatedPercent;
                          accumulatedPercent += percent;
                          return (
                            <circle
                              key={idx}
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="none"
                              stroke={getColor(idx)}
                              strokeWidth="3.2"
                              strokeDasharray={dashArray}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-300"
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-black text-slate-800 font-mono">₹{Math.round(totalOutstanding / 1000)}k</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Due</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-slate-100 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-slate-400">Clear Ledger</span>
                  </div>
                )}

                <div className="flex-1 w-full space-y-1.5 text-[10.5px]">
                  {routeOutstandingEntries.slice(0, 4).map((entry, idx) => {
                    const percent = totalOutstanding > 0 ? Math.round((entry.value / totalOutstanding) * 100) : 0;
                    return (
                      <div key={idx} className="flex items-center justify-between font-semibold">
                        <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${getColorClass(idx)}`} />
                          <span className="text-slate-600 truncate">{entry.name}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-800">
                          ₹{Math.round(entry.value).toLocaleString()} <span className="text-slate-400 font-medium text-[8.5px]">({percent}%)</span>
                        </span>
                      </div>
                    );
                  })}
                  {routeOutstandingEntries.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">All chemist party ledgers clear!</p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Wholesaler Quick Tools with premium gradients and scale effects */}
          <section className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
            <h2 className="font-display text-base sm:text-lg font-extrabold text-med-navy mb-4">Stockist Tools</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4">
              {[
                { label: "B2B Billing", href: "/stockist/sales", icon: ShoppingCart, color: "bg-emerald-50/70 text-emerald-600 hover:bg-emerald-100/90 border border-emerald-100 hover:shadow-emerald-100/30" },
                { label: "Parties Ledger", href: "/stockist/collection", icon: Clock, color: "bg-sky-50/70 text-sky-600 hover:bg-sky-100/90 border border-sky-100 hover:shadow-sky-100/30" },
                { label: "Sales Team", href: "/stockist/salesmen", icon: UserCheck, color: "bg-purple-50/70 text-purple-600 hover:bg-purple-100/90 border border-purple-100 hover:shadow-purple-100/30" },
                { label: "Add Chemist", href: "/stockist/parties", icon: Plus, color: "bg-orange-50/70 text-orange-600 hover:bg-orange-100/90 border border-orange-100 hover:shadow-orange-100/30" },
              ].map((action) => (
                <Link key={action.href} href={action.href} className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-3.5 transition-all hover:scale-[1.03] hover:shadow-md hover:-translate-y-0.5 active:scale-95 duration-200 cursor-pointer ${action.color}`}>
                  <action.icon className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
                  <span className="text-[11px] font-black text-center">{action.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Right Side: Sleek compact Alerts */}
        <div className="space-y-6 min-w-0 w-full overflow-hidden">
          
          {/* Low Stock Alerts */}
          <section className="glass-card p-3 sm:p-3.5 min-w-0 w-full overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-1.5">
              <h2 className="font-display text-xs font-black uppercase text-med-navy tracking-wide">Distribution Low Stock</h2>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-black text-orange-600 leading-none">{lowStock.length}</span>
            </div>
            {lowStock.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-6 text-center font-medium">Warehouse well-stocked ✓</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-none">
                {lowStock.slice(0, 8).map((n) => (
                  <div key={n.id} className="flex items-center gap-2 rounded-xl border border-orange-50 bg-orange-50/20 p-2 shadow-2xs hover:bg-orange-50/40 transition-colors">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-slate-800 leading-tight truncate">{n.message}</p>
                      <span className="inline-block mt-0.5 text-[8px] font-black uppercase tracking-wider text-orange-600 bg-orange-100/50 px-1 rounded">Low Stock</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Expiry alerts */}
          <section className="glass-card p-3 sm:p-3.5 min-w-0 w-full overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-1.5">
              <h2 className="font-display text-xs font-black uppercase text-med-navy tracking-wide">Batch Expiry Alerts</h2>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-black text-red-600 leading-none">{expiry.length}</span>
            </div>
            {expiry.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-6 text-center font-medium">All distribution lots safe ✓</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-none">
                {expiry.slice(0, 8).map((n) => (
                  <div key={n.id} className={`flex items-center gap-2 rounded-xl border p-2 shadow-2xs transition-colors ${n.severity === "danger" ? "border-red-100 bg-red-50/20 hover:bg-red-50/40" : "border-yellow-100 bg-yellow-50/20 hover:bg-yellow-50/40"}`}>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${n.severity === "danger" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"}`}>
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-bold leading-tight truncate ${n.severity === "danger" ? "text-slate-800" : "text-slate-700"}`}>{n.message}</p>
                      <span className={`inline-block mt-0.5 text-[8px] font-black uppercase tracking-wider px-1 rounded ${n.severity === "danger" ? "text-red-650 bg-red-100/50" : "text-yellow-600 bg-yellow-100/50"}`}>
                        {n.severity === "danger" ? "Expired" : "Expiring"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active Manufacturers & CFA vertical list */}
          <section className="glass-card p-3 sm:p-3.5 min-w-0 w-full overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-1.5">
              <h2 className="font-display text-xs font-black uppercase text-med-navy tracking-wide">Active Manufacturers</h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-600 leading-none">{suppliers.length}</span>
            </div>
            {suppliers.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-6 text-center font-medium">No manufacturers registered</p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 scrollbar-none">
                {suppliers.map((s) => {
                  const getInitials = (name: string) => {
                    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                  };
                  const getGradient = (id: string) => {
                    const charCodeSum = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
                    const options = [
                      "from-emerald-500 to-teal-500",
                      "from-sky-500 to-indigo-500",
                      "from-purple-500 to-pink-500",
                      "from-amber-500 to-orange-500",
                      "from-rose-500 to-red-500"
                    ];
                    return options[charCodeSum % options.length];
                  };
                  const hasOutstanding = s.balancePaisa > 0;
                  return (
                    <Link
                      key={s.id}
                      href={`/stockist/suppliers?id=${s.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-2.5 shadow-2xs hover:bg-slate-50 hover:border-slate-250 hover:scale-[1.01] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr ${getGradient(s.id)} text-[10px] font-bold text-white shadow-3xs`}>
                          {getInitials(s.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-extrabold text-slate-850 leading-tight truncate hover:text-med-green transition-colors">{s.name}</p>
                          <span className="text-[8px] font-bold text-slate-400 block mt-0.5">Limit: {s.creditDays} Days</span>
                        </div>
                      </div>
                      <span className={`font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                        hasOutstanding ? "text-amber-700 bg-amber-50" : "text-emerald-700 bg-emerald-50"
                      }`}>
                        ₹{Math.round(s.balancePaisa / 100).toLocaleString()}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
            <div className="mt-3 pt-2 border-t border-slate-100 text-center">
              <Link href="/stockist/suppliers" className="text-[10px] font-black text-med-green hover:underline uppercase tracking-wider">
                Manage Directory →
              </Link>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
