"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, CreditCard, Loader2, Plus, Search, Star, Users } from "lucide-react";

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
          <h1 className="font-display text-2xl font-bold text-med-navy">Customers List</h1>
          <p className="mt-1 text-sm text-slate-500">Manage customer profile, credit outstandings, and loyalty accounts.</p>
        </div>
        <Link
          href="/shop/customers/add"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-med-green px-5 font-semibold text-white shadow-sm transition-colors hover:bg-med-greenDark active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" /> Add Customer
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        {/* Total Customers */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-slate-500">Total Customers</p>
              <p className="text-base sm:text-xl font-bold text-med-navy">{customers.length}</p>
            </div>
          </div>
        </div>

        {/* Outstanding */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <CreditCard className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-slate-500">Outstanding</p>
              <p className="text-base sm:text-xl font-bold text-med-navy">{formatCurrency(totalOutstanding)}</p>
            </div>
          </div>
        </div>

        {/* Loyalty Points */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <Star className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-slate-500">Loyalty Points</p>
              <p className="text-base sm:text-xl font-bold text-med-navy">{totalLoyalty.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
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
          filtered.map((customer, idx) => (
            <div key={customer.id} className={idx > 0 ? "border-t border-slate-100 animate-fade-in" : "animate-fade-in"}>
              {/* Customer Row Link */}
              <Link
                href={`/shop/customers/${encodeURIComponent(customer.id)}`}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-all hover:bg-slate-50 group active:bg-slate-100"
              >
                {/* Avatar */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${getAvatarColor(customer.name)}`}>
                  {customer.name.charAt(0).toUpperCase()}
                </div>

                {/* Name + Phone */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-med-navy group-hover:text-med-greenDark transition-colors">{customer.name}</p>
                  <p className="truncate text-xs text-slate-500 mt-0.5">
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

                {/* Chevron icon */}
                <div className="shrink-0 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </Link>

              {/* Mobile stats (shown below name on small screens, click will still navigate) */}
              <Link
                href={`/shop/customers/${encodeURIComponent(customer.id)}`}
                className="flex gap-4 px-4 pb-3.5 -mt-2 sm:hidden text-xs"
              >
                <span className={`font-semibold ${customer.outstandingPaisa > 0 ? "text-amber-600" : "text-slate-500"}`}>
                  Outstanding: {formatCurrency(customer.outstandingPaisa)}
                </span>
                <span className="font-semibold text-purple-600">
                  {customer.loyaltyPoints} pts
                </span>
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
