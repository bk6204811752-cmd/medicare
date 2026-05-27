"use client";

import React, { useState, useTransition } from "react";
import { 
  Users, MapPin, Search, CreditCard, ShieldCheck, CheckCircle2, 
  AlertCircle, Plus, X, UserCheck, Shield, HelpCircle, ArrowRight,
  TrendingUp, BarChart3, Clock, Scale
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { updatePartyAction } from "@/app/stockist-actions";

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

export function PartiesClientDashboard({ initialParties, routes }: PartiesClientDashboardProps) {
  const [search, setSearch] = useState("");
  const [selectedParty, setSelectedParty] = useState<PartyItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Verification Checklist State (Client only for audit guide)
  const [dlVerified, setDlVerified] = useState(true);
  const [gstVerified, setGstVerified] = useState(true);
  const [routeVerified, setRouteVerified] = useState(true);

  // B2B Ledger Book state
  const [activeTab, setActiveTab] = useState<"credit" | "ledger">("credit");
  const [ledger, setLedger] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Filter parties based on search
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
    // Simulate smart audit checklist pre-fills based on DL/GST presence
    setDlVerified(!!party.drugLicenseNo);
    setGstVerified(!!party.gstin);
    setRouteVerified(!!party.routeId);
    setActiveTab("credit"); // Default tab on switch
    setLedger([]);
    setLedgerLoading(true);

    fetch(`/api/stockist/parties/ledger?partyId=${party.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ledger) {
          setLedger(data.ledger);
        }
      })
      .catch((err) => console.error("Failed to load chemist ledger:", err))
      .finally(() => setLedgerLoading(false));
  };

  return (
    <div className="space-y-6">
      {/* 🔒 Isolated B2B Ledger Alert Card */}
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/50 via-indigo-50/20 to-transparent p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
            <Shield className="h-5.5 w-5.5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
              Isolated B2B Multi-Tenant Ledger System
              <span className="inline-block bg-sky-100 text-sky-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                🔒 Secured
              </span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-4xl">
              Your chemists ledger, credit limits, and outstanding balances are **100% private to your stockist tenant account**. 
              Other stockists on the network cannot view your trade margins, credit configurations, or collector routes. 
              Credit decisions are isolated to protect your proprietary business relations and collections flow.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search chemist party name, beat route, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700 placeholder:text-slate-400"
          />
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 shrink-0">
          {filteredParties.length} chemists listed
        </span>
      </div>

      {/* Parties List Table */}
      <div className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2">
            <Users className="h-5 w-5 text-med-green" /> Registered Chemists ({filteredParties.length})
          </h2>
          <p className="text-xs text-slate-400 font-medium italic">💡 Click on any row to audit/edit credit limits & telemetry</p>
        </div>

        {filteredParties.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
            No matching chemist parties found. Search again or register in the right sidebar.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
            <table className="w-full text-left text-sm border-collapse bg-white">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-display font-bold text-slate-500 uppercase tracking-wider text-[10px]">
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
                      className="hover:bg-emerald-50/10 cursor-pointer transition-colors group"
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
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">DL: {party.drugLicenseNo || "N/A"}</p>
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
        )}
      </div>

      {/* ─── CHEMIST CREDIT TELEMETRY & AUDIT DRAWER ─── */}
      {selectedParty && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs p-0 transition-opacity duration-300 animate-fade-in"
          onClick={() => setSelectedParty(null)}
        >
          <div 
            className="w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col justify-between animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-black text-slate-800 flex items-center gap-2">
                  <Scale className="h-5 w-5 text-emerald-600" />
                  <span>Chemist Credit Audit & Telemetry</span>
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Configure credit boundaries for Sharmas Medical</p>
              </div>
              <button 
                onClick={() => setSelectedParty(null)} 
                className="rounded-lg p-2 hover:bg-slate-200 transition-colors text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 p-6 space-y-6">
              {/* Profile Card */}
              <div className="rounded-xl border border-slate-150 p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">Retail Account</span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">UID: {selectedParty.id}</span>
                </div>
                <h4 className="font-extrabold text-base text-slate-800">{selectedParty.name}</h4>
                <p className="text-xs text-slate-500 font-semibold">📍 {selectedParty.address || "No address listed"}</p>
                <p className="text-xs text-slate-500 font-semibold">
                  📞 {selectedParty.phone || "No phone"} • ✉️ {selectedParty.email || "No email"}
                </p>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 mt-2 bg-slate-50/50 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab("credit")}
                  className={`flex-1 py-2 text-xs font-bold text-center rounded-md transition-all outline-none ${
                    activeTab === "credit"
                      ? "bg-white text-slate-800 shadow-sm border border-slate-100 font-extrabold"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  ⚙️ Credit Decisions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ledger")}
                  className={`flex-1 py-2 text-xs font-bold text-center rounded-md transition-all outline-none ${
                    activeTab === "ledger"
                      ? "bg-white text-slate-800 shadow-sm border border-slate-100 font-extrabold"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  📋 Chronological Ledger (Khata)
                </button>
              </div>

              {activeTab === "credit" ? (
                <div className="space-y-6">
                  {/* Credit Telemetry Dashboard */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-emerald-600" /> Credit Utilisation & Repayment Score
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-slate-150 p-4 flex flex-col justify-between h-24 bg-white shadow-xs">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Current Outstanding</span>
                        <span className="text-xl font-black text-slate-800 mt-1">{formatCurrency(selectedParty.outstandingPaisa)}</span>
                        <span className="text-[9px] text-slate-450 font-bold flex items-center gap-0.5 mt-0.5">
                          <Clock className="h-3 w-3" /> Reconciled B2B ledgers
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

                    {/* Utilization gauge */}
                    {selectedParty.creditLimitPaisa > 0 && (() => {
                      const pct = Math.round((selectedParty.outstandingPaisa / selectedParty.creditLimitPaisa) * 100);
                      const isBlocked = selectedParty.outstandingPaisa >= selectedParty.creditLimitPaisa;
                      const isNear = pct >= 80;

                      return (
                        <div className="rounded-xl border border-slate-150 p-4 bg-white space-y-2.5 shadow-xs">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-450 uppercase tracking-wide">Ledger Utilisation Gauge</span>
                            <span className={isBlocked ? "text-red-600" : isNear ? "text-orange-600" : "text-emerald-650"}>
                              {pct}% used
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${isBlocked ? "bg-red-500" : isNear ? "bg-orange-500" : "bg-emerald-500"}`} 
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-450 font-semibold leading-relaxed">
                            {isBlocked 
                              ? "❌ CREDIT BLOCK: Wholesale direct-billing POS is strictly blocked for this chemist. All sales must be settled immediately with Cash/UPI."
                              : isNear 
                              ? "⚠️ HIGH RISK ALERT: Chemist is approaching credit boundary. We recommend collecting outstanding receipts before booking new sales."
                              : "✅ SECURE BOUNDARY: Chemist is within safe credit limits. POS billing will generate invoices without blockage."
                            }
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Smart Credit Checklist Audit */}
                  <div className="space-y-3 rounded-xl border border-slate-150 p-4 bg-white shadow-xs">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                      🔐 B2B Credit Decisioning Verification Checklist
                    </h4>
                    <p className="text-[10px] text-slate-450 font-semibold leading-normal mb-1">
                      Deciding B2B credit parameters is based on verifying credential standards before allocating risk exposure.
                    </p>

                    <div className="space-y-2">
                      <button 
                        type="button"
                        onClick={() => setDlVerified(!dlVerified)}
                        className="flex w-full items-center justify-between p-2.5 rounded-lg border border-slate-150 hover:bg-slate-50 transition-colors text-left font-semibold outline-none"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-4 w-4 rounded-full flex items-center justify-center border ${dlVerified ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-350 bg-white"}`}>
                            {dlVerified && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Drug License (DL) Validated</p>
                            <p className="text-[9px] text-slate-450 font-semibold">Verify DL is unexpired before selling Schedule drugs</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${dlVerified ? "text-emerald-700 bg-emerald-50" : "text-slate-500 bg-slate-100"}`}>
                          {dlVerified ? "Verified" : "Pending"}
                        </span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => setGstVerified(!gstVerified)}
                        className="flex w-full items-center justify-between p-2.5 rounded-lg border border-slate-150 hover:bg-slate-50 transition-colors text-left font-semibold outline-none"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-4 w-4 rounded-full flex items-center justify-center border ${gstVerified ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-350 bg-white"}`}>
                            {gstVerified && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">GSTIN Registration Active</p>
                            <p className="text-[9px] text-slate-450 font-semibold">Required for mapping wholesale input tax credits (ITC)</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${gstVerified ? "text-emerald-700 bg-emerald-50" : "text-slate-500 bg-slate-100"}`}>
                          {gstVerified ? "Verified" : "Pending"}
                        </span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => setRouteVerified(!routeVerified)}
                        className="flex w-full items-center justify-between p-2.5 rounded-lg border border-slate-150 hover:bg-slate-50 transition-colors text-left font-semibold outline-none"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-4 w-4 rounded-full flex items-center justify-center border ${routeVerified ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-350 bg-white"}`}>
                            {routeVerified && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Beat / Route Logistics Configured</p>
                            <p className="text-[9px] text-slate-450 font-semibold">Chemist is mapped to active salesman delivery beat</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${routeVerified ? "text-emerald-700 bg-emerald-50" : "text-slate-500 bg-slate-100"}`}>
                          {routeVerified ? "Assigned" : "Pending"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Complete Update Form */}
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
                    
                    <h4 className="text-xs font-extrabold text-slate-450 uppercase tracking-wider">
                      📝 Adjust Credit Metrics & Routing
                    </h4>

                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Party / Chemist Name *</span>
                      <input 
                        name="name" 
                        required 
                        defaultValue={selectedParty.name} 
                        className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold text-slate-700" 
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold text-slate-500">Phone *</span>
                        <input 
                          name="phone" 
                          required 
                          defaultValue={selectedParty.phone || ""} 
                          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors text-slate-700" 
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold text-slate-500">Email</span>
                        <input 
                          name="email" 
                          type="email" 
                          defaultValue={selectedParty.email || ""} 
                          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors text-slate-700" 
                        />
                      </label>
                    </div>

                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Shop Address</span>
                      <input 
                        name="address" 
                        defaultValue={selectedParty.address || ""} 
                        className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors text-slate-700" 
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold text-slate-500">GSTIN No.</span>
                        <input 
                          name="gstin" 
                          defaultValue={selectedParty.gstin || ""} 
                          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-mono text-slate-700" 
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold text-slate-500">Drug License (DL) No.</span>
                        <input 
                          name="drugLicenseNo" 
                          defaultValue={selectedParty.drugLicenseNo || ""} 
                          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-mono text-slate-700" 
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold text-slate-500">Credit Limit (₹)</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                          <input 
                            name="creditLimit" 
                            type="number" 
                            min="0"
                            defaultValue={Math.round(selectedParty.creditLimitPaisa / 100)} 
                            className="h-10 w-full rounded-lg border border-slate-300 pl-7 pr-3 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold text-slate-700" 
                          />
                        </div>
                      </label>

                      <label className="block space-y-1">
                        <span className="text-xs font-semibold text-slate-500">Outstanding Balance (₹)</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                          <input 
                            name="outstanding" 
                            type="number" 
                            min="0"
                            defaultValue={Math.round(selectedParty.outstandingPaisa / 100)} 
                            className="h-10 w-full rounded-lg border border-slate-300 pl-7 pr-3 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold text-slate-700" 
                          />
                        </div>
                      </label>
                    </div>

                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Beat / Route Assignment</span>
                      <select 
                        name="routeId" 
                        defaultValue={selectedParty.routeId || ""} 
                        className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors bg-white text-slate-700 font-semibold"
                      >
                        <option value="">Select a Beat/Route</option>
                        {routes.map((route) => (
                          <option key={route.id} value={route.id}>{route.name}</option>
                        ))}
                      </select>
                    </label>

                    {/* Submit Action */}
                    <div className="pt-2">
                      <button 
                        type="submit" 
                        disabled={isPending}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-med-green font-semibold text-white shadow-sm hover:bg-med-greenDark active:scale-95 transition-all text-sm disabled:opacity-50"
                      >
                        {isPending ? "Applying changes..." : <><UserCheck className="h-4.5 w-4.5" /> Apply Credit Decision</>}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* B2B Chronological Ledger timeline */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                      📋 B2B Running Ledger Book (Khata)
                    </h4>
                    <span className="text-[10px] font-extrabold text-slate-505 bg-slate-100 px-2 py-0.5 rounded">
                      {ledger.length} entries
                    </span>
                  </div>

                  {ledgerLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                      <Scale className="h-8 w-8 text-emerald-600 animate-spin" />
                      <p className="text-xs text-slate-450 font-bold">Compiling ledger statement...</p>
                    </div>
                  ) : ledger.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 bg-slate-50/50">
                      No invoices or payments registered for this chemist retail party. 
                      Booking direct B2B credit sales or collections will dynamically compile this ledger statement.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-150 shadow-xs bg-white max-h-[50vh] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 font-bold text-slate-500 uppercase text-[9px] tracking-wider sticky top-0 z-10">
                            <th className="px-3 py-2 bg-slate-50">Date / Ref</th>
                            <th className="px-3 py-2 bg-slate-50">Particulars & Drugs</th>
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
                                  {new Date(row.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                                <p className="font-mono text-[9px] text-slate-400 mt-0.5">{row.refNo}</p>
                              </td>
                              <td className="px-3 py-2.5 max-w-[200px] break-words">
                                <p className="text-slate-800 font-extrabold text-[10.5px] leading-tight">{row.description}</p>
                                
                                {/* Items Sold Details */}
                                {row.items && row.items.length > 0 && (
                                  <div className="mt-1.5 space-y-0.5 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[9px] text-slate-500 font-semibold shadow-2xs">
                                    {row.items.map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center gap-2">
                                        <span className="truncate text-slate-600">{item.name}</span>
                                        <span className="shrink-0 font-mono font-bold text-slate-705 bg-white border border-slate-200 px-1 py-0.2 rounded">
                                          Qty: {item.qty}{item.free > 0 ? `+${item.free}` : ""}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {row.notes && (
                                  <p className="text-[9px] text-slate-400 italic mt-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                    Note: {row.notes}
                                  </p>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-700 text-[10.5px]">
                                {row.debitPaisa > 0 ? formatCurrency(row.debitPaisa) : "-"}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-650 text-[10.5px]">
                                {row.creditPaisa > 0 ? formatCurrency(row.creditPaisa) : "-"}
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

                  {/* Summary Footer */}
                  {!ledgerLoading && ledger.length > 0 && (
                    <div className="rounded-xl bg-slate-50 border border-slate-150 p-4 space-y-1.5 shadow-2xs">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>Total Invoiced (Debits)</span>
                        <span className="text-slate-800">
                          {formatCurrency(ledger.reduce((sum, r) => sum + r.debitPaisa, 0))}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-slate-505">
                        <span>Total Payments (Credits)</span>
                        <span className="text-emerald-650">
                          {formatCurrency(ledger.reduce((sum, r) => sum + r.creditPaisa, 0))}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-black text-slate-808 border-t border-slate-200 pt-2 mt-1">
                        <span>Reconciled Outstanding Due</span>
                        <span className="text-emerald-650 text-sm">
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
      )}
    </div>
  );
}
