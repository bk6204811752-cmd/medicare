"use client";

import React, { useState, useTransition } from "react";
import { 
  Users, MapPin, Search, CreditCard, ShieldCheck, CheckCircle2, 
  AlertCircle, Plus, X, UserCheck, Shield, HelpCircle, ArrowRight,
  TrendingUp, BarChart3, Clock, Scale, Package, Receipt, ChevronDown, ChevronRight
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { updatePartyAction, createPartyAction } from "@/app/stockist-actions";

type RouteItem = {
  id: string;
  name: string;
};

type PartyItem = {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  drugLicenseNo: string | null;
  creditLimitPaisa: number;
  outstandingPaisa: number;
  routeId: string | null;
  route?: RouteItem | null;
};

interface PartiesClientDashboardProps {
  initialParties: PartyItem[];
  routes: RouteItem[];
}

type LedgerRow = {
  id: string;
  date: string;
  type: "invoice" | "receipt";
  refNo: string;
  description: string;
  debitPaisa: number;
  creditPaisa: number;
  paidPaisa: number;
  paymentMode: string;
  notes?: string;
  items: { name: string; qty: number; free: number; rate: number; total: number; batchNo?: string; hsnCode?: string; mrpPaisa?: number; expiryDate?: string; manufacturer?: string; packSize?: string; mfgDate?: string | null }[];
  runningOutstanding: number;
  status?: string;
};

export function PartiesClientDashboard({ initialParties, routes }: PartiesClientDashboardProps) {
  const [search, setSearch] = useState("");
  const [selectedParty, setSelectedParty] = useState<PartyItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Verification Checklist State
  const [dlVerified, setDlVerified] = useState(true);
  const [gstVerified, setGstVerified] = useState(true);
  const [routeVerified, setRouteVerified] = useState(true);

  // Tabs: credit, orders, payments, ledger
  const [activeTab, setActiveTab] = useState<"credit" | "orders" | "payments" | "ledger">("credit");
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Expanded order state (for accordion)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const filteredParties = initialParties.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.phone || "").toLowerCase().includes(q) ||
      (p.route?.name || "").toLowerCase().includes(q)
    );
  });

  const selectPartyForAudit = (party: PartyItem) => {
    setSelectedParty(party);
    setDlVerified(!!party.drugLicenseNo);
    setGstVerified(!!party.gstin);
    setRouteVerified(!!party.routeId);
    setActiveTab("credit");
    setLedger([]);
    setLedgerLoading(true);
    setExpandedOrderId(null);

    fetch(`/api/stockist/parties/ledger?partyId=${party.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ledger) setLedger(data.ledger);
      })
      .catch((err) => console.error("Failed to load chemist ledger:", err))
      .finally(() => setLedgerLoading(false));
  };

  // Derived data
  const invoiceRows = ledger.filter((r) => r.type === "invoice");
  const receiptRows = ledger.filter((r) => r.type === "receipt");

  if (selectedParty) {
    return (
      <div className="space-y-4 animate-fade-in w-full">
        {/* Premium Back Navigation Bar */}
        <div className="flex items-center justify-between gap-4 bg-white border border-slate-100 p-3 rounded-2xl shadow-2xs">
          <button
            onClick={() => setSelectedParty(null)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-black text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-100/50 shadow-sm cursor-pointer"
          >
            ← Back to Chemists Directory
          </button>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Audit Mode</span>
            <p className="text-xs font-bold text-slate-705">{selectedParty.name}</p>
          </div>
        </div>

        {/* ─── CHEMIST FULL PROFILE PANEL ─── */}
        <div className="glass-card overflow-hidden flex flex-col min-h-[600px] w-full bg-white border border-slate-100 rounded-2xl shadow-sm">
          {/* Panel Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-emerald-50/30 border-b border-slate-100 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-base font-black text-slate-800 leading-tight truncate">{selectedParty.name}</h3>
                {selectedParty.outstandingPaisa === 0 && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    <CheckCircle2 className="h-3 w-3" /> Fully Settled
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-450 font-semibold mt-0.5 truncate">
                {selectedParty.phone || "No phone"} • {selectedParty.address || "No address"}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  GST: {selectedParty.gstin || "URP"}
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  DL: {selectedParty.drugLicenseNo || "N/A"}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${selectedParty.outstandingPaisa > 0 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-emerald-700 bg-emerald-50 border-emerald-200"}`}>
                  Due: {formatCurrency(selectedParty.outstandingPaisa)}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setSelectedParty(null)} 
              className="rounded-lg p-2 hover:bg-slate-200 transition-colors text-slate-500 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-100 bg-slate-50/70 px-2 pt-2 gap-1 overflow-x-auto">
            {[
              { key: "credit", label: "⚙️ Credit", icon: ShieldCheck },
              { key: "orders", label: "📦 Order Details", icon: Package },
              { key: "payments", label: "💳 Payments", icon: Receipt },
              { key: "ledger", label: "📋 Ledger (Khata)", icon: Scale },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all outline-none whitespace-nowrap border-b-2 ${
                  activeTab === tab.key
                    ? "bg-white text-emerald-700 border-b-2 border-emerald-500 shadow-sm"
                    : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-white/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* ── TAB: Credit Decisions ── */}
            {activeTab === "credit" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-150 p-4 flex flex-col justify-between h-24 bg-white shadow-xs">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Current Outstanding</span>
                    <span className="text-xl font-black text-slate-800 mt-1">{formatCurrency(selectedParty.outstandingPaisa)}</span>
                    <span className="text-[9px] text-slate-455 font-bold flex items-center gap-0.5 mt-0.5">
                      <Clock className="h-3 w-3" /> Reconciled B2B ledger
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-150 p-4 flex flex-col justify-between h-24 bg-white shadow-xs">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Credit Limit</span>
                    <span className="text-xl font-black text-slate-800 mt-1">
                      {selectedParty.creditLimitPaisa > 0 ? formatCurrency(selectedParty.creditLimitPaisa) : "Unlimited"}
                    </span>
                    <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
                      <ShieldCheck className="h-3 w-3" /> Block boundary enabled
                    </span>
                  </div>
                </div>

                {selectedParty.creditLimitPaisa > 0 && (() => {
                  const pct = Math.round((selectedParty.outstandingPaisa / selectedParty.creditLimitPaisa) * 100);
                  const isBlocked = selectedParty.outstandingPaisa >= selectedParty.creditLimitPaisa;
                  const isNear = pct >= 80;
                  return (
                    <div className="rounded-xl border border-slate-150 p-4 bg-white space-y-2.5 shadow-xs">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-450 uppercase tracking-wide">Ledger Utilisation Gauge</span>
                        <span className={isBlocked ? "text-red-600" : isNear ? "text-orange-600" : "text-emerald-650"}>{pct}% used</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${isBlocked ? "bg-red-500" : isNear ? "bg-orange-500" : "bg-emerald-500"}`} 
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-450 font-semibold leading-relaxed">
                        {isBlocked 
                          ? "❌ CREDIT BLOCK: Wholesale direct-billing POS is strictly blocked for this chemist." 
                          : isNear 
                          ? "⚠️ HIGH RISK ALERT: Chemist is approaching credit boundary. Collect outstanding before new sales." 
                          : "✅ SECURE BOUNDARY: Chemist is within safe credit limits. POS billing will work normally."}
                      </p>
                    </div>
                  );
                })()}

                {/* Checklist */}
                <div className="space-y-3 rounded-xl border border-slate-150 p-4 bg-white shadow-xs">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">🔐 B2B Credit Verification Checklist</h4>
                  {[
                    { key: "dl", label: "Drug License (DL) Validated", desc: "Verify DL is unexpired before selling Schedule drugs", checked: dlVerified, toggle: () => setDlVerified(!dlVerified) },
                    { key: "gst", label: "GSTIN Registration Active", desc: "Required for wholesale input tax credits (ITC) mapping", checked: gstVerified, toggle: () => setGstVerified(!gstVerified) },
                    { key: "route", label: "Beat / Route Configured", desc: "Chemist is mapped to active salesman delivery beat", checked: routeVerified, toggle: () => setRouteVerified(!routeVerified) },
                  ].map((item) => (
                    <button key={item.key} type="button" onClick={item.toggle}
                      className="flex w-full items-center justify-between p-2.5 rounded-lg border border-slate-150 hover:bg-slate-50 transition-colors text-left font-semibold outline-none">
                      <div className="flex items-center gap-2">
                        <div className={`h-4 w-4 rounded-full flex items-center justify-center border ${item.checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-350 bg-white"}`}>
                          {item.checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{item.label}</p>
                          <p className="text-[9px] text-slate-455 font-semibold">{item.desc}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${item.checked ? "text-emerald-700 bg-emerald-50" : "text-slate-500 bg-slate-100"}`}>
                        {item.checked ? "Verified" : "Pending"}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Edit Form */}
                <form 
                  action={(formData) => {
                    startTransition(async () => {
                      await updatePartyAction(formData);
                      setSelectedParty(null);
                    });
                  }}
                  className="space-y-4 pt-4 border-t border-slate-100"
                >
                  <input type="hidden" name="id" value={selectedParty.id} />
                  <h4 className="text-xs font-extrabold text-slate-455 uppercase tracking-wider">📝 Adjust Credit Metrics & Routing</h4>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-500">Party / Chemist Name *</span>
                    <input name="name" required defaultValue={selectedParty.name} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold text-slate-700" />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Phone *</span>
                      <input name="phone" required defaultValue={selectedParty.phone || ""} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors text-slate-700" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Email</span>
                      <input name="email" type="email" defaultValue={selectedParty.email || ""} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors text-slate-700" />
                    </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-500">Shop Address</span>
                    <input name="address" defaultValue={selectedParty.address || ""} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors text-slate-700" />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-slate-500">GSTIN No.</span>
                      <input name="gstin" defaultValue={selectedParty.gstin || ""} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-mono text-slate-700" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Drug License (DL) No.</span>
                      <input name="drugLicenseNo" defaultValue={selectedParty.drugLicenseNo || ""} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-mono text-slate-700" />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Credit Limit (₹)</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                        <input name="creditLimit" type="number" min="0" defaultValue={Math.round(selectedParty.creditLimitPaisa / 100)} className="h-10 w-full rounded-lg border border-slate-300 pl-7 pr-3 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold text-slate-700" />
                      </div>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Outstanding Balance (₹)</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                        <input name="outstanding" type="number" min="0" defaultValue={Math.round(selectedParty.outstandingPaisa / 100)} className="h-10 w-full rounded-lg border border-slate-300 pl-7 pr-3 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold text-slate-700" />
                      </div>
                    </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-500">Beat / Route Assignment</span>
                    <select name="routeId" defaultValue={selectedParty.routeId || ""} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors bg-white text-slate-700 font-semibold">
                      <option value="">Select a Beat/Route</option>
                      {routes.map((route) => (
                        <option key={route.id} value={route.id}>{route.name}</option>
                      ))}
                    </select>
                  </label>

                  <button type="submit" disabled={isPending}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-med-green font-semibold text-white shadow-sm hover:bg-med-greenDark active:scale-95 transition-all text-sm disabled:opacity-50">
                    {isPending ? "Applying changes..." : <><UserCheck className="h-4.5 w-4.5" /> Apply Credit Decision</>}
                  </button>
                </form>
              </div>
            )}

            {/* ── TAB: Order Details ── */}
            {activeTab === "orders" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-emerald-600" /> Purchase Order History — Full Medicine Details
                  </h4>
                  <span className="text-[10px] font-extrabold text-slate-505 bg-slate-100 px-2 py-0.5 rounded">{invoiceRows.length} orders</span>
                </div>

                {ledgerLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                    <Scale className="h-8 w-8 text-emerald-600 animate-spin" />
                    <p className="text-xs text-slate-455 font-bold">Loading order history...</p>
                  </div>
                ) : invoiceRows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 bg-slate-50/50">
                    No B2B purchase orders found for this chemist. Start billing from B2B POS & Invoice to see orders here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoiceRows.map((row) => {
                      const isExpanded = expandedOrderId === row.id;
                      const isFullyPaid = row.debitPaisa > 0 && row.paidPaisa >= row.debitPaisa;
                      const isPartial = row.paidPaisa > 0 && row.paidPaisa < row.debitPaisa;

                      return (
                        <div key={row.id} className="rounded-xl border border-slate-100 bg-white shadow-xs overflow-hidden">
                          {/* Order Header */}
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(isExpanded ? null : row.id)}
                            className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="shrink-0">
                                {isFullyPaid ? (
                                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 border border-emerald-200">
                                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                                  </span>
                                ) : isPartial ? (
                                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 border border-orange-200">
                                    <CreditCard className="h-4.5 w-4.5 text-orange-600" />
                                  </span>
                                ) : (
                                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 border border-red-200">
                                    <AlertCircle className="h-4.5 w-4.5 text-red-600" />
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-sm font-mono">{row.refNo}</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                  {new Date(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} • {row.items.length} medicines
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <p className="font-mono font-black text-slate-800 text-sm">{formatCurrency(row.debitPaisa)}</p>
                                <p className={`text-[10px] font-bold mt-0.5 ${isFullyPaid ? "text-emerald-600" : isPartial ? "text-orange-600" : "text-red-600"}`}>
                                  {isFullyPaid ? "✅ Paid" : isPartial ? `Paid: ${formatCurrency(row.paidPaisa)}` : "⏳ Unpaid"}
                                </p>
                              </div>
                              {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                            </div>
                          </button>

                          {/* Order Items — Expanded */}
                          {isExpanded && (
                            <div className="border-t border-slate-100">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[10px] border-collapse min-w-[600px]">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 uppercase tracking-wider text-[9px]">
                                      <th className="px-3 py-2">Medicine Name</th>
                                      <th className="px-3 py-2">Batch No.</th>
                                      <th className="px-3 py-2">HSN</th>
                                      <th className="px-3 py-2">Manufacturer</th>
                                      <th className="px-3 py-2">Mfg Date</th>
                                      <th className="px-3 py-2">Expiry</th>
                                      <th className="px-3 py-2">Pack</th>
                                      <th className="px-3 py-2 text-right">Qty</th>
                                      <th className="px-3 py-2 text-right">Rate</th>
                                      <th className="px-3 py-2 text-right">MRP</th>
                                      <th className="px-3 py-2 text-right">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {row.items.length > 0 ? row.items.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50/30">
                                        <td className="px-3 py-2.5 font-semibold text-slate-800">{item.name}</td>
                                        <td className="px-3 py-2.5 font-mono text-slate-600 bg-slate-50/50">
                                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-bold">{item.batchNo || "—"}</span>
                                        </td>
                                        <td className="px-3 py-2.5 font-mono text-slate-505">{item.hsnCode || "—"}</td>
                                        <td className="px-3 py-2.5 text-slate-505 max-w-[100px]">
                                          <span className="truncate block">{item.manufacturer || "—"}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-slate-505">{item.mfgDate || "—"}</td>
                                        <td className="px-3 py-2.5 text-slate-505">{item.expiryDate || "—"}</td>
                                        <td className="px-3 py-2.5 text-slate-505">{item.packSize || "—"}</td>
                                        <td className="px-3 py-2.5 text-right font-bold text-slate-700">
                                          {item.qty}{item.free > 0 ? <span className="text-emerald-600">+{item.free}</span> : ""}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-700">{formatCurrency(item.rate)}</td>
                                        <td className="px-3 py-2.5 text-right font-mono text-slate-505">{item.mrpPaisa ? formatCurrency(item.mrpPaisa) : "—"}</td>
                                        <td className="px-3 py-2.5 text-right font-mono font-black text-slate-800">{formatCurrency(item.total)}</td>
                                      </tr>
                                    )) : (
                                      <tr>
                                        <td colSpan={11} className="px-3 py-4 text-center text-slate-400">
                                          No medicine details available for this order.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                                      <td colSpan={10} className="px-3 py-2 text-right text-[10px] font-extrabold text-slate-500 uppercase">Invoice Total</td>
                                      <td className="px-3 py-2 text-right font-mono font-black text-emerald-700 text-sm">{formatCurrency(row.debitPaisa)}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: Payment Details ── */}
            {activeTab === "payments" && (
              <div className="space-y-4">
                {/* Payment Summary Header */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white border border-slate-100 shadow-xs p-3 text-center">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Invoiced</p>
                    <p className="text-lg font-black text-slate-800 mt-1">{formatCurrency(ledger.reduce((s, r) => s + r.debitPaisa, 0))}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-100 shadow-xs p-3 text-center">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Paid</p>
                    <p className="text-lg font-black text-emerald-600 mt-1">{formatCurrency(ledger.reduce((s, r) => s + r.creditPaisa, 0))}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-100 shadow-xs p-3 text-center">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Outstanding</p>
                    <p className={`text-lg font-black mt-1 ${selectedParty.outstandingPaisa > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatCurrency(selectedParty.outstandingPaisa)}
                    </p>
                  </div>
                </div>

                {/* Invoice-wise Payment Status */}
                <div>
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-emerald-600" /> Invoice-wise Payment Status
                  </h4>
                  {ledgerLoading ? (
                    <div className="flex justify-center py-12">
                      <Scale className="h-8 w-8 text-emerald-600 animate-spin" />
                    </div>
                  ) : invoiceRows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 bg-slate-50/50">
                      No invoices found. Book B2B sales to see payment status here.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {invoiceRows.map((row) => {
                        const isFullyPaid = row.paidPaisa >= row.debitPaisa && row.debitPaisa > 0;
                        const isPartial = row.paidPaisa > 0 && row.paidPaisa < row.debitPaisa;
                        const dueAmount = row.debitPaisa - row.paidPaisa;

                        return (
                          <div key={row.id} className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition-all ${
                            isFullyPaid 
                              ? "border-emerald-200 bg-emerald-50/40" 
                              : isPartial 
                              ? "border-orange-200 bg-orange-50/30" 
                              : "border-red-200 bg-red-50/20"
                          }`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                                isFullyPaid ? "border-emerald-400 bg-emerald-100" : isPartial ? "border-orange-400 bg-orange-100" : "border-red-300 bg-red-50"
                              }`}>
                                {isFullyPaid 
                                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                  : isPartial 
                                  ? <CreditCard className="h-5 w-5 text-orange-600" />
                                  : <AlertCircle className="h-5 w-5 text-red-505" />
                                }
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-sm font-mono truncate">{row.refNo}</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                  {new Date(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} 
                                  {" • "}{row.paymentMode?.toUpperCase() || "CREDIT"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 space-y-1">
                              <div className="flex items-center gap-2 justify-end">
                                <span className="text-[10px] font-semibold text-slate-400">Invoice:</span>
                                <span className="font-mono font-bold text-slate-800 text-sm">{formatCurrency(row.debitPaisa)}</span>
                              </div>
                              <div className="flex items-center gap-2 justify-end">
                                <span className="text-[10px] font-semibold text-slate-400">Paid:</span>
                                <span className="font-mono font-bold text-emerald-600 text-sm">{formatCurrency(row.paidPaisa)}</span>
                              </div>
                              {!isFullyPaid && (
                                <div className="flex items-center gap-2 justify-end">
                                  <span className="text-[10px] font-semibold text-slate-400">Balance:</span>
                                  <span className="font-mono font-bold text-red-600 text-sm">{formatCurrency(dueAmount)}</span>
                                </div>
                              )}
                              <div>
                                {isFullyPaid ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="h-3 w-3" /> Full Payment Done
                                  </span>
                                ) : isPartial ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-orange-700 bg-orange-100 border border-orange-300 px-2 py-0.5 rounded-full">
                                    ⚡ Partial Payment
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full">
                                    ⏳ Awaiting Payment
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB: Ledger (Khata) ── */}
            {activeTab === "ledger" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="h-4 w-4 text-emerald-600" /> Double-Entry Reconciled Statement
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 shadow-2xs"
                  >
                    Print Statement
                  </button>
                </div>

                {ledgerLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                    <Scale className="h-8 w-8 text-emerald-600 animate-spin" />
                    <p className="text-xs text-slate-455 font-bold">Compiling ledger statement...</p>
                  </div>
                ) : ledger.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 bg-slate-50/50">
                    No invoices or payments registered. B2B billing will compile this ledger automatically.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-150 shadow-xs bg-white max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 font-bold text-slate-500 uppercase text-[9px] tracking-wider sticky top-0 z-10">
                          <th className="px-3 py-2 bg-slate-50">Date / Ref</th>
                          <th className="px-3 py-2 bg-slate-50">Particulars</th>
                          <th className="px-3 py-2 text-right bg-slate-50">Debit (Dr)</th>
                          <th className="px-3 py-2 text-right bg-slate-50">Credit (Cr)</th>
                          <th className="px-3 py-2 text-right bg-slate-50">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {ledger.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 py-2.5">
                              <p className="font-bold text-slate-800 text-[10px]">
                                {new Date(row.date).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                              <p className="font-mono text-[9px] text-slate-450 mt-0.5">{row.refNo}</p>
                            </td>
                            <td className="px-3 py-2.5 max-w-[200px] break-words">
                              <p className="text-slate-800 font-extrabold text-[10.5px] leading-tight">{row.description}</p>
                              {row.items && row.items.length > 0 && (
                                <div className="mt-1.5 space-y-0.5 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[9px] text-slate-500 font-semibold shadow-2xs">
                                  {row.items.slice(0, 3).map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center gap-2">
                                      <span className="truncate text-slate-600">{item.name}</span>
                                      <span className="shrink-0 font-mono font-bold text-slate-705 bg-white border border-slate-200 px-1 py-0.2 rounded">
                                        Qty: {item.qty}{item.free > 0 ? `+${item.free}` : ""}
                                      </span>
                                    </div>
                                  ))}
                                  {row.items.length > 3 && (
                                    <p className="text-[8px] text-slate-400 font-semibold">+{row.items.length - 3} more medicines...</p>
                                  )}
                                </div>
                              )}
                              {row.notes && (
                                <p className="text-[9px] text-slate-450 italic mt-1">Note: {row.notes}</p>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-707 text-[10.5px]">
                              {row.debitPaisa > 0 ? formatCurrency(row.debitPaisa) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-650 text-[10.5px]">
                              {row.creditPaisa > 0 ? formatCurrency(row.creditPaisa) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900 text-[10.5px]">
                              {formatCurrency(row.runningOutstanding)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!ledgerLoading && ledger.length > 0 && (
                  <div className="rounded-xl bg-slate-50 border border-slate-150 p-4 space-y-1.5 shadow-2xs">
                    <div className="flex justify-between text-xs font-bold text-slate-505">
                      <span>Total Invoiced (Debits)</span>
                      <span className="text-slate-800">{formatCurrency(ledger.reduce((sum, r) => sum + r.debitPaisa, 0))}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-505">
                      <span>Total Payments (Credits)</span>
                      <span className="text-emerald-650">{formatCurrency(ledger.reduce((sum, r) => sum + r.creditPaisa, 0))}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black text-slate-808 border-t border-slate-200 pt-2 mt-1">
                      <span>Reconciled Outstanding Due</span>
                      <span className={`text-sm ${selectedParty.outstandingPaisa > 0 ? "text-red-600" : "text-emerald-650"}`}>
                        {formatCurrency(selectedParty.outstandingPaisa)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 🔒 Isolated B2B Ledger Alert Card */}
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/50 via-indigo-50/20 to-transparent p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
            <Shield className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
              Isolated B2B Multi-Tenant Ledger System
              <span className="inline-block bg-sky-100 text-sky-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">🔒 Secured</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-4xl">
              Your chemists ledger, credit limits, and outstanding balances are 100% private to your stockist account. Click any chemist row to view their full profile, order history, and payment status.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search chemist, route, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full pl-10 pr-4 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 shrink-0 self-start sm:self-auto">
            {filteredParties.length} chemists listed
          </span>
        </div>
      </div>

      {/* Main content grid: list + register form side by side */}
      <div className="grid gap-6 min-w-0 w-full lg:grid-cols-[minmax(0,1fr)_360px]">

        {/* Parties List Table */}
        <div className="glass-card p-3 sm:p-4 sm:p-5 min-w-0 w-full overflow-hidden">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="font-display text-sm sm:text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-med-green" /> Chemists ({filteredParties.length})
            </h2>
            <p className="text-xs text-slate-400 font-medium italic hidden sm:block">💡 Click any row to view profile & history</p>
          </div>

          {filteredParties.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
              No matching chemist parties found. Search again or register in the sidebar.
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-2">
                {filteredParties.map((party) => {
                  const outstandingPct = party.creditLimitPaisa > 0 ? (party.outstandingPaisa / party.creditLimitPaisa) * 100 : 0;
                  const limitBlocked = party.creditLimitPaisa > 0 && party.outstandingPaisa >= party.creditLimitPaisa;
                  const nearLimit = outstandingPct >= 80;

                  return (
                    <div
                      key={party.id}
                      onClick={() => selectPartyForAudit(party)}
                      className="rounded-xl border border-slate-100 bg-white p-3.5 cursor-pointer hover:border-emerald-200 hover:bg-emerald-50/20 transition-all shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 text-sm leading-tight">{party.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{party.phone || "No contact"}</p>
                        </div>
                        {limitBlocked ? (
                          <span className="text-[9px] font-extrabold uppercase tracking-wide text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full shrink-0">
                            Blocked
                          </span>
                        ) : nearLimit ? (
                          <span className="text-[9px] font-extrabold uppercase tracking-wide text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full shrink-0">
                            Near Limit
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold uppercase tracking-wide text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {party.route && (
                            <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5 shrink-0" /> {party.route.name}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-500">{party.gstin ? `GST: ${party.gstin.slice(0, 8)}...` : "URP"}</span>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono font-black text-sm ${party.outstandingPaisa > 0 ? (limitBlocked ? "text-red-600" : (nearLimit ? "text-orange-600" : "text-slate-800")) : "text-slate-400"}`}>
                            {formatCurrency(party.outstandingPaisa)}
                          </p>
                          <p className="text-[9px] text-slate-400">outstanding</p>
                        </div>
                      </div>
                      {party.creditLimitPaisa > 0 && (
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${limitBlocked ? "bg-red-500" : (nearLimit ? "bg-orange-400" : "bg-emerald-500")}`}
                            style={{ width: `${Math.min(outstandingPct, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
                <table className="w-full text-left text-sm border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 font-display font-bold text-slate-505 uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Chemist Party</th>
                      <th className="px-4 py-3">Beat / Route</th>
                      <th className="px-4 py-3">GSTIN / DL No.</th>
                      <th className="px-4 py-3 text-right">Credit Limit</th>
                      <th className="px-4 py-3 text-right">Outstanding</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredParties.map((party) => {
                      const outstandingPct = party.creditLimitPaisa > 0 ? (party.outstandingPaisa / party.creditLimitPaisa) * 100 : 0;
                      const limitBlocked = party.creditLimitPaisa > 0 && party.outstandingPaisa >= party.creditLimitPaisa;
                      const nearLimit = outstandingPct >= 80;

                      return (
                        <tr 
                          key={party.id} 
                          onClick={() => selectPartyForAudit(party)}
                          className="hover:bg-emerald-50/20 cursor-pointer transition-colors group"
                        >
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-med-navy text-sm sm:text-base leading-snug group-hover:text-emerald-700 transition-colors">
                              {party.name}
                            </p>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                              {party.phone || "No contact"} • {party.email || "No email"}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 font-medium">
                            {party.route ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded-md border border-sky-100/50">
                                <MapPin className="h-3 w-3 shrink-0" /> {party.route.name}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Not Assigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-xs font-bold text-slate-700 font-mono">GST: {party.gstin || "URP"}</p>
                            <p className="text-[10px] font-bold text-slate-505 mt-0.5">DL: {party.drugLicenseNo || "N/A"}</p>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-700">
                            {party.creditLimitPaisa > 0 ? formatCurrency(party.creditLimitPaisa) : "No Limit"}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <p className={`font-mono font-bold ${party.outstandingPaisa > 0 ? (limitBlocked ? "text-red-600" : (nearLimit ? "text-orange-600" : "text-med-navy")) : "text-slate-400"}`}>
                              {formatCurrency(party.outstandingPaisa)}
                            </p>
                            {party.creditLimitPaisa > 0 && (
                              <div className="w-20 ml-auto mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${limitBlocked ? "bg-red-500" : (nearLimit ? "bg-orange-400" : "bg-emerald-500")}`}
                                  style={{ width: `${Math.min(outstandingPct, 100)}%` }}
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {limitBlocked ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                                <AlertCircle className="h-3 w-3" /> Blocked
                              </span>
                            ) : nearLimit ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                                <AlertCircle className="h-3 w-3" /> Near Limit
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-3 w-3" /> Active
                              </span>
                            )}
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

        {/* Register New Chemist */}
        <div className="glass-card p-4 sm:p-5 h-fit">
          <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-med-green" /> Register New Chemist
          </h2>

          <form action={createPartyAction} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Party / Chemist Name *</span>
              <input name="name" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold" placeholder="e.g. Sharma Medical Hall" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Phone *</span>
                <input name="phone" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="Contact number" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Email</span>
                <input name="email" type="email" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="Email address" />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Shop Address</span>
              <input name="address" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="Shop location address" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-505">GSTIN No.</span>
                <input name="gstin" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-mono" placeholder="15-digit GSTIN" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-505">Drug License (DL) No.</span>
                <input name="drugLicenseNo" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-mono" placeholder="DL Number" />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Credit Limit (₹)</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input name="creditLimit" type="number" min="0" defaultValue="" className="h-10 w-full rounded-lg border border-slate-300 pl-7 pr-3 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold" placeholder="e.g. 50000" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Blocks B2B billing if outstanding exceeds this limit. Set 0 or leave empty for unlimited.</p>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Beat / Route Assignment</span>
              <select name="routeId" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors bg-white font-semibold">
                <option value="">Select a Beat/Route</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>{route.name}</option>
                ))}
              </select>
            </label>

            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-med-green font-semibold text-white shadow-sm hover:bg-med-greenDark active:scale-95 transition-all mt-6 text-sm">
              <UserCheck className="h-4.5 w-4.5" /> Save Retailer Party
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
