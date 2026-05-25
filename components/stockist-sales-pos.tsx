"use script";
"use client";

import { useState, useTransition, useMemo, useEffect, useCallback } from "react";
import { AlertCircle, FileText, ShoppingCart, Plus, Trash2, User, UserCheck, ShieldCheck, Printer, CheckCircle2 } from "lucide-react";
import { createB2BSaleAction } from "@/app/stockist-actions";
import { formatCurrency } from "@/lib/utils";

type Party = {
  id: string;
  name: string;
  phone: string | null;
  gstin: string | null;
  drugLicenseNo: string | null;
  creditLimitPaisa: number;
  outstandingPaisa: number;
};

type Salesman = {
  id: string;
  name: string;
};

type InventoryItem = {
  id: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  ptrPaisa: number;
  saleRatePaisa: number;
  mrpPaisa: number;
  rackLocation: string | null;
  medicine: {
    id: string;
    name: string;
    composition: string | null;
    gstRate: number;
  };
};

type InvoiceLine = {
  inventoryId: string;
  medicineName: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  freeQuantity: number;
  ptrPaisa: number;
  mrpPaisa: number;
  discountPercent: number;
  gstRate: number;
  schemeDetails: string;
  availableStock: number;
};

export function StockistSalesPos({ parties, inventory, salesmen }: {
  parties: Party[];
  inventory: InventoryItem[];
  salesmen: Salesman[];
}) {
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [selectedSalesmanId, setSelectedSalesmanId] = useState("");
  const [invoiceType, setInvoiceType] = useState<"invoice" | "challan">("invoice");
  const [paymentMode, setPaymentMode] = useState<"credit" | "cash" | "upi" | "cheque">("credit");
  const [notes, setNotes] = useState("");
  
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  
  const [isPending, startTransition] = useTransition();
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingSuccess, setBillingSuccess] = useState<string | null>(null);
  const [generatedInvoiceNo, setGeneratedInvoiceNo] = useState<string | null>(null);

  // Load selected party outstanding/credit
  const selectedParty = useMemo(() => {
    return parties.find((p) => p.id === selectedPartyId) || null;
  }, [parties, selectedPartyId]);

  // Product Autocomplete
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = inventory.filter((item) => 
      item.medicine.name.toLowerCase().includes(q) || 
      item.batchNo.toLowerCase().includes(q)
    ).slice(0, 8);
    setSearchResults(filtered);
  }, [searchQuery, inventory]);

  const addLine = useCallback((item: InventoryItem) => {
    // Avoid duplicate lines for the same batch
    const existing = lines.find((l) => l.inventoryId === item.id);
    if (existing) {
      setSearchQuery("");
      setSearchResults([]);
      return;
    }

    setLines((prev) => [
      ...prev,
      {
        inventoryId: item.id,
        medicineName: item.medicine.name,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate,
        quantity: 10, // Standard wholesale default batch size
        freeQuantity: 0,
        ptrPaisa: item.ptrPaisa > 0 ? item.ptrPaisa : item.saleRatePaisa,
        mrpPaisa: item.mrpPaisa,
        discountPercent: 0,
        gstRate: item.medicine.gstRate,
        schemeDetails: "",
        availableStock: item.quantity,
      }
    ]);
    setSearchQuery("");
    setSearchResults([]);
  }, [lines]);

  const removeLine = useCallback((idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateLine = useCallback((idx: number, key: keyof InvoiceLine, value: any) => {
    setLines((prev) => prev.map((line, i) => {
      if (i !== idx) return line;
      
      const updated = { ...line, [key]: value };
      
      // Auto Free Goods Scheme Engine
      // Buy 10 Get 1 Free automatic calculations
      if (key === "quantity") {
        const qty = Number(value);
        if (qty >= 50) {
          updated.freeQuantity = Math.floor(qty / 10);
          updated.schemeDetails = `Buy 10 Get 1 Free (${updated.freeQuantity} free)`;
        } else if (qty >= 10) {
          updated.freeQuantity = 1;
          updated.schemeDetails = "Buy 10 Get 1 Free (1 free)";
        } else {
          updated.freeQuantity = 0;
          updated.schemeDetails = "";
        }
      }

      return updated;
    }));
  }, []);

  // Compute Invoice Subtotal / Tax
  const calculations = useMemo(() => {
    let subtotal = 0;
    let discount = 0;
    let gst = 0;

    lines.forEach((l) => {
      const lineSubtotal = l.quantity * l.ptrPaisa;
      const lineDisc = Math.round(lineSubtotal * (l.discountPercent / 100));
      const lineTaxable = lineSubtotal - lineDisc;
      const lineGst = Math.round(lineTaxable * (l.gstRate / 100));

      subtotal += lineSubtotal;
      discount += lineDisc;
      gst += lineGst;
    });

    const total = subtotal - discount + gst;

    return {
      subtotalPaisa: subtotal,
      discountPaisa: discount,
      gstPaisa: gst,
      totalPaisa: total,
    };
  }, [lines]);

  // Credit Limit Check
  const creditBlocked = useMemo(() => {
    if (!selectedParty || paymentMode !== "credit") return false;
    if (selectedParty.creditLimitPaisa === 0) return false;
    
    const nextOutstanding = selectedParty.outstandingPaisa + calculations.totalPaisa;
    return nextOutstanding > selectedParty.creditLimitPaisa;
  }, [selectedParty, paymentMode, calculations.totalPaisa]);

  // Form Submission Action
  const handleBillSave = () => {
    if (!selectedPartyId) {
      setBillingError("Please select a Retail Chemist Party");
      return;
    }
    if (lines.length === 0) {
      setBillingError("Please add at least one stock item lot to bill");
      return;
    }
    if (creditBlocked) {
      setBillingError("Credit Billing BLOCKED! Outstanding exceeds retailer's credit limit.");
      return;
    }

    setBillingError(null);
    setBillingSuccess(null);

    startTransition(async () => {
      const result = await createB2BSaleAction({
        partyId: selectedPartyId,
        salesmanId: selectedSalesmanId || undefined,
        paymentMode,
        invoiceType,
        notes: notes || undefined,
        items: lines.map((l) => ({
          inventoryId: l.inventoryId,
          quantity: l.quantity,
          freeQuantity: l.freeQuantity,
          saleRatePaisa: l.ptrPaisa,
          discountPercent: l.discountPercent,
          schemeDetails: l.schemeDetails || undefined,
        })),
      });

      if (result.success) {
        setBillingSuccess(`B2B POS ${invoiceType === "challan" ? "Delivery Challan" : "Invoice"} generated successfully!`);
        setGeneratedInvoiceNo(result.invoiceNo || null);
        // Clear Pos
        setLines([]);
        setSelectedPartyId("");
        setSelectedSalesmanId("");
        setNotes("");
      } else {
        setBillingError(result.error || "Failed to book wholesale invoice");
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] min-w-0 w-full animate-fade-in no-print">
      
      {/* Left panel: Product Selector & Lines Table */}
      <div className="glass-card p-4 sm:p-5 space-y-5">
        <div className="flex flex-col sm:flex-row gap-4">
          
          {/* Party selector */}
          <label className="flex-1 block space-y-1">
            <span className="text-xs font-semibold text-slate-500">Retail Chemist (Party) *</span>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green bg-white font-semibold text-slate-800"
            >
              <option value="">Choose Retailer Party</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.gstin ? `(GST: ${p.gstin})` : "(Unregistered)"}
                </option>
              ))}
            </select>
          </label>

          {/* Salesman selector */}
          <label className="flex-1 block space-y-1">
            <span className="text-xs font-semibold text-slate-500">Booking Executive (Salesman)</span>
            <select
              value={selectedSalesmanId}
              onChange={(e) => setSelectedSalesmanId(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green bg-white font-medium text-slate-800"
            >
              <option value="">Office Direct Billing</option>
              {salesmen.map((sm) => (
                <option key={sm.id} value={sm.id}>{sm.name}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Product Autocomplete Search */}
        <div className="relative space-y-1">
          <span className="text-xs font-semibold text-slate-500">Wholesale Search (Type drug name or batch no)</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-lg border-2 border-slate-200 px-4 text-sm focus:outline-none focus:border-med-green bg-slate-50 focus:bg-white transition-all font-semibold"
            placeholder="Search and add batches e.g. Azithral,GP1251..."
          />

          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg space-y-0.5 animate-scale-in">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addLine(item)}
                  disabled={item.quantity <= 0}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-xs hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{item.medicine.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Batch: {item.batchNo} • Exp: {item.expiryDate}</p>
                  </div>
                  <div className="text-right font-mono font-semibold">
                    <p className="text-slate-700 text-sm">PTR: {formatCurrency(item.ptrPaisa > 0 ? item.ptrPaisa : item.saleRatePaisa)}</p>
                    <p className={`text-[10px] ${item.quantity <= 10 ? "text-orange-500 font-bold" : "text-slate-400"}`}>Stock: {item.quantity}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Invoicing Lines Table */}
        <div className="overflow-hidden rounded-xl border border-slate-100 shadow-xs">
          <table className="w-full text-left text-xs border-collapse bg-white">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 font-display font-bold text-slate-500 uppercase tracking-wider text-[9px]">
                <th className="px-3 py-3 w-[35%]">Medicine Batch</th>
                <th className="px-3 py-3 text-right w-[15%]">Qty (Lot)</th>
                <th className="px-3 py-3 text-right w-[15%]">Free Qty</th>
                <th className="px-3 py-3 text-right w-[15%]">PTR Rate</th>
                <th className="px-3 py-3 text-right w-[10%]">Disc %</th>
                <th className="px-3 py-3 text-right w-[15%]">Total</th>
                <th className="px-3 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {lines.map((line, idx) => {
                const totalItemDeduction = line.quantity + line.freeQuantity;
                const lineTotalPaisa = (line.quantity * line.ptrPaisa) - Math.round((line.quantity * line.ptrPaisa) * (line.discountPercent / 100));

                return (
                  <tr key={line.inventoryId} className="hover:bg-slate-50/40">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-800 text-sm">{line.medicineName}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Batch: {line.batchNo} • Exp: {line.expiryDate}</p>
                      {line.schemeDetails ? (
                        <span className="inline-block mt-1 text-[8px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-1 rounded">
                          {line.schemeDetails}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min="1"
                        max={line.availableStock}
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, "quantity", Math.min(Number(e.target.value), line.availableStock))}
                        className="h-8 w-14 rounded border border-slate-300 px-1 text-center font-bold font-mono focus:outline-med-green bg-slate-50 focus:bg-white"
                      />
                      <p className="text-[9px] text-slate-400 font-semibold mt-1">Avail: {line.availableStock}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800 text-sm">
                      {line.freeQuantity}
                      <p className="text-[9px] text-slate-400 font-semibold mt-1">Deduct: {totalItemDeduction}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min="0"
                        value={line.ptrPaisa / 100}
                        onChange={(e) => updateLine(idx, "ptrPaisa", Math.round(Number(e.target.value) * 100))}
                        className="h-8 w-16 rounded border border-slate-300 px-1 text-center font-semibold font-mono focus:outline-med-green bg-slate-50 focus:bg-white"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={line.discountPercent}
                        onChange={(e) => updateLine(idx, "discountPercent", Math.min(Number(e.target.value), 100))}
                        className="h-8 w-10 rounded border border-slate-300 px-1 text-center font-semibold font-mono focus:outline-med-green bg-slate-50 focus:bg-white"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800 text-sm">
                      {formatCurrency(lineTotalPaisa)}
                      <p className="text-[9px] text-slate-400 font-semibold mt-1">GST: {line.gstRate}%</p>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700 transition-colors p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No items selected. Search and add wholesale lots above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right panel: Summary, Pricing toggles, billing triggers */}
      <div className="space-y-6">
        
        {/* Billing parameters */}
        <div className="glass-card p-4 sm:p-5 space-y-4">
          <h2 className="font-display text-base font-bold text-med-navy flex items-center gap-2 border-b border-slate-100 pb-2">
            <ShoppingCart className="h-5 w-5 text-med-green" /> Bill Parameters
          </h2>

          <div className="space-y-3.5">
            {/* Invoice type */}
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Billing Category</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setInvoiceType("invoice")}
                  className={`h-9 rounded-lg font-semibold text-xs border ${
                    invoiceType === "invoice"
                      ? "bg-med-navy text-white border-med-navy"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Sales Invoice
                </button>
                <button
                  onClick={() => setInvoiceType("challan")}
                  className={`h-9 rounded-lg font-semibold text-xs border ${
                    invoiceType === "challan"
                      ? "bg-med-navy text-white border-med-navy"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Delivery Challan
                </button>
              </div>
            </div>

            {/* Payment mode */}
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Payment Mode</span>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green bg-white font-semibold text-slate-700"
              >
                <option value="credit">On Trade Credit</option>
                <option value="cash">Cash Payment</option>
                <option value="upi">UPI / QR Scan</option>
                <option value="cheque">Bank Cheque</option>
              </select>
            </div>

            {/* Remarks */}
            <label className="block space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Remarks / Delivery Notes</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green"
                placeholder="Remarks..."
              />
            </label>
          </div>
        </div>

        {/* Retailer Credit Guard */}
        {selectedParty && (
          <div className={`p-4 rounded-xl border space-y-2 animate-fade-in ${
            creditBlocked
              ? "bg-red-50 border-red-100 text-red-950"
              : (selectedParty.outstandingPaisa >= selectedParty.creditLimitPaisa * 0.8
                ? "bg-orange-50 border-orange-100 text-orange-950"
                : "bg-emerald-50 border-emerald-100 text-emerald-950")
          }`}>
            <h3 className="font-display font-bold text-sm flex items-center gap-1.5">
              <AlertCircle className={`h-4.5 w-4.5 ${creditBlocked ? "text-red-600" : "text-emerald-600"}`} />
              Retailer Credit Guard
            </h3>
            <div className="text-xs space-y-1">
              <p>• Party Name: <strong className="font-bold">{selectedParty.name}</strong></p>
              <p>• Ledger Outstanding: <strong className="font-bold font-mono">{formatCurrency(selectedParty.outstandingPaisa)}</strong></p>
              <p>• Max Credit Limit: <strong className="font-bold font-mono">{selectedParty.creditLimitPaisa > 0 ? formatCurrency(selectedParty.creditLimitPaisa) : "Unlimited"}</strong></p>
            </div>
            {creditBlocked && (
              <p className="text-[10px] font-bold text-red-700 bg-red-100/50 p-2 rounded border border-red-200 mt-1">
                🛑 LIMIT BLOCKED! This transaction exceeds maximum credit capacity. Choose CASH payment or clear outstanding.
              </p>
            )}
          </div>
        )}

        {/* Invoice Summary */}
        <div className="glass-card p-4 sm:p-5 space-y-4">
          <h2 className="font-display text-base font-bold text-med-navy flex items-center gap-2 border-b border-slate-100 pb-2">
            <FileText className="h-5 w-5 text-med-green" /> Bill Summary
          </h2>

          <div className="space-y-2 text-xs font-semibold text-slate-500">
            <div className="flex justify-between items-center">
              <span>Wholesale Subtotal</span>
              <span className="font-mono text-slate-800">{formatCurrency(calculations.subtotalPaisa)}</span>
            </div>
            <div className="flex justify-between items-center text-red-500">
              <span>Schemes Discount (-)</span>
              <span className="font-mono">{formatCurrency(calculations.discountPaisa)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>CGST / SGST Tax (+)</span>
              <span className="font-mono text-slate-800">{formatCurrency(calculations.gstPaisa)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-base font-bold text-med-navy">
              <span>NET PAYABLE</span>
              <span className="font-mono text-emerald-600">{formatCurrency(calculations.totalPaisa)}</span>
            </div>
          </div>

          {billingError ? <p className="rounded-lg bg-red-50 p-2.5 text-xs font-bold text-red-700">{billingError}</p> : null}
          {billingSuccess ? <p className="rounded-lg bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700">{billingSuccess}</p> : null}

          {generatedInvoiceNo && (
            <button
              onClick={() => window.print()}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition-all text-xs"
            >
              <Printer className="h-4 w-4 text-slate-500" /> Print invoice ({generatedInvoiceNo})
            </button>
          )}

          <button
            onClick={handleBillSave}
            disabled={isPending || creditBlocked}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-med-green font-bold text-white shadow-md hover:bg-med-greenDark active:scale-95 transition-all text-sm disabled:opacity-50"
          >
            {isPending ? "Booking wholesale..." : `Book B2B ${invoiceType === "challan" ? "Challan" : "Invoice"}`}
          </button>
        </div>

      </div>

    </div>
  );
}
