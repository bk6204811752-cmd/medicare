"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, CreditCard, Loader2, Plus, Search, Star, Users } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  doctorName: string | null;
  outstandingPaisa: number;
  loyaltyPoints: number;
};

type PurchaseItem = { name: string; quantity: number; totalPaisa: number };
type Purchase = {
  id: string;
  invoiceNo: string;
  date: string;
  items: PurchaseItem[];
  totalPaisa: number;
  paymentMode: string;
};

function formatCurrency(paisa: number) {
  return `₹${(paisa / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

const avatarColors = [
  "bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500"
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<Record<string, Purchase[]>>({});
  const [loadingPurchases, setLoadingPurchases] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((res) => setCustomers(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.doctorName?.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const totalOutstanding = useMemo(() => customers.reduce((s, c) => s + c.outstandingPaisa, 0), [customers]);
  const totalLoyalty = useMemo(() => customers.reduce((s, c) => s + c.loyaltyPoints, 0), [customers]);

  async function toggleExpand(customerId: string) {
    if (expandedId === customerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(customerId);
    if (!purchases[customerId]) {
      setLoadingPurchases(customerId);
      try {
        const res = await fetch(`/api/customers/${customerId}/purchases`);
        const data = await res.json();
        setPurchases((prev) => ({ ...prev, [customerId]: data.data ?? [] }));
      } catch {
        setPurchases((prev) => ({ ...prev, [customerId]: [] }));
      } finally {
        setLoadingPurchases(null);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-med-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-med-navy">Customers</h1>
          <p className="mt-1 text-sm text-slate-500">Customer ledger, purchase history, loyalty & credit outstanding</p>
        </div>
        <Link
          href="/shop/customers/add"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-med-green px-5 font-semibold text-white shadow-sm transition-colors hover:bg-med-greenDark"
        >
          <Plus className="h-4 w-4" /> Add Customer
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Customers</p>
              <p className="text-xl font-bold text-med-navy">{customers.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <CreditCard className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Outstanding</p>
              <p className="text-xl font-bold text-med-navy">{formatCurrency(totalOutstanding)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <Star className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Loyalty Points</p>
              <p className="text-xl font-bold text-med-navy">{totalLoyalty.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm shadow-sm outline-none transition-shadow focus:border-med-green focus:ring-2 focus:ring-med-green/20"
          placeholder="Search by name, phone, email, or doctor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Customer List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 font-medium text-slate-500">
              {searchQuery ? "No customers match your search" : "No customers added yet"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {searchQuery ? "Try a different search term" : "Add your first customer to get started"}
            </p>
          </div>
        ) : (
          filtered.map((customer, idx) => {
            const isExpanded = expandedId === customer.id;
            const customerPurchases = purchases[customer.id];
            const isLoadingThis = loadingPurchases === customer.id;
            return (
              <div key={customer.id} className={idx > 0 ? "border-t border-slate-100" : ""}>
                {/* Customer Row */}
                <button
                  onClick={() => toggleExpand(customer.id)}
                  className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                >
                  {/* Avatar */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getAvatarColor(customer.name)}`}>
                    {customer.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + Phone */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-med-navy">{customer.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {customer.phone || "No phone"}
                      {customer.doctorName ? ` • Dr. ${customer.doctorName}` : ""}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden items-center gap-6 sm:flex">
                    <div className="text-right">
                      <p className="text-[10px] font-medium text-slate-400">Outstanding</p>
                      <p className={`text-sm font-semibold ${customer.outstandingPaisa > 0 ? "text-amber-600" : "text-slate-600"}`}>
                        {formatCurrency(customer.outstandingPaisa)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium text-slate-400">Loyalty</p>
                      <p className="text-sm font-semibold text-purple-600">{customer.loyaltyPoints} pts</p>
                    </div>
                  </div>

                  {/* Expand icon */}
                  <div className="shrink-0 text-slate-400">
                    {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </button>

                {/* Mobile stats (shown below name on small screens) */}
                <div className="flex gap-4 px-4 pb-2 sm:hidden">
                  <span className={`text-xs font-semibold ${customer.outstandingPaisa > 0 ? "text-amber-600" : "text-slate-500"}`}>
                    Outstanding: {formatCurrency(customer.outstandingPaisa)}
                  </span>
                  <span className="text-xs font-semibold text-purple-600">
                    {customer.loyaltyPoints} pts
                  </span>
                </div>

                {/* Expanded Purchase History */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-med-navy">Purchase History</h3>
                      <Link
                        href={`/shop/customers/${encodeURIComponent(customer.id)}`}
                        className="text-xs font-medium text-med-green hover:underline"
                      >
                        View full profile →
                      </Link>
                    </div>

                    {isLoadingThis ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        <span className="ml-2 text-sm text-slate-400">Loading purchases...</span>
                      </div>
                    ) : !customerPurchases || customerPurchases.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
                        <p className="text-sm text-slate-400">No purchases recorded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {customerPurchases.map((purchase) => (
                          <div key={purchase.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-med-navy">{purchase.invoiceNo}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{purchase.date}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-med-navy">{formatCurrency(purchase.totalPaisa)}</p>
                                <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  purchase.paymentMode === "cash"
                                    ? "bg-green-100 text-green-700"
                                    : purchase.paymentMode === "credit"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}>
                                  {purchase.paymentMode}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 border-t border-slate-50 pt-2">
                              <p className="text-xs text-slate-500">
                                {purchase.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
