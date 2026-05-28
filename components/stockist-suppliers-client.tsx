"use client";

import React, { useMemo, useState, useEffect } from "react";
import { 
  AlertCircle, CheckCircle2, Box, Plus, Search, 
  CreditCard, Truck, UserCheck, Phone, Mail, MapPin, 
  FileText, Activity, Loader2, Sparkles, SlidersHorizontal
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createStockistSupplierAction } from "@/app/stockist-actions";
import { SupplierDashboardClient } from "./supplier-dashboard-client";

type LocalSupplier = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  creditDays: number;
  balancePaisa: number;
};

type SupplyItem = {
  id: string;
  medicineId: string;
  medicineName: string;
  medicinePackSize: string;
  batchNo: string;
  mfgDate: string | null;
  expiryDate: string;
  purchaseRatePaisa: number;
  mrpPaisa: number;
  saleRatePaisa: number;
  gstRate: number;
  hsnCode: string;
  quantity: number;
  createdAt: string;
};

interface StockistSuppliersClientProps {
  initialSuppliers: LocalSupplier[];
}

export function StockistSuppliersClient({ initialSuppliers }: StockistSuppliersClientProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<LocalSupplier | null>(null);
  const [history, setHistory] = useState<SupplyItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");

  const handleSelectSupplier = async (supplier: LocalSupplier) => {
    setSelectedSupplier(supplier);
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/suppliers/history?supplierId=${encodeURIComponent(supplier.id)}`);
      const resData = await response.json();
      if (resData.data) {
        setHistory(resData.data);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Failed to load supply history:", err);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filter suppliers by name, phone, or GSTIN
  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.toLowerCase().trim();
    if (!q) return initialSuppliers;
    return initialSuppliers.filter((s) => 
      s.name.toLowerCase().includes(q) ||
      (s.phone || "").toLowerCase().includes(q) ||
      (s.gstin || "").toLowerCase().includes(q)
    );
  }, [initialSuppliers, supplierSearch]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Gradients for avatar rings based on id characters for stable seed coloring
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

  // Full Screen Supplier Profile details (early return)
  if (selectedSupplier) {
    return (
      <div className="space-y-4 animate-fade-in w-full">
        {/* Premium Back Navigation Bar */}
        <div className="flex items-center justify-between gap-4 bg-white border border-slate-100 p-3 rounded-2xl shadow-2xs">
          <button
            onClick={() => setSelectedSupplier(null)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-black text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-100/50 shadow-sm cursor-pointer"
          >
            ← Back to Manufacturers Directory
          </button>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Manufacturer Audit</span>
            <p className="text-xs font-bold text-slate-705">{selectedSupplier.name}</p>
          </div>
        </div>

        {/* Dynamic Detail Dashboard Preview Panel */}
        <div className="glass-card p-5 min-w-0 w-full overflow-hidden relative min-h-[500px]">
          {loadingHistory ? (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-20 flex flex-col items-center justify-center py-20 text-center space-y-3 animate-fade-in">
              <Loader2 className="h-9 w-9 text-med-green animate-spin" />
              <div>
                <p className="text-sm font-black text-slate-800">Loading Manufacturer Ledger</p>
                <p className="text-xs text-slate-455 font-semibold mt-1">Retrieving batches, active lots, and purchase order history...</p>
              </div>
            </div>
          ) : null}

          <SupplierDashboardClient 
            supplier={selectedSupplier}
            history={history}
            hideBackBtn={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* ─── SEARCH & FILTER CONTROLLER ─── */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-med-green shrink-0" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 leading-tight">Manufacturers & CFA Catalog</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Quickly select, filter and search through active bulk supply accounts</p>
          </div>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search manufacturer, phone, or GSTIN..."
            value={supplierSearch}
            onChange={(e) => setSupplierSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 placeholder:text-slate-400 bg-white shadow-2xs"
          />
        </div>
      </div>

      {/* ─── GRID LAYOUT: MANUFACTURERS LIST + NEW FORM ─── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] min-w-0 w-full items-start">
        
        {/* Left Side: Registered Manufacturers Grid List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2">
              <Box className="h-5 w-5 text-med-green" /> Registered Manufacturers ({filteredSuppliers.length})
            </h2>
            <p className="text-xs text-slate-450 font-medium italic hidden sm:block">💡 Click any card to view full profile & B2B ledger</p>
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl shadow-2xs">
              No registered manufacturers match your search.
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {filteredSuppliers.map((sup) => {
                const hasOutstanding = sup.balancePaisa > 0;
                return (
                  <button
                    key={sup.id}
                    onClick={() => handleSelectSupplier(sup)}
                    className="text-left rounded-2xl border p-4.5 flex flex-col justify-between h-44 transition-all duration-250 hover:scale-[1.01] active:scale-99 cursor-pointer shadow-sm relative overflow-hidden bg-white border-slate-200 hover:border-slate-350 hover:shadow w-full"
                  >
                    {/* Header Row */}
                    <div className="flex gap-3 items-center min-w-0">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${getGradient(sup.id)} text-sm font-bold text-white shadow-sm`}>
                        {getInitials(sup.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-slate-800 text-sm leading-snug truncate hover:text-med-green transition-colors">{sup.name}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                          {sup.phone || "No contact"}
                        </p>
                      </div>
                    </div>

                    {/* GSTIN & Details */}
                    <div className="mt-3.5 space-y-1">
                      <p className="text-[10px] font-mono font-bold text-slate-500 flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-slate-400" /> GSTIN: <span className="text-slate-700">{sup.gstin || "URP"}</span>
                      </p>
                      <p className="text-[10px] font-semibold text-slate-450 flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5 text-slate-400" /> Credit Limit: <span className="font-bold text-slate-700">{sup.creditDays} Days</span>
                      </p>
                    </div>

                    {/* Footer Row - Balance Payable */}
                    <div className="mt-3.5 border-t border-slate-100 pt-2.5 flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payable Balance</span>
                      <span className={`font-mono font-extrabold text-xs px-2 py-0.5 rounded-full ${
                        hasOutstanding ? "text-amber-700 bg-amber-50 border border-amber-100" : "text-emerald-700 bg-emerald-50 border border-emerald-100"
                      }`}>
                        {formatCurrency(sup.balancePaisa)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Registration Form Panel */}
        <div className="glass-card p-5">
          <h2 className="font-display text-base sm:text-lg font-bold text-med-navy flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-med-green" /> Register Manufacturer
          </h2>

          <form action={createStockistSupplierAction} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Manufacturer / Supplier Name *</span>
              <input 
                name="name" 
                required 
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green focus:ring-1 focus:ring-med-green/20 transition-colors font-semibold text-slate-700 placeholder:text-slate-400" 
                placeholder="e.g. Cipla Healthcare Ltd" 
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Phone</span>
                <input 
                  name="phone" 
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green focus:ring-1 focus:ring-med-green/20 transition-colors text-slate-700 placeholder:text-slate-400" 
                  placeholder="Contact number" 
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-505">Email</span>
                <input 
                  name="email" 
                  type="email" 
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green focus:ring-1 focus:ring-med-green/20 transition-colors text-slate-700 placeholder:text-slate-400" 
                  placeholder="Email address" 
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">CFA / Distribution Address</span>
              <input 
                name="address" 
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green focus:ring-1 focus:ring-med-green/20 transition-colors text-slate-700 placeholder:text-slate-400" 
                placeholder="Supply depot address" 
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">GSTIN No.</span>
                <input 
                  name="gstin" 
                  className="h-10 w-full rounded-lg border border-slate-305 px-3 text-sm focus:outline-none focus:border-med-green focus:ring-1 focus:ring-med-green/20 transition-colors font-mono text-slate-700 placeholder:text-slate-400 uppercase" 
                  placeholder="15-digit GSTIN" 
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-505">Credit Days</span>
                <input 
                  name="creditDays" 
                  type="number" 
                  min="0" 
                  defaultValue="30" 
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green focus:ring-1 focus:ring-med-green/20 transition-colors font-semibold text-center text-slate-700" 
                  placeholder="30" 
                />
              </label>
            </div>

            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-med-green font-semibold text-white shadow-sm hover:bg-med-greenDark active:scale-95 transition-all mt-6 text-sm">
              <UserCheck className="h-4.5 w-4.5" /> Save Manufacturer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
