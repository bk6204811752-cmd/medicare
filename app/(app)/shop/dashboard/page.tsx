"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, Clock, IndianRupee, Package, Plus, ShoppingCart, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";

type Summary = { bills: number; totalPaisa: number; gstPaisa: number; duePaisa: number; todayBills: number; todaySalesPaisa: number; todayGstPaisa: number; todayDuePaisa: number };
type Trend = { day: string; sales: number; bills: number }[];
type Notification = { id: string; type: string; title: string; message: string; severity: string };

export default function ShopDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<Trend>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadDashboard = () => {
    setLoading(true);
    setError(null);
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((result) => {
        if (result.error) {
          setError(result.error);
          return;
        }
        const d = result.data ?? {};
        setSummary(d.summary ?? null);
        setTrend(d.trend ?? []);
        setNotifications(d.notifications ?? []);
      })
      .catch(() => setError("Unable to connect. Please check your network."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 skeleton rounded-xl" />)}
        </div>
        <div className="h-64 skeleton rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <button onClick={loadDashboard} className="mt-3 rounded-lg bg-med-green px-4 py-2 text-sm font-semibold text-white hover:bg-med-greenDark transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const lowStock = notifications.filter((n) => n.type === "low_stock");
  const expiry = notifications.filter((n) => n.type === "expiry_alert");

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Your pharmacy at a glance" action={
        <Link href="/shop/billing" className="inline-flex items-center gap-2 rounded-lg bg-med-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-med-greenDark transition-colors">
          <Plus className="h-4 w-4" /> New Bill
        </Link>
      } />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today's Sales" value={formatCurrency(summary?.todaySalesPaisa ?? 0)} hint={`${summary?.todayBills ?? 0} bills today`} icon={IndianRupee} tone="green" />
        <StatCard title="Total Revenue" value={formatCurrency(summary?.totalPaisa ?? 0)} hint={`${summary?.bills ?? 0} total invoices`} icon={TrendingUp} tone="blue" />
        <StatCard title="GST Collected" value={formatCurrency(summary?.todayGstPaisa ?? 0)} hint="Today's GST" icon={BarChart3} tone="purple" />
        <StatCard title="Credit Outstanding" value={formatCurrency(summary?.duePaisa ?? 0)} hint="Pending collections" icon={Clock} tone="orange" />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: Trend + Quick actions */}
        <div className="space-y-6">
          {/* Sales trend */}
          <section className="glass-card p-5">
            <h2 className="font-display text-lg font-semibold text-med-navy mb-4">7-Day Sales Trend</h2>
            <div className="flex items-end gap-2 h-36">
              {trend.map((d, i) => {
                const max = Math.max(...trend.map((t) => t.sales), 1);
                const height = Math.max((d.sales / max) * 100, 4);
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-mono">{d.sales > 0 ? `₹${d.sales}` : ""}</span>
                    <div className="w-full rounded-t-md bg-gradient-to-t from-med-green to-emerald-400 transition-all hover:from-med-greenDark hover:to-med-green"
                      style={{ height: `${height}%`, minHeight: "4px" }} />
                    <span className="text-[10px] text-slate-500 font-medium">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quick actions */}
          <section className="glass-card p-5">
            <h2 className="font-display text-lg font-semibold text-med-navy mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "New Bill", href: "/shop/billing", icon: ShoppingCart, color: "bg-emerald-50 text-med-green hover:bg-emerald-100" },
                { label: "Add Stock", href: "/shop/inventory", icon: Package, color: "bg-sky-50 text-sky-600 hover:bg-sky-100" },
                { label: "Reports", href: "/shop/reports", icon: BarChart3, color: "bg-purple-50 text-purple-600 hover:bg-purple-100" },
                { label: "Purchase", href: "/shop/purchases", icon: Plus, color: "bg-orange-50 text-orange-600 hover:bg-orange-100" },
              ].map((action) => (
                <Link key={action.href} href={action.href} className={`flex flex-col items-center gap-2 rounded-xl p-4 transition-colors ${action.color}`}>
                  <action.icon className="h-6 w-6" />
                  <span className="text-xs font-semibold">{action.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Alerts */}
        <div className="space-y-6">
          {/* Low stock */}
          <section className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold text-med-navy">Low Stock Alerts</h2>
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-600">{lowStock.length}</span>
            </div>
            {lowStock.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">All items are well-stocked ✓</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lowStock.slice(0, 8).map((n) => (
                  <div key={n.id} className="flex items-start gap-2 rounded-lg bg-orange-50 p-2.5">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-orange-700">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Expiry alerts */}
          <section className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold text-med-navy">Expiry Alerts</h2>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-600">{expiry.length}</span>
            </div>
            {expiry.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No expiry warnings ✓</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {expiry.slice(0, 8).map((n) => (
                  <div key={n.id} className={`flex items-start gap-2 rounded-lg p-2.5 ${n.severity === "danger" ? "bg-red-50" : "bg-yellow-50"}`}>
                    <Clock className={`h-4 w-4 mt-0.5 shrink-0 ${n.severity === "danger" ? "text-red-500" : "text-yellow-500"}`} />
                    <p className={`text-xs ${n.severity === "danger" ? "text-red-700" : "text-yellow-700"}`}>{n.message}</p>
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
