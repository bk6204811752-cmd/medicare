"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, AlertOctagon, CalendarClock, Package, Search, ArrowUpRight, Loader2, BellRing, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  createdAt: string;
};

type FilterTab = "all" | "expiry" | "low_stock";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const fetchNotifications = () => {
    setLoading(true);
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.data ?? []))
      .catch((e) => console.error("Failed to load notifications", e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const counts = useMemo(() => {
    return {
      all: notifications.length,
      expiry: notifications.filter((n) => n.type === "expiry_alert").length,
      low_stock: notifications.filter((n) => n.type === "low_stock").length,
    };
  }, [notifications]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      // Type Filter
      if (activeTab === "expiry" && n.type !== "expiry_alert") return false;
      if (activeTab === "low_stock" && n.type !== "low_stock") return false;

      // Search Filter
      if (search.trim() !== "") {
        const q = search.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [notifications, activeTab, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications & Alerts"
        description="Dynamic system health alerts, stock reorders, and batch expiry monitoring."
        action={
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
            Check Live Updates
          </button>
        }
      />

      {/* Navigation Tabs and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
          {[
            { key: "all", label: "All Alerts", count: counts.all, bg: "bg-slate-200 text-slate-700" },
            { key: "expiry", label: "Expiry Warnings", count: counts.expiry, bg: "bg-red-100 text-red-700" },
            { key: "low_stock", label: "Low Stock", count: counts.low_stock, bg: "bg-amber-100 text-amber-800" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as FilterTab)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-white text-med-navy shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tab.bg}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search alerts by medicine name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20"
          />
        </div>
      </div>

      {/* List of Alerts */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const isExpiry = n.type === "expiry_alert";
            const isDanger = n.severity === "danger";
            
            // Icon assignment
            let IconComponent = BellRing;
            let iconColorClasses = "bg-slate-100 text-slate-600 border-slate-200";
            let borderClasses = "border-l-slate-400";
            
            if (isExpiry) {
              IconComponent = isDanger ? AlertOctagon : CalendarClock;
              iconColorClasses = isDanger 
                ? "bg-red-50 text-red-600 border-red-100" 
                : "bg-amber-50 text-amber-600 border-amber-100";
              borderClasses = isDanger ? "border-l-red-500" : "border-l-amber-500";
            } else if (n.type === "low_stock") {
              IconComponent = AlertTriangle;
              iconColorClasses = "bg-orange-50 text-orange-600 border-orange-100";
              borderClasses = "border-l-orange-500";
            }

            return (
              <article
                key={n.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm transition-all hover:shadow-md ${borderClasses}`}
              >
                <div className="flex gap-4 items-start">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${iconColorClasses}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-med-navy text-sm sm:text-base">{n.title}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isDanger 
                          ? "bg-red-100 text-red-700" 
                          : n.severity === "warning" 
                          ? "bg-orange-100 text-orange-700" 
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {n.severity}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">{n.message}</p>
                  </div>
                </div>

                {/* Quick actions depending on alert type */}
                <div className="sm:shrink-0 flex items-center gap-2 self-end sm:self-auto">
                  {n.type === "low_stock" ? (
                    <Link
                      href="/shop/inventory"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-med-navy hover:bg-slate-100 transition-colors"
                    >
                      Inventory <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <Link
                      href="/shop/inventory"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-med-navy hover:bg-slate-100 transition-colors"
                    >
                      Check Batches <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  {n.type === "low_stock" && (
                    <Link
                      href="/shop/purchases"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-med-green px-3.5 py-2 text-xs font-bold text-white hover:bg-med-greenDark transition-colors"
                    >
                      Create PO <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </article>
            );
          })}

          {filtered.length === 0 && (
            <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-med-green mb-4">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="font-display text-lg font-bold text-med-navy">All Caught Up!</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                No active notifications found. All products are well-stocked and none are close to expiration.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
