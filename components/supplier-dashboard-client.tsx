"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Calendar,
  Clock,
  Search,
  ArrowUpDown,
  TrendingUp,
  Package,
  Boxes,
  Activity
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

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

export function SupplierDashboardClient({
  supplier,
  history
}: {
  supplier: LocalSupplier;
  history: SupplyItem[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"history" | "medicines">("history");

  // Sorting state for aggregated tab
  const [medSortKey, setMedSortKey] = useState<"qty" | "volume" | "name">("qty");
  const [medSortOrder, setMedSortOrder] = useState<"asc" | "desc">("desc");

  // 1. Calculate Statistics
  const stats = useMemo(() => {
    let totalSpent = 0;
    let totalQty = 0;
    const uniqueMeds = new Set<string>();
    let activeBatches = 0;
    let lastSupply = "Never";

    history.forEach((item) => {
      totalSpent += item.purchaseRatePaisa * item.quantity;
      totalQty += item.quantity;
      uniqueMeds.add(item.medicineId);
      if (item.quantity > 0) {
        activeBatches += 1;
      }
    });

    if (history.length > 0) {
      lastSupply = formatDate(history[0].createdAt);
    }

    return {
      totalSpent,
      totalQty,
      uniqueMedsCount: uniqueMeds.size,
      activeBatches,
      lastSupply
    };
  }, [history]);

  // 2. Filter Supply History
  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) return history;
    const query = searchTerm.toLowerCase();

    return history.filter((item) => {
      const medicineMatch = item.medicineName.toLowerCase().includes(query);
      const batchMatch = item.batchNo.toLowerCase().includes(query);
      const hsnMatch = item.hsnCode.toLowerCase().includes(query);
      const dateMatch = formatDate(item.createdAt).toLowerCase().includes(query) || item.createdAt.includes(query);

      return medicineMatch || batchMatch || hsnMatch || dateMatch;
    });
  }, [history, searchTerm]);

  // 3. Aggregate Medicine Supply
  const medicineAggregates = useMemo(() => {
    const medMap: Record<
      string,
      {
        name: string;
        packSize: string;
        qty: number;
        volume: number;
        lastSupplied: string;
      }
    > = {};

    history.forEach((item) => {
      const name = item.medicineName;
      if (!medMap[name]) {
        medMap[name] = {
          name,
          packSize: item.medicinePackSize,
          qty: 0,
          volume: 0,
          lastSupplied: item.createdAt
        };
      }
      medMap[name].qty += item.quantity;
      medMap[name].volume += item.purchaseRatePaisa * item.quantity;
      // Since history is ordered desc, the first occurrence is the latest supply date
      if (new Date(item.createdAt) > new Date(medMap[name].lastSupplied)) {
        medMap[name].lastSupplied = item.createdAt;
      }
    });

    const list = Object.values(medMap);

    list.sort((a, b) => {
      let comp = 0;
      if (medSortKey === "qty") comp = a.qty - b.qty;
      else if (medSortKey === "volume") comp = a.volume - b.volume;
      else comp = a.name.localeCompare(b.name);
      return medSortOrder === "desc" ? -comp : comp;
    });

    return list;
  }, [history, medSortKey, medSortOrder]);

  const handleMedSort = (key: "qty" | "volume" | "name") => {
    if (medSortKey === key) {
      setMedSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setMedSortKey(key);
      setMedSortOrder("desc");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Back to Suppliers */}
      <div>
        <Link
          href="/shop/suppliers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Suppliers
        </Link>
      </div>

      {/* ─── HERO & PROFILE CARD ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Card: Supplier Profile details */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
            {/* Initials Avatar */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-2xl font-bold text-white shadow-md">
              {getInitials(supplier.name)}
            </div>

            <div className="space-y-2 flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-800 truncate">{supplier.name}</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{supplier.phone || "No phone number"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">{supplier.email || "No email address"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">GSTIN: {supplier.gstin || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">{supplier.address || "No address saved"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-6 pt-4 flex justify-between items-center text-xs text-slate-400">
            <span>Supplier ID: <code className="font-mono text-slate-500">{supplier.id}</code></span>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {supplier.creditDays} Credit Days Limit
            </span>
          </div>
        </div>

        {/* Right Card: Balance Payable */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Outstanding Payable</span>
            <h2
              className={`font-display text-3xl font-extrabold mt-1.5 ${
                supplier.balancePaisa > 0 ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {formatCurrency(supplier.balancePaisa)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Pending payments to distributor</p>
          </div>

          <div className="border-t border-slate-100 pt-4 flex gap-4 mt-6">
            <div className="flex-1">
              <span className="text-[10px] text-slate-400 font-semibold block">Credit Window</span>
              <span className="text-base font-bold text-slate-700 block mt-0.5">
                {supplier.creditDays} days
              </span>
            </div>
            <div className="flex-1 text-right">
              <span className="text-[10px] text-slate-400 font-semibold block">Last Supplied</span>
              <span className="text-xs font-bold text-slate-800 block mt-1">{stats.lastSupply}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── METRICS BOXES ─── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Purchase Volume */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Supply Vol</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="font-display text-xl font-bold text-slate-800">{formatCurrency(stats.totalSpent)}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Cumulative purchase volume</p>
          </div>
        </div>

        {/* Total Qty Supplied */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Items</span>
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <Package className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="font-display text-xl font-bold text-slate-800">{stats.totalQty} units</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Sum of all medicine quantities</p>
          </div>
        </div>

        {/* Unique Medicines */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Supplied Meds</span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <Boxes className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="font-display text-xl font-bold text-slate-800">{stats.uniqueMedsCount} kinds</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Distinct medicine records</p>
          </div>
        </div>

        {/* Active Batches */}
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Batches</span>
            <div className="rounded-lg bg-teal-50 p-2 text-teal-600">
              <Activity className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="font-display text-xl font-bold text-slate-800">{stats.activeBatches} active</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Batches currently in stock</p>
          </div>
        </div>
      </div>

      {/* ─── TAB SWITCHER ─── */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("history")}
            className={`border-b-2 pb-3 text-sm font-semibold transition-all ${
              activeTab === "history"
                ? "border-med-green text-med-greenDark"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Supply History ({filteredHistory.length})
          </button>
          <button
            onClick={() => setActiveTab("medicines")}
            className={`border-b-2 pb-3 text-sm font-semibold transition-all ${
              activeTab === "medicines"
                ? "border-med-green text-med-greenDark"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Supplied Medicines ({medicineAggregates.length})
          </button>
        </div>
      </div>

      {/* ─── TAB CONTENT: HISTORY ─── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Quick Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search history by medicine, batch, HSN, date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-xs outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-med-green/20 focus:border-med-green"
            />
          </div>

          {filteredHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
              <Calendar className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium">No supplies matched the search criteria.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Medicine Name</th>
                      <th className="px-4 py-3">Batch</th>
                      <th className="px-4 py-3">Supply Date</th>
                      <th className="px-4 py-3">Expiry Date</th>
                      <th className="px-4 py-3 text-right">Qty Supplied</th>
                      <th className="px-4 py-3 text-right">Purchase Rate</th>
                      <th className="px-4 py-3 text-right">MRP</th>
                      <th className="px-4 py-3 text-right">GST %</th>
                      <th className="px-4 py-3 text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.map((item) => {
                      const totalVal = item.purchaseRatePaisa * item.quantity;
                      const isExhausted = item.quantity === 0;
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/50 transition-colors ${
                            isExhausted ? "bg-slate-50/30 text-slate-400" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span className={`font-bold block ${isExhausted ? "text-slate-400" : "text-slate-800"}`}>
                              {item.medicineName}
                            </span>
                            <span className="text-[10px] text-slate-400">{item.medicinePackSize}</span>
                          </td>
                          <td className="px-4 py-3 font-mono">{item.batchNo}</td>
                          <td className="px-4 py-3">{formatDate(item.createdAt)}</td>
                          <td className="px-4 py-3">{formatDate(item.expiryDate)}</td>
                          <td className="px-4 py-3 text-right">
                            {isExhausted ? (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                                Exhausted
                              </span>
                            ) : (
                              <span className="font-bold text-slate-700">{item.quantity}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.purchaseRatePaisa)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.mrpPaisa)}</td>
                          <td className="px-4 py-3 text-right">{item.gstRate}%</td>
                          <td className="px-4 py-3 text-right font-bold">
                            {formatCurrency(totalVal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB CONTENT: MEDICINES AGGREGATE ─── */}
      {activeTab === "medicines" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {medicineAggregates.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Calendar className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium">No medicines recorded from this supplier yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th
                      onClick={() => handleMedSort("name")}
                      className="px-6 py-3 cursor-pointer select-none hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-1 text-xs">
                        Medicine Name
                        {medSortKey === "name" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-xs">Pack Details</th>
                    <th
                      onClick={() => handleMedSort("qty")}
                      className="px-6 py-3 text-right cursor-pointer select-none hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1 text-xs">
                        Total Qty Supplied
                        {medSortKey === "qty" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th
                      onClick={() => handleMedSort("volume")}
                      className="px-6 py-3 text-right cursor-pointer select-none hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1 text-xs">
                        Total Value (₹)
                        {medSortKey === "volume" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs">Last Supplied On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {medicineAggregates.map((med) => (
                    <tr key={med.name} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3.5 font-bold text-slate-800">{med.name}</td>
                      <td className="px-6 py-3.5 text-slate-500">{med.packSize}</td>
                      <td className="px-6 py-3.5 text-right font-semibold text-slate-700">{med.qty}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-800">
                        {formatCurrency(med.volume)}
                      </td>
                      <td className="px-6 py-3.5 text-right text-slate-500">
                        {formatDate(med.lastSupplied)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
