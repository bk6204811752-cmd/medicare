"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle, AlertOctagon, CalendarClock, Package, Search,
  ArrowUpRight, Loader2, BellRing, CheckCircle, Key, XCircle,
  FileText, CheckCircle2, Clock, Copy, Check, CheckSquare
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  createdAt: string;
};

type InAppNotification = {
  id: string;
  type: string; // "stockist_order_placed" | "otp_ready" | "order_rejected" | "purchase_auto_created"
  title: string;
  message: string;
  payload: string | null;
  isRead: boolean;
  createdAt: string;
};

type FilterTab = "all" | "expiry" | "low_stock" | "stockist";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [sysRes, inAppRes] = await Promise.all([
        fetch("/api/notifications").then((r) => r.json()),
        fetch("/api/in-app-notifications").then((r) => r.json()),
      ]);
      setNotifications(sysRes.data ?? []);
      setInAppNotifications(inAppRes.data ?? []);
    } catch (e) {
      console.error("Failed to load notifications", e);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("OTP copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const markAllRead = async () => {
    try {
      const res = await fetch("/api/in-app-notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setInAppNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        toast.success("All stockist notifications marked as read");
      }
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  };

  const counts = useMemo(() => {
    const unreadStockist = inAppNotifications.filter((n) => !n.isRead).length;
    return {
      all: notifications.length + inAppNotifications.length,
      expiry: notifications.filter((n) => n.type === "expiry_alert").length,
      low_stock: notifications.filter((n) => n.type === "low_stock").length,
      stockist: inAppNotifications.length,
      unreadStockist,
    };
  }, [notifications, inAppNotifications]);

  const allMerged = useMemo(() => {
    const std = notifications.map((n) => ({ ...n, source: "system" as const }));
    const inApp = inAppNotifications.map((n) => ({ ...n, source: "stockist" as const }));
    return [...std, ...inApp].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications, inAppNotifications]);

  const filtered = useMemo(() => {
    return allMerged.filter((n) => {
      // Tab filter
      if (activeTab === "expiry" && (n.source !== "system" || n.type !== "expiry_alert")) return false;
      if (activeTab === "low_stock" && (n.source !== "system" || n.type !== "low_stock")) return false;
      if (activeTab === "stockist" && n.source !== "stockist") return false;

      // Search filter
      if (search.trim() !== "") {
        const q = search.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [allMerged, activeTab, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications & Alerts"
        description="Dynamic system health alerts, stock reorders, and stockist order delivery updates."
        action={
          <div className="flex gap-2">
            {counts.unreadStockist > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <CheckSquare className="h-4 w-4 text-slate-500" />
                Mark Stockist Read
              </button>
            )}
            <button
              onClick={() => fetchAll(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {loading || refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellRing className="h-4 w-4" />
              )}
              Check Live Updates
            </button>
          </div>
        }
      />

      {/* Navigation Tabs and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit flex-wrap">
          {[
            { key: "all", label: "All Alerts", count: counts.all, bg: "bg-slate-200 text-slate-700" },
            { key: "expiry", label: "Expiry Warnings", count: counts.expiry, bg: "bg-red-100 text-red-700" },
            { key: "low_stock", label: "Low Stock", count: counts.low_stock, bg: "bg-amber-100 text-amber-800" },
            { key: "stockist", label: "Stockist Updates", count: counts.unreadStockist, bg: "bg-emerald-100 text-emerald-800" },
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
            placeholder="Search alerts..."
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
            <div key={i} className="h-20 skeleton rounded-xl animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            if (n.source === "stockist") {
              // Custom rendering for stockist in-app notifications
              const payloadObj = n.payload ? JSON.parse(n.payload) : null;
              let IconComponent = BellRing;
              let iconColorClasses = "bg-slate-100 text-slate-600 border-slate-200";
              let borderClasses = "border-l-slate-400";

              if (n.type === "otp_ready") {
                IconComponent = Key;
                iconColorClasses = "bg-emerald-50 text-emerald-600 border-emerald-100";
                borderClasses = "border-l-emerald-500";
              } else if (n.type === "order_rejected") {
                IconComponent = XCircle;
                iconColorClasses = "bg-red-50 text-red-600 border-red-100";
                borderClasses = "border-l-red-500";
              } else if (n.type === "purchase_auto_created") {
                IconComponent = CheckCircle2;
                iconColorClasses = "bg-blue-50 text-blue-600 border-blue-100";
                borderClasses = "border-l-blue-500";
              }

              return (
                <article
                  key={n.id}
                  className={`flex flex-col gap-4 rounded-xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm transition-all hover:shadow-md ${borderClasses} ${
                    !n.isRead ? "bg-emerald-50/10" : ""
                  }`}
                >
                  <div className="flex gap-4 items-start">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${iconColorClasses}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-med-navy text-sm sm:text-base">{n.title}</h2>
                        {!n.isRead && (
                          <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5">
                            NEW
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {formatDate(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{n.message}</p>

                      {/* Render OTP Details if type is otp_ready */}
                      {n.type === "otp_ready" && payloadObj && (
                        <div className="mt-4 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 max-w-md space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Delivery Verification OTP
                            </span>
                            {payloadObj.otpExpiresAt && (
                              <span className="text-[11px] text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Expires: {new Date(payloadObj.otpExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-3xl font-black tracking-widest text-emerald-900 bg-white border border-emerald-200 px-4 py-1.5 rounded-lg shadow-sm">
                              {payloadObj.otp}
                            </span>
                            <button
                              onClick={() => handleCopy(n.id, payloadObj.otp)}
                              className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-700 transition-colors border border-emerald-200 bg-white shadow-sm"
                              title="Copy OTP"
                            >
                              {copiedId === n.id ? (
                                <Check className="h-5 w-5 text-emerald-600" />
                              ) : (
                                <Copy className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          <div className="text-xs text-emerald-800/80 font-medium">
                            Give this OTP to the stockist delivery agent when they arrive at your shop.
                          </div>
                        </div>
                      )}

                      {/* Render auto-created PO link if type is purchase_auto_created */}
                      {n.type === "purchase_auto_created" && payloadObj && (
                        <div className="mt-3 p-3 rounded-lg bg-blue-50/30 border border-blue-100/70 max-w-md space-y-2 text-xs">
                          <div className="grid grid-cols-2 gap-2 text-slate-500">
                            <div>Stockist / Supplier:</div>
                            <div className="font-semibold text-slate-700">{payloadObj.supplierName}</div>
                            <div>Auto PO Number:</div>
                            <div className="font-mono font-semibold text-slate-700">{payloadObj.poNumber}</div>
                            <div>Order Total:</div>
                            <div className="font-semibold text-slate-700">{formatCurrency(payloadObj.totalPaisa)}</div>
                          </div>
                          <div className="pt-2">
                            <Link
                              href={`/shop/purchases/${payloadObj.poId}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors underline"
                            >
                              View Purchase Order Receipt <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            }

            // Standard notification rendering (system expiry/low stock)
            const isExpiry = n.type === "expiry_alert";
            const isDanger = n.severity === "danger";
            
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
                      href="/shop/order-stockist"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-med-green px-3.5 py-2 text-xs font-bold text-white hover:bg-med-greenDark transition-colors"
                    >
                      Order from Stockist <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </article>
            );
          })}

          {filtered.length === 0 && (
            <div className="glass-card flex flex-col items-center justify-center py-16 text-center bg-white border border-slate-200 rounded-xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-med-green mb-4">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="font-display text-lg font-bold text-med-navy">All Caught Up!</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                No active notifications found for this category.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
