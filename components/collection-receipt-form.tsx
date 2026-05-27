"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { CreditCard, Search, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Party = {
  id: string;
  name: string;
  phone: string | null;
  outstandingPaisa: number;
};

type Salesman = {
  id: string;
  name: string;
};

interface CollectionReceiptFormProps {
  parties: Party[];
  salesmen: Salesman[];
  action: (formData: FormData) => Promise<void> | void;
}

export function CollectionReceiptForm({ parties, salesmen, action }: CollectionReceiptFormProps) {
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedParty = useMemo(() => {
    return parties.find((p) => p.id === selectedPartyId) || null;
  }, [parties, selectedPartyId]);

  // Filter parties based on search query
  const filteredParties = useMemo(() => {
    if (!searchQuery.trim()) return parties.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return parties.filter(
      (p) =>
        p.id === selectedPartyId ||
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [parties, searchQuery, selectedPartyId]);

  // Keep search input matching selected party name
  useEffect(() => {
    if (selectedParty) {
      setSearchQuery(selectedParty.name);
    } else {
      setSearchQuery("");
    }
  }, [selectedPartyId, selectedParty]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="glass-card p-4 sm:p-5 h-fit">
      <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2 mb-4">
        <Plus className="h-5 w-5 text-med-green" /> Record Chemist Payment
      </h2>

      <form action={action} className="space-y-4">
        {/* Hidden input to pass selectedPartyId to the server action */}
        <input type="hidden" name="partyId" value={selectedPartyId} required />

        {/* Searchable Autocomplete Party Selector */}
        <div className="block space-y-1 relative" ref={dropdownRef}>
          <span className="text-xs font-semibold text-slate-500">Retail Chemist (Party) *</span>
          <div className="relative">
            <input
              type="text"
              placeholder="Search chemist party name or phone..."
              value={searchQuery}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
                if (!e.target.value.trim()) {
                  setSelectedPartyId("");
                }
              }}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 pr-10 text-sm focus:outline-none focus:border-med-green bg-white font-medium text-slate-800 shadow-xs"
              required
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400">
              {selectedParty ? (
                <span className="text-emerald-600 font-extrabold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">Selected</span>
              ) : (
                <Search className="h-4 w-4" />
              )}
            </div>
          </div>

          {/* Autocomplete suggestions */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg space-y-0.5 animate-scale-in">
              {filteredParties.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPartyId(p.id);
                    setSearchQuery(p.name);
                    setShowDropdown(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-xs hover:bg-slate-50 transition-colors ${
                    selectedPartyId === p.id ? "bg-slate-100/70 font-bold" : ""
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {p.phone ? `📞 ${p.phone}` : "No phone number"}
                    </p>
                  </div>
                  <div className="text-right text-[10px] font-mono text-slate-500 font-semibold">
                    Outstanding: {formatCurrency(p.outstandingPaisa)}
                  </div>
                </button>
              ))}

              {filteredParties.length === 0 && (
                <div className="p-3 text-center text-slate-400 text-xs">
                  No matching Retailer Parties found.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Booking Executive / Salesman */}
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-500">Field Executive (Salesman)</span>
          <select
            name="salesmanId"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors bg-white font-medium text-slate-800"
          >
            <option value="">Office Direct Collection</option>
            {salesmen.map((sm) => (
              <option key={sm.id} value={sm.id}>
                {sm.name}
              </option>
            ))}
          </select>
        </label>

        {/* Amount Received */}
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-500">Amount Received (₹) *</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
            <input
              name="amount"
              type="number"
              min="1"
              step="any"
              required
              className="h-10 w-full rounded-lg border border-slate-300 pl-7 pr-3 text-sm focus:outline-none focus:border-med-green transition-colors font-bold text-slate-800 shadow-xs"
              placeholder="0.00"
            />
          </div>
        </label>

        {/* Payment Mode */}
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-500">Payment Mode *</span>
          <select
            name="paymentMode"
            required
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors bg-white font-semibold text-slate-800"
          >
            <option value="upi">UPI / QR Scan</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="neft">NEFT / Bank Transfer</option>
          </select>
        </label>

        {/* Reference / Txn No */}
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-500">Txn / Reference No.</span>
          <input
            name="referenceNo"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-mono"
            placeholder="Cheque number / UPI Txn ID"
          />
        </label>

        {/* Remarks */}
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-500">Remarks / Collection Notes</span>
          <textarea
            name="notes"
            rows={2}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:border-med-green transition-colors"
            placeholder="Optional comments..."
          />
        </label>

        {/* Submit */}
        <button
          type="submit"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-med-green font-semibold text-white shadow-sm hover:bg-med-greenDark active:scale-95 transition-all mt-6 text-sm"
        >
          <CreditCard className="h-4.5 w-4.5" /> Save Collection Receipt
        </button>
      </form>
    </div>
  );
}
