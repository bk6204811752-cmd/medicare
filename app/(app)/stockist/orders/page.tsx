"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShoppingBag, Loader2, Search, CheckCircle2, Clock,
  Truck, Package, AlertCircle, ChevronDown, RefreshCw,
  Building2, Phone, XCircle, Key, FileText, Ban
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";

type OrderItem = {
  id: string;
  medicineName: string;
  quantity: number;
  ratePaisa: number;
  totalPaisa: number;
};

type ChemistTenant = {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
};

type StockistOrder = {
  id: string;
  orderNo: string;
  status: string;
  totalPaisa: number;
  notes: string | null;
  orderDate: string;
  createdAt: string;
  chemistTenant: ChemistTenant;
  items: OrderItem[];
};

type FilterStatus = "all" | "pending" | "otp_sent" | "delivered" | "cancelled";

export default function StockistOrdersPage() {
  const [orders, setOrders] = useState<StockistOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [selectedOrder, setSelectedOrder] = useState<StockistOrder | null>(null);

  // Modals state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/stockist-orders/incoming");
      const d = await res.json();
      setOrders(d.data ?? []);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Auto-refresh every 30 seconds so new chemist orders appear automatically
    const interval = setInterval(() => fetchOrders(true), 30000);

    // Refresh when tab becomes visible again (user switches back to this tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchOrders(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleAccept = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/stockist-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Order accepted. OTP has been sent to the chemist.");
        fetchOrders(true);
      } else {
        toast.error(d.error || "Failed to accept order");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    setActionLoading(selectedOrder.id);
    try {
      const res = await fetch(`/api/stockist-orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: rejectReason }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Order rejected and chemist notified.");
        setShowRejectModal(false);
        setRejectReason("");
        setSelectedOrder(null);
        fetchOrders(true);
      } else {
        toast.error(d.error || "Failed to reject order");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedOrder) return;
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }
    setActionLoading(selectedOrder.id);
    try {
      const res = await fetch(`/api/stockist-orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_delivery", otp: otpCode }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(`Delivery verified! Auto-purchase order ${d.data?.poNumber || ""} created on chemist's tenant.`);
        setShowOtpModal(false);
        setOtpCode("");
        setSelectedOrder(null);
        fetchOrders(true);
      } else {
        toast.error(d.error || "Invalid or expired OTP");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      otp_sent: orders.filter((o) => o.status === "otp_sent").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search.trim() !== "") {
        const q = search.toLowerCase();
        return (
          o.orderNo.toLowerCase().includes(q) ||
          o.chemistTenant.name.toLowerCase().includes(q) ||
          o.items.some((i) => i.medicineName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100">
            <Clock className="h-3 w-3" /> Pending Review
          </span>
        );
      case "otp_sent":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-100">
            <Key className="h-3 w-3" /> OTP Ready (Awaiting Delivery)
          </span>
        );
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="h-3 w-3" /> Delivered & Verified
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 border border-red-100">
            <Ban className="h-3 w-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-100">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incoming Chemist Orders"
        description="Review B2B orders from chemists, accept orders to issue OTP delivery codes, and confirm delivery in real-time."
        action={
          <button
            onClick={() => fetchOrders(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {loading || refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh Orders
          </button>
        }
      />

      {/* ── New Pending Orders Alert Banner ── */}
      {counts.pending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-blue-400 bg-blue-50 px-5 py-3.5 shadow-sm animate-pulse">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 border border-blue-300">
            <ShoppingBag className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-extrabold text-blue-800 text-sm">
              🔔 {counts.pending} New Order{counts.pending !== 1 ? "s" : ""} Waiting for Your Response!
            </p>
            <p className="text-xs text-blue-600 font-semibold mt-0.5">
              Chemist{counts.pending !== 1 ? "s" : ""} placed B2B order{counts.pending !== 1 ? "s" : ""}. Accept to generate OTP delivery code.
            </p>
          </div>
          <button
            onClick={() => { setStatusFilter("pending"); fetchOrders(true); }}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white transition-colors shadow-sm"
          >
            <AlertCircle className="h-3.5 w-3.5" /> View Pending
          </button>
        </div>
      )}

      {/* Tabs and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit flex-wrap">
          {[
            { key: "all", label: "All", count: counts.all, bg: "bg-slate-200 text-slate-700" },
            { key: "pending", label: "Pending Review", count: counts.pending, bg: "bg-blue-100 text-blue-700" },
            { key: "otp_sent", label: "OTP Sent / Out", count: counts.otp_sent, bg: "bg-amber-100 text-amber-800" },
            { key: "delivered", label: "Delivered", count: counts.delivered, bg: "bg-emerald-100 text-emerald-800" },
            { key: "cancelled", label: "Cancelled", count: counts.cancelled, bg: "bg-red-100 text-red-800" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as FilterStatus)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                statusFilter === tab.key
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

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order no, chemist, or medicine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20"
          />
        </div>
      </div>

      {/* Orders Grid/List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-48 skeleton rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                      {order.orderNo}
                    </span>
                    {getStatusBadge(order.status)}
                    <span className="text-xs text-slate-400">
                      Placed on {formatDate(order.orderDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-med-navy">{order.chemistTenant.name}</span>
                    {order.chemistTenant.phone && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {order.chemistTenant.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Order Value</div>
                    <div className="text-lg font-black text-med-navy">
                      {formatCurrency(order.totalPaisa)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Medicine Items Table */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-2.5">Medicine Name</th>
                        <th className="px-4 py-2.5 text-right">Quantity</th>
                        <th className="px-4 py-2.5 text-right">Estimated Rate</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {order.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-2.5 font-semibold text-slate-700">{item.medicineName}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-600">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-600">
                            {item.ratePaisa > 0 ? formatCurrency(item.ratePaisa) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-700">
                            {item.totalPaisa > 0 ? formatCurrency(item.totalPaisa) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {order.notes && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 block mb-0.5">Notes:</span>
                    {order.notes}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              {["pending", "otp_sent"].includes(order.status) && (
                <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-400">
                    {order.status === "pending"
                      ? "Awaiting your acceptance to generate delivery OTP."
                      : "Awaiting OTP code verification to complete B2B delivery."}
                  </div>

                  <div className="flex items-center gap-2">
                    {order.status === "pending" ? (
                      <>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setRejectReason("");
                            setShowRejectModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject Order
                        </button>
                        <button
                          onClick={() => handleAccept(order.id)}
                          disabled={actionLoading === order.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-med-green px-4 py-2 text-xs font-bold text-white hover:bg-med-greenDark transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {actionLoading === order.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Accept & Send OTP
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setRejectReason("");
                            setShowRejectModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                          Cancel Order
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setOtpCode("");
                            setShowOtpModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 transition-colors shadow-sm"
                        >
                          <Key className="h-3.5 w-3.5" /> Verify OTP & Deliver
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredOrders.length === 0 && (
            <div className="glass-card flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-200 rounded-2xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h3 className="font-display text-lg font-bold text-med-navy">No Orders Found</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                There are no incoming B2B orders matching the selected filter.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden transform transition-all duration-300">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <div className="h-10 w-10 bg-red-50 rounded-lg flex items-center justify-center border border-red-100">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-med-navy">Reject Order</h3>
                  <p className="text-xs text-slate-400">Order {selectedOrder.orderNo}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Reason for rejection (optional)</label>
                <textarea
                  placeholder="e.g. Stock unavailable, delivery routes full, out of service zone..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full min-h-[100px] text-sm p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedOrder(null);
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading === selectedOrder.id}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTP Delivery Verification Modal */}
      {showOtpModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full border border-slate-100 overflow-hidden transform transition-all duration-300">
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 text-amber-500">
                <div className="h-10 w-10 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-100">
                  <Key className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-med-navy">Verify Delivery OTP</h3>
                  <p className="text-xs text-slate-400">Order {selectedOrder.orderNo}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                Enter the 6-digit verification code provided by <strong>{selectedOrder.chemistTenant.name}</strong>. Verification completes the order and automatically syncs their purchase records.
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block text-center">6-Digit Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="0 0 0 0 0 0"
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setOtpCode(val);
                  }}
                  className="w-full text-center text-2xl font-mono font-black tracking-[0.4em] p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowOtpModal(false);
                    setSelectedOrder(null);
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelivery}
                  disabled={actionLoading === selectedOrder.id || otpCode.length !== 6}
                  className="rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-sm flex items-center gap-1"
                >
                  {actionLoading === selectedOrder.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Verify & Deliver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
