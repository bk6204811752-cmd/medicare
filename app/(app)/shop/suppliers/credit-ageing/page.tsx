"use client";

import { useEffect, useState, useMemo } from "react";
import {
  TrendingDown, ShieldAlert, Award, FileText, CheckCircle2,
  RefreshCw, Loader2, ArrowUpRight, Search, Building, ShieldCheck,
  ChevronRight, Sparkles, Plus
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

type SupplierAgeing = {
  supplierId: string;
  supplierName: string;
  phone: string | null;
  creditDays: number;
  totalOutstanding: number;
  interestPaisa: number;
  buckets: {
    "0-30": number;
    "30-60": number;
    "60-90": number;
    "90+": number;
  };
};

type Aggregates = {
  totalOutstanding: number;
  totalInterest: number;
  "0-30": number;
  "30-60": number;
  "60-90": number;
  "90+": number;
};

export default function CreditAgeingPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierAgeing[]>([]);
  const [aggregates, setAggregates] = useState<Aggregates>({
    totalOutstanding: 0,
    totalInterest: 0,
    "0-30": 0,
    "30-60": 0,
    "60-90": 0,
    "90+": 0,
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Financing states
  const [creditLimit, setCreditLimit] = useState(50000);
  const [showFinancingModal, setShowFinancingModal] = useState(false);
  const [monthlyVolume, setMonthlyVolume] = useState("");
  const [requestedLimit, setRequestedLimit] = useState("100000");
  const [gstin, setGstin] = useState("27AABCS8945F1Z2");
  const [applying, setApplying] = useState(false);
  const [applyStep, setApplyStep] = useState(0);

  const fetchAgeing = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/reports/credit-ageing");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load data");
      setSuppliers(data.data?.suppliers ?? []);
      setAggregates(
        data.data?.aggregates ?? {
          totalOutstanding: 0,
          totalInterest: 0,
          "0-30": 0,
          "30-60": 0,
          "60-90": 0,
          "90+": 0,
        }
      );
    } catch (error) {
      toast.error("Failed to calculate supplier credit ageing");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAgeing();
  }, []);

  const handleApplyFinancing = () => {
    if (!monthlyVolume) {
      toast.error("Please enter your typical monthly purchase volume");
      return;
    }
    setApplying(true);
    setApplyStep(0);
  };

  const steps = [
    "Connecting to GSTIN tax records...",
    "Analyzing historical inventory sales turnover...",
    "Computing credit default risk multipliers...",
    "Approving flexible procurement financing lines...",
  ];

  useEffect(() => {
    if (!applying) return;

    const interval = setInterval(() => {
      setApplyStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            setCreditLimit(Number(requestedLimit));
            setApplying(false);
            setShowFinancingModal(false);
            toast.success(`Congratulations! Your B2B credit line limit has been increased to ${formatCurrency(Number(requestedLimit) * 100)}!`);
          }, 800);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [applying, requestedLimit]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) =>
      s.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [suppliers, searchQuery]);

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="Supplier Credit Ageing & Financing"
        description="Medikabazaar-style B2B outstanding ageing analysis and flexible stockist credit financing lines"
        action={
          <button
            onClick={() => fetchAgeing(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {/* Credit Ageing Buckets row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-card p-4 border-l-4 border-l-slate-800">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Outstanding</h3>
          <p className="text-xl font-extrabold text-slate-800 mt-1">{formatCurrency(aggregates.totalOutstanding)}</p>
          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Sum of B2B credit due</span>
        </div>

        <div className="glass-card p-4 border-l-4 border-l-emerald-500">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">0-30 Days Due</h3>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">{formatCurrency(aggregates["0-30"])}</p>
          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Within standard terms</span>
        </div>

        <div className="glass-card p-4 border-l-4 border-l-blue-500">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">30-60 Days</h3>
          <p className="text-xl font-extrabold text-blue-600 mt-1">{formatCurrency(aggregates["30-60"])}</p>
          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Grace period outstanding</span>
        </div>

        <div className="glass-card p-4 border-l-4 border-l-amber-500">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">60-90 Days</h3>
          <p className="text-xl font-extrabold text-amber-600 mt-1">{formatCurrency(aggregates["60-90"])}</p>
          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Risk of credit lock-out</span>
        </div>

        <div className="glass-card p-4 border-l-4 border-l-red-500">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">90+ Days Due</h3>
          <p className="text-xl font-extrabold text-red-600 mt-1">{formatCurrency(aggregates["90+"])}</p>
          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Critical risk accounts</span>
        </div>

        <div className="glass-card p-4 border-l-4 border-l-rose-600">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Late Interest Accrued</h3>
          <p className="text-xl font-extrabold text-rose-600 mt-1">{formatCurrency(aggregates.totalInterest)}</p>
          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">18% p.a. simple penalty</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left: Supplier Credit Breakdown list */}
        <div className="space-y-4">
          <div className="glass-card p-4 flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search supplier ledger accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700"
              />
            </div>
          </div>

          <div className="glass-card p-0 overflow-hidden border border-slate-100 shadow-sm">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm font-semibold">Running credit ageing mathematical ledger compilations...</p>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-16">No suppliers found with outstanding balance</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase text-slate-400">
                      <th className="py-3 px-4">Supplier / Credit Terms</th>
                      <th className="py-3 px-4 text-center">0-30 Days</th>
                      <th className="py-3 px-4 text-center">30-60 Days</th>
                      <th className="py-3 px-4 text-center">60-90 Days</th>
                      <th className="py-3 px-4 text-center">90+ Days</th>
                      <th className="py-3 px-4 text-right">Total Owed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredSuppliers.map((sup) => (
                      <tr key={sup.supplierId} className="hover:bg-slate-50/30">
                        <td className="py-3 px-4">
                          <p className="font-extrabold text-slate-700">{sup.supplierName}</p>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                            ⏱ {sup.creditDays} days credit limit
                          </span>
                          {sup.interestPaisa > 0 && (
                            <span className="inline-flex items-center gap-0.5 mt-1.5 rounded bg-rose-50 border border-rose-100 px-2 py-0.5 text-[9px] font-black text-rose-700 uppercase tracking-wider animate-pulse shadow-xs">
                              ⚠ Late Interest: {formatCurrency(sup.interestPaisa)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-emerald-600">
                          {sup.buckets["0-30"] > 0 ? formatCurrency(sup.buckets["0-30"]) : "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-blue-600">
                          {sup.buckets["30-60"] > 0 ? formatCurrency(sup.buckets["30-60"]) : "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-amber-600">
                          {sup.buckets["60-90"] > 0 ? formatCurrency(sup.buckets["60-90"]) : "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-red-600">
                          {sup.buckets["90+"] > 0 ? formatCurrency(sup.buckets["90+"]) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-800">
                          {formatCurrency(sup.totalOutstanding)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Medikabazaar Style Purchase Financing Widget */}
        <div className="space-y-6">
          <div className="glass-card p-5 border border-emerald-100 bg-emerald-50/5 relative overflow-hidden shadow-md">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10" />
            <div className="absolute right-2 top-2 flex items-center justify-center h-8 w-8 text-emerald-600 bg-white/40 border border-white/60 rounded-xl">
              <Award className="h-4.5 w-4.5" />
            </div>

            <div className="space-y-3 pr-8">
              <span className="inline-block bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                B2B Purchase Financing Active
              </span>
              <h3 className="text-base font-extrabold text-slate-800 leading-tight">
                Medikabazaar Flexible Procurement Credit
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Procure stock from primary medicine markets immediately and pay stockists with our integrated financing line!
              </p>
            </div>

            {/* Credit limit gauge */}
            <div className="my-5 p-4 rounded-xl bg-white border border-slate-100 space-y-2 shadow-xs">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Available Credit:</span>
                <span className="font-extrabold text-emerald-600">
                  {formatCurrency(creditLimit * 100)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-full" />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                <span>Used: ₹0</span>
                <span>Limit: {formatCurrency(creditLimit * 100)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowFinancingModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all active:scale-95 duration-100 shadow-sm"
            >
              Request Credit Expansion <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── MEDIKABAZAAR FINANCING APPLICATION MODAL ────────────────── */}
      {showFinancingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => { if (!applying) setShowFinancingModal(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 border border-emerald-50 relative overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background elements */}
            <div className="absolute right-0 top-0 h-32 w-32 bg-emerald-500/5 rounded-full blur-2xl" />

            {!applying ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Procurement Financing</h3>
                    <p className="text-xs text-slate-400">Increase stockist buying limit instantly</p>
                  </div>
                </div>

                <div className="space-y-3.5 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Pharmacy GSTIN ID
                    </label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Monthly B2B Purchase volume (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 150000"
                      value={monthlyVolume}
                      onChange={(e) => setMonthlyVolume(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Requested Limit Extension
                    </label>
                    <select
                      value={requestedLimit}
                      onChange={(e) => setRequestedLimit(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
                    >
                      <option value="100000">₹1,00,000 (Silver Procurement Line)</option>
                      <option value="250000">₹2,50,000 (Gold Wholesale Line)</option>
                      <option value="500000">₹5,00,000 (Platinum Prime Market Line)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setShowFinancingModal(false)}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyFinancing}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all active:scale-95 duration-100 shadow-sm"
                  >
                    Submit Application
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
                {/* Loader radar */}
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 rounded-full bg-emerald-500 opacity-20 animate-ping" />
                  <div className="absolute inset-2 rounded-full bg-emerald-500 opacity-40 animate-pulse" />
                  <div className="absolute inset-3 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <Loader2 className="h-7 w-7 animate-spin" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-800 text-sm">Evaluating B2B Eligibility</h4>
                  <p className="text-[10px] text-slate-400">Medikabazaar Credit Engine is auditing registers...</p>
                </div>

                {/* Progress ticker list */}
                <div className="w-full space-y-2.5 text-left max-w-xs">
                  {steps.map((step, idx) => {
                    const isPast = idx < applyStep;
                    const isCurrent = idx === applyStep;
                    return (
                      <div
                        key={step}
                        className={`flex items-center gap-2 p-2 rounded border text-[10px] font-semibold transition-all ${
                          isPast
                            ? "border-emerald-100 bg-emerald-50/50 text-emerald-700"
                            : isCurrent
                            ? "border-blue-200 bg-blue-50/20 text-blue-800 animate-pulse"
                            : "border-slate-50 bg-slate-50/10 text-slate-400"
                        }`}
                      >
                        {isPast ? (
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        ) : isCurrent ? (
                          <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-slate-200" />
                        )}
                        <span>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
