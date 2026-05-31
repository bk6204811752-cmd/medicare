"use client";


import { useState, useTransition, useMemo, useEffect, useCallback, useRef } from "react";
import { AlertCircle, FileText, ShoppingCart, Plus, Trash2, User, UserCheck, ShieldCheck, Printer, CheckCircle2, Search, X, Send, Loader2, Sparkles } from "lucide-react";
import { createB2BSaleAction } from "@/app/stockist-actions";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

type Party = {
  id: string;
  name: string;
  phone: string | null;
  gstin: string | null;
  drugLicenseNo: string | null;
  creditLimitPaisa: number;
  outstandingPaisa: number;
  routeId?: string | null;
  address?: string | null;
};

type Salesman = {
  id: string;
  name: string;
  routeIds?: string[];
};

type InventoryItem = {
  id: string;
  batchNo: string;
  mfgDate: string | null;
  expiryDate: string;
  quantity: number;
  ptrPaisa: number;
  saleRatePaisa: number;
  mrpPaisa: number;
  hsnCode: string;
  rackLocation: string | null;
  medicine: {
    id: string;
    name: string;
    composition: string | null;
    gstRate: number;
    manufacturer: string;
    packSize: string;
    hsnCode: string;
  };
};

type InvoiceLine = {
  inventoryId: string;
  medicineName: string;
  batchNo: string;
  mfgDate: string | null;
  expiryDate: string;
  quantity: number;
  freeQuantity: number;
  ptrPaisa: number;
  mrpPaisa: number;
  discountPercent: number;
  gstRate: number;
  hsnCode: string;
  manufacturer: string;
  packSize: string;
  schemeDetails: string;
  availableStock: number;
};

function calculateFreeQuantity(qty: number, availableStock: number): { freeQty: number; schemeDetails: string } {
  let freeQty = 0;
  let schemeDetails = "";
  
  if (qty >= 50) {
    freeQty = Math.floor(qty / 10);
    schemeDetails = `Buy 10 Get 1 Free (${freeQty} free)`;
  } else if (qty >= 10) {
    freeQty = 1;
    schemeDetails = "Buy 10 Get 1 Free (1 free)";
  }
  
  // Cap free quantity to prevent insufficient stock error
  const maxFree = Math.max(0, availableStock - qty);
  if (freeQty > maxFree) {
    freeQty = maxFree;
    if (freeQty > 0) {
      schemeDetails = `Buy 10 Get 1 Free (Capped to ${freeQty} due to stock)`;
    } else {
      schemeDetails = "";
    }
  }
  
  return { freeQty, schemeDetails };
}

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
  const [drugMasterHits, setDrugMasterHits] = useState<any[]>([]);
  const [loadingDrugMaster, setLoadingDrugMaster] = useState(false);

  // Searchable party autocomplete combobox states
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showAllPartiesOverride, setShowAllPartiesOverride] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Premium B2B Invoice & Receipt print modal states
  const [completedInvoice, setCompletedInvoice] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printFormat, setPrintFormat] = useState<"a4" | "thermal">("a4");
  
  const [isPending, startTransition] = useTransition();
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingSuccess, setBillingSuccess] = useState<string | null>(null);
  const [generatedInvoiceNo, setGeneratedInvoiceNo] = useState<string | null>(null);

  // Find routes assigned to the selected Salesman
  const selectedSalesman = useMemo(() => {
    return salesmen.find((s) => s.id === selectedSalesmanId) || null;
  }, [salesmen, selectedSalesmanId]);

  // Load selected party outstanding/credit
  const selectedParty = useMemo(() => {
    return parties.find((p) => p.id === selectedPartyId) || null;
  }, [parties, selectedPartyId]);

  // Load indent if present in search params
  const searchParams = useSearchParams();
  const indentId = searchParams?.get("indentId") || "";

  useEffect(() => {
    if (!indentId) return;

    const loadIndent = async () => {
      try {
        const res = await fetch(`/api/stockist/indents?indentId=${encodeURIComponent(indentId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load indent");

        const indent = json.data;
        if (!indent) return;

        // 1. Try to find a matching retailer party in our parties list by name similarity
        const matchingParty = parties.find((p) => 
          p.name.toLowerCase().includes(indent.chemistName.toLowerCase()) ||
          indent.chemistName.toLowerCase().includes(p.name.toLowerCase())
        );

        if (matchingParty) {
          setSelectedPartyId(matchingParty.id);
          setPartySearchQuery(matchingParty.name);
          toast.success(`🎉 Auto-selected retailer party: ${matchingParty.name}`);
        } else {
          toast.warning(`Indent loaded! Retailer "${indent.chemistName}" was not found in your registered Parties list. Please choose or register them.`);
        }

        // 2. Map indent medicines to current inventory batches
        const newLines: InvoiceLine[] = [];
        indent.items.forEach((item: any) => {
          // Find first inventory item that matches medicine name (inventory is sorted FEFO!)
          const matchedInv = inventory.find((inv) => 
            inv.medicine.name.toLowerCase() === item.medicineName.toLowerCase()
          );

          if (matchedInv) {
            const requestedQty = Math.min(item.quantity, matchedInv.quantity);
            const { freeQty, schemeDetails } = calculateFreeQuantity(requestedQty, matchedInv.quantity);
            newLines.push({
              inventoryId: matchedInv.id,
              medicineName: matchedInv.medicine.name,
              batchNo: matchedInv.batchNo,
              mfgDate: matchedInv.mfgDate || null,
              expiryDate: matchedInv.expiryDate,
              quantity: requestedQty,
              freeQuantity: freeQty,
              ptrPaisa: matchedInv.ptrPaisa > 0 ? matchedInv.ptrPaisa : matchedInv.saleRatePaisa,
              mrpPaisa: matchedInv.mrpPaisa,
              discountPercent: 0,
              gstRate: matchedInv.medicine.gstRate,
              hsnCode: matchedInv.hsnCode || matchedInv.medicine.hsnCode || "",
              manufacturer: matchedInv.medicine.manufacturer || "",
              packSize: matchedInv.medicine.packSize || "",
              schemeDetails: schemeDetails,
              availableStock: matchedInv.quantity,
            });
          } else {
            toast.error(`❌ Out of Stock: "${item.medicineName}" (Requested qty: ${item.quantity}) is not in your warehouse.`);
          }
        });

        if (newLines.length > 0) {
          setLines(newLines);
          toast.success(`✅ Mapped ${newLines.length} medicines to B2B POS lines using FEFO sequences!`);
        }
      } catch (err: any) {
        console.error("Auto-indent bridge error:", err);
        toast.error(err.message || "Failed to parse chemist B2B indent.");
      }
    };

    loadIndent();
  }, [indentId, parties, inventory]);



  // Reset party selection search input if cleared or synced
  useEffect(() => {
    if (selectedParty) {
      setPartySearchQuery(selectedParty.name);
    } else {
      setPartySearchQuery("");
    }
  }, [selectedPartyId, selectedParty]);

  // Dynamic filter: route-wise filtering with optional override
  const filteredParties = useMemo(() => {
    let list = [...parties];

    // Filter by salesman beats if a salesman is selected and override is not active
    if (selectedSalesman && selectedSalesman.routeIds && selectedSalesman.routeIds.length > 0 && !showAllPartiesOverride) {
      list = list.filter((p) => p.routeId && selectedSalesman.routeIds?.includes(p.routeId));
    }

    // Filter by text search query
    if (partySearchQuery.trim()) {
      const q = partySearchQuery.toLowerCase();
      // Keep selected party in list, otherwise apply filter
      list = list.filter((p) => 
        p.id === selectedPartyId ||
        p.name.toLowerCase().includes(q) || 
        (p.phone && p.phone.toLowerCase().includes(q)) || 
        (p.gstin && p.gstin.toLowerCase().includes(q))
      );
    }

    return list;
  }, [parties, selectedSalesman, showAllPartiesOverride, partySearchQuery, selectedPartyId]);

  // Product Autocomplete (Local Stocks + Drug Master suggestions fallback)
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setDrugMasterHits([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = inventory.filter((item) => 
      item.medicine.name.toLowerCase().includes(q) || 
      item.batchNo.toLowerCase().includes(q) ||
      (item.medicine.composition || "").toLowerCase().includes(q)
    ).slice(0, 8);
    setSearchResults(filtered);

    // Fetch from central drug master for suggestions if query is at least 2 chars
    setLoadingDrugMaster(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/drug-master/search?q=${encodeURIComponent(searchQuery)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((json) => {
          // Filter out items already matched locally in searchResults
          const existingNames = new Set(filtered.map(item => item.medicine.name.toLowerCase()));
          const hits = (json.data || []).filter((h: any) => !existingNames.has(h.name.toLowerCase())).slice(0, 5);
          setDrugMasterHits(hits);
          setLoadingDrugMaster(false);
        })
        .catch(() => setLoadingDrugMaster(false));
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, inventory]);

  const addLine = useCallback((item: InventoryItem) => {
    // Avoid duplicate lines for the same batch
    const existing = lines.find((l) => l.inventoryId === item.id);
    if (existing) {
      setSearchQuery("");
      setSearchResults([]);
      return;
    }

    const defaultQty = Math.min(10, item.quantity);
    const { freeQty, schemeDetails } = calculateFreeQuantity(defaultQty, item.quantity);

    setLines((prev) => [
      ...prev,
      {
        inventoryId: item.id,
        medicineName: item.medicine.name,
        batchNo: item.batchNo,
        mfgDate: item.mfgDate || null,
        expiryDate: item.expiryDate,
        quantity: defaultQty,
        freeQuantity: freeQty,
        ptrPaisa: item.ptrPaisa > 0 ? item.ptrPaisa : item.saleRatePaisa,
        mrpPaisa: item.mrpPaisa,
        discountPercent: 0,
        gstRate: item.medicine.gstRate,
        hsnCode: item.hsnCode || item.medicine.hsnCode || "",
        manufacturer: item.medicine.manufacturer || "",
        packSize: item.medicine.packSize || "",
        schemeDetails: schemeDetails,
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
        const { freeQty, schemeDetails } = calculateFreeQuantity(qty, line.availableStock);
        updated.freeQuantity = freeQty;
        updated.schemeDetails = schemeDetails;
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
        // Capture a rich B2B Invoice snapshot for printing before clearing inputs
        const activeParty = parties.find((p) => p.id === selectedPartyId);
        
        const snapshotItems = lines.map((l) => ({
          medicineName: l.medicineName,
          batchNo: l.batchNo,
          hsnCode: l.hsnCode,
          manufacturer: l.manufacturer,
          mfgDate: l.mfgDate,
          expiryDate: l.expiryDate,
          packSize: l.packSize,
          quantity: l.quantity,
          freeQuantity: l.freeQuantity,
          ptrPaisa: l.ptrPaisa,
          mrpPaisa: l.mrpPaisa,
          discountPercent: l.discountPercent,
          gstRate: l.gstRate,
          totalItemDeduction: l.quantity + l.freeQuantity,
          lineTotalPaisa: (l.quantity * l.ptrPaisa) - Math.round((l.quantity * l.ptrPaisa) * (l.discountPercent / 100)),
        }));

        setCompletedInvoice({
          invoiceNo: result.invoiceNo || `INV-${Date.now()}`,
          invoiceType: invoiceType,
          date: new Date().toISOString(),
          paymentMode: paymentMode,
          notes: notes || undefined,
          partyName: activeParty?.name || "Retail Chemist",
          partyPhone: activeParty?.phone || null,
          partyGstin: activeParty?.gstin || null,
          partyDl: activeParty?.drugLicenseNo || null,
          partyAddress: activeParty?.address || null,
          salesmanName: salesmen.find((s) => s.id === selectedSalesmanId)?.name || undefined,
          items: snapshotItems,
          calculations: { ...calculations },
        });
        setShowPrintModal(true);

        setBillingSuccess(`B2B POS ${invoiceType === "challan" ? "Delivery Challan" : "Invoice"} generated successfully!`);
        setGeneratedInvoiceNo(result.invoiceNo || null);
        
        // Clear Pos
        setLines([]);
        setSelectedPartyId("");
        setPartySearchQuery("");
        setSelectedSalesmanId("");
        setNotes("");
      } else {
        setBillingError(result.error || "Failed to book wholesale invoice");
      }
    });
  };

  // Close party dropdown on outside click & global hotkeys
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node)) {
        setShowPartyDropdown(false);
      }
    }

    function handleGlobalKeyDown(e: KeyboardEvent) {
      // Focus search on '/'
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "SELECT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Save & Book Bill on F8
      if (e.key === "F8") {
        if (lines.length > 0 && !isPending && !creditBlocked) {
          e.preventDefault();
          handleBillSave();
        }
      }
    }

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isPending, creditBlocked, lines, selectedPartyId, selectedSalesmanId, paymentMode, invoiceType, notes]);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] min-w-0 w-full animate-fade-in no-print">
      
      {/* Left panel: Product Selector & Lines Table */}
      <div className="glass-card p-4 sm:p-5 space-y-5">
        <div className="flex flex-col sm:flex-row gap-4">
          
          {/* Party selector (Searchable Autocomplete Combobox) */}
          <div className="flex-1 block space-y-1 relative" ref={partyDropdownRef}>
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">🏫 Retail Chemist (Party) <span className="text-red-500">*</span></span>
            <div className="relative">
              <input
                type="text"
                placeholder="Search chemist party name or phone..."
                value={partySearchQuery}
                onFocus={() => setShowPartyDropdown(true)}
                onChange={(e) => {
                  setPartySearchQuery(e.target.value);
                  setShowPartyDropdown(true);
                  if (!e.target.value.trim()) {
                    setSelectedPartyId("");
                  }
                }}
                className="h-11 w-full rounded-lg border-2 border-slate-200 px-3 pr-24 text-sm focus:outline-none focus:border-emerald-500 bg-white font-bold text-slate-800 shadow-xs transition-all placeholder:text-slate-400"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {selectedParty ? (
                  <span className="text-emerald-700 font-extrabold text-[9px] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shadow-3xs">✓ Connected</span>
                ) : (
                  <Search className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </div>

            {/* Autocomplete Dropdown List */}
            {showPartyDropdown && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl space-y-1 animate-scale-in">
                {filteredParties.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPartyId(p.id);
                      setPartySearchQuery(p.name);
                      setShowPartyDropdown(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-xs transition-all hover:bg-slate-50 ${
                      selectedPartyId === p.id ? "bg-emerald-50/50 border border-emerald-100 font-bold" : "border border-transparent"
                    }`}
                  >
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm">{p.name}</p>
                      <p className="text-[10px] text-slate-455 mt-0.5 font-semibold flex items-center gap-2">
                        {p.phone ? `📞 ${p.phone}` : "No contact"} • {p.gstin ? `GST: ${p.gstin}` : "Unregistered"}
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 font-mono">
                      <p>Limit: {p.creditLimitPaisa > 0 ? formatCurrency(p.creditLimitPaisa) : "Unlimited"}</p>
                      <p className={p.outstandingPaisa > 0 ? "text-rose-600 font-black" : ""}>
                        Due: {formatCurrency(p.outstandingPaisa)}
                      </p>
                    </div>
                  </button>
                ))}

                {filteredParties.length === 0 && (
                  <div className="p-3 text-center text-slate-450 text-xs font-semibold">
                    No matching Retailer Parties found.
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Beat/Route Filter Indicator */}
            {selectedSalesman && (
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mt-1 px-1">
                <span className="text-slate-400 flex items-center gap-0.5">
                  📍 Showing {selectedSalesman.name}'s Beats ({selectedSalesman.routeIds?.length || 0})
                </span>
                <label className="flex items-center gap-1 cursor-pointer text-emerald-600 hover:underline">
                  <input
                    type="checkbox"
                    checked={showAllPartiesOverride}
                    onChange={(e) => setShowAllPartiesOverride(e.target.checked)}
                    className="rounded border-slate-350 text-emerald-600 focus:ring-emerald-500 h-3 w-3"
                  />
                  Show all routes
                </label>
              </div>
            )}
          </div>

          {/* Salesman selector */}
          <label className="flex-1 block space-y-1">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">👤 Booking Executive (Salesman)</span>
            <select
              value={selectedSalesmanId}
              onChange={(e) => {
                setSelectedSalesmanId(e.target.value);
                setShowAllPartiesOverride(false); // Reset override on salesman change to prioritize route filter
              }}
              className="h-11 w-full rounded-lg border-2 border-slate-200 px-3 text-sm focus:outline-none focus:border-emerald-500 bg-white font-bold text-slate-800 shadow-xs transition-all"
            >
              <option value="">Office Direct Billing</option>
              {salesmen.map((sm) => (
                <option key={sm.id} value={sm.id}>{sm.name}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Selected Chemist Rich Badge Card */}
        {selectedParty && (
          <div className="p-4 bg-gradient-to-br from-emerald-50/40 to-teal-50/20 rounded-xl border border-emerald-100/70 shadow-xs flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-600 items-center animate-scale-in">
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-4.5 w-4.5 text-emerald-600" />
              <span>Retail Chemist: <strong className="text-slate-900 font-extrabold text-sm">{selectedParty.name}</strong></span>
            </div>
            {selectedParty.phone && (
              <span>📞 Phone: <strong className="text-slate-800 font-extrabold font-mono">{selectedParty.phone}</strong></span>
            )}
            <span>🪪 GSTIN: <strong className="text-slate-800 font-extrabold font-mono">{selectedParty.gstin || "URP (Unregistered)"}</strong></span>
            {selectedParty.drugLicenseNo && (
              <span>📜 DL No: <strong className="text-slate-800 font-extrabold font-mono">{selectedParty.drugLicenseNo}</strong></span>
            )}
          </div>
        )}

        {/* Product Autocomplete Search */}
        <div className="relative space-y-1">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">📦 Wholesale Search (Type drug name or batch no)</span>
          <div className="relative">
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-lg border-2 border-slate-200 px-4 pl-10 pr-20 text-sm focus:outline-none focus:border-emerald-500 bg-slate-50 focus:bg-white transition-all font-bold text-slate-850 shadow-xs"
              placeholder="Search and add batches e.g. Azithral, GP1251..."
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
            <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[9px] font-mono font-black text-slate-400 bg-slate-100 border border-slate-250 rounded shadow-3xs">/ key</kbd>
          </div>

          {(searchResults.length > 0 || drugMasterHits.length > 0) && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl space-y-3 animate-scale-in">
              {/* Local Warehouse Inventory Stocks */}
              {searchResults.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[9px] font-extrabold text-slate-400 bg-slate-50 rounded uppercase tracking-wider">
                    In-Stock Batches
                  </div>
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addLine(item)}
                      disabled={item.quantity <= 0}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-all hover:bg-emerald-50/50 disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      <div>
                        <p className="font-extrabold text-slate-900 text-sm">
                          {item.medicine.name}
                          {item.medicine.manufacturer && (
                            <span className="text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded ml-2 font-bold uppercase tracking-wider">
                              {item.medicine.manufacturer}
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono font-semibold mt-0.5">Batch: {item.batchNo} • Exp: {item.expiryDate}</p>
                      </div>
                      <div className="text-right font-mono font-semibold">
                        <p className="text-slate-800 font-extrabold text-xs">PTR: {formatCurrency(item.ptrPaisa > 0 ? item.ptrPaisa : item.saleRatePaisa)}</p>
                        <p className={`text-[10px] ${item.quantity <= 10 ? "text-orange-600 font-black animate-pulse" : "text-slate-450"}`}>Stock: {item.quantity}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Central Database suggestions fallback for out-of-stock items */}
              {drugMasterHits.length > 0 && (
                <div className="space-y-1 border-t border-slate-100 pt-2">
                  <div className="px-2.5 py-1 text-[9px] font-extrabold text-slate-400 bg-slate-50 rounded uppercase tracking-wider flex items-center justify-between">
                    <span>Central Drug Suggestions</span>
                    <span className="text-[8px] text-orange-600 bg-orange-50 px-1.5 rounded font-black border border-orange-100/30 uppercase tracking-wider">Out of Stock</span>
                  </div>
                  {drugMasterHits.map((hit) => (
                    <button
                      key={hit.id}
                      onClick={() => {
                        toast.warning(
                          <div className="space-y-2 p-1 text-xs text-slate-800">
                            <p className="font-extrabold text-slate-900">⚠️ Medicine Out of Stock / Unregistered</p>
                            <p className="text-slate-550 font-semibold leading-relaxed">
                              <strong>{hit.name}</strong> is not present in your wholesale stock. To bill this item to a retailer, please record a Purchase Entry first.
                            </p>
                            <div className="pt-1">
                              <a
                                href="/stockist/inventory/add"
                                className="inline-flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-[10px] font-black text-white shadow-xs hover:shadow-emerald-500/20 transition-all no-underline"
                              >
                                ➕ Go to Purchase Entry / Add Stock
                              </a>
                            </div>
                          </div>,
                          { duration: 8000 }
                        );
                        setSearchQuery("");
                        setDrugMasterHits([]);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-all hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-extrabold text-slate-850 text-sm truncate">{hit.name}</p>
                        <p className="text-[10px] text-slate-450 truncate font-semibold">Composition: {hit.composition || "Generic composition unknown"}</p>
                      </div>
                      <div className="text-right text-[10px] font-mono font-semibold text-slate-400 shrink-0">
                        <p>MRP: {formatCurrency(hit.mrpPaisa || 0)}</p>
                        <p className="text-red-500 font-extrabold">Qty: 0</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Invoicing Lines Table */}
        <div className="overflow-hidden rounded-xl border border-slate-100 shadow-xs">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse bg-white min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 font-display font-bold text-slate-500 uppercase tracking-wider text-[9px]">
                <th className="px-3 py-3 w-[22%]">Medicine Name</th>
                <th className="px-3 py-3 w-[10%]">Batch No.</th>
                <th className="px-3 py-3 w-[8%]">HSN</th>
                <th className="px-3 py-3 w-[12%]">Manufacturer</th>
                <th className="px-3 py-3 w-[8%]">Mfg Date</th>
                <th className="px-3 py-3 w-[8%]">Expiry</th>
                <th className="px-3 py-3 w-[6%]">Pack</th>
                <th className="px-3 py-3 text-right w-[8%]">Qty</th>
                <th className="px-3 py-3 text-right w-[5%]">Free</th>
                <th className="px-3 py-3 text-right w-[8%]">PTR Rate</th>
                <th className="px-3 py-3 text-right w-[5%]">Disc%</th>
                <th className="px-3 py-3 text-right w-[8%]">Total</th>
                <th className="px-3 py-3 text-center w-[4%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {lines.map((line, idx) => {
                const totalItemDeduction = line.quantity + line.freeQuantity;
                const lineTotalPaisa = (line.quantity * line.ptrPaisa) - Math.round((line.quantity * line.ptrPaisa) * (line.discountPercent / 100));

                return (
                  <tr key={line.inventoryId} className="hover:bg-slate-50/40">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-800 text-xs leading-tight">{line.medicineName}</p>
                      {line.schemeDetails ? (
                        <span className="inline-block mt-1 text-[8px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-1 rounded">
                          {line.schemeDetails}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{line.batchNo}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-600">{line.hsnCode || "—"}</td>
                    <td className="px-3 py-2.5 text-[10px] text-slate-600 leading-tight max-w-[100px]">
                      <span className="block truncate">{line.manufacturer || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-slate-500">{line.mfgDate || "—"}</td>
                    <td className="px-3 py-2.5 text-[10px] text-slate-500">{line.expiryDate}</td>
                    <td className="px-3 py-2.5 text-[10px] text-slate-600">{line.packSize || "—"}</td>
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
                      <p className="text-[9px] text-slate-400 font-semibold mt-1">MRP: ₹{(line.mrpPaisa/100).toFixed(0)}</p>
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
                  <td colSpan={13} className="py-12 text-center bg-slate-50/15">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3.5">
                      <div className="rounded-full bg-slate-100 p-4 text-slate-400 border border-dashed border-slate-200">
                        <ShoppingCart className="h-8 w-8 stroke-[1.5]" />
                      </div>
                      <div>
                        <h4 className="font-display font-black text-slate-800 text-sm">No items in B2B Invoice yet</h4>
                        <p className="text-xs text-slate-550 font-semibold mt-1">Search and select inventory lots above to build the wholesale bill.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center pt-2">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border text-[10px] font-bold text-slate-500 flex items-center gap-1.5"><kbd className="font-mono text-[9px] bg-white border px-1.5 rounded shadow-3xs font-black text-slate-800">/</kbd> Search Medicines</span>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 border text-[10px] font-bold text-slate-500 flex items-center gap-1.5"><kbd className="font-mono text-[9px] bg-white border px-1.5 rounded shadow-3xs font-black text-slate-800">F8</kbd> Book Wholesale Bill</span>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
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
          <div className={`p-4.5 rounded-2xl border-2 space-y-3.5 animate-fade-in ${
            creditBlocked
              ? "bg-red-50/80 border-red-200 text-red-950 shadow-xs"
              : (selectedParty.outstandingPaisa >= selectedParty.creditLimitPaisa * 0.8
                ? "bg-orange-50/80 border-orange-200 text-orange-950 shadow-xs"
                : "bg-emerald-50/80 border-emerald-200 text-emerald-950 shadow-xs")
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className={`h-4.5 w-4.5 ${creditBlocked ? "text-red-600 animate-bounce" : "text-emerald-600"}`} />
                Retailer Credit Guard
              </h3>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                creditBlocked 
                  ? "bg-red-200 text-red-850" 
                  : (selectedParty.outstandingPaisa >= selectedParty.creditLimitPaisa * 0.8 
                    ? "bg-orange-200 text-orange-850 animate-pulse" 
                    : "bg-emerald-200 text-emerald-850")
              }`}>
                {creditBlocked ? "Credit Exceeded" : (selectedParty.outstandingPaisa >= selectedParty.creditLimitPaisa * 0.8 ? "Near Credit Limit" : "Credit Safe")}
              </span>
            </div>
            
            <div className="text-xs space-y-2.5 font-semibold">
              <div className="grid grid-cols-2 gap-2 leading-tight">
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase">Outstanding Balance</span>
                  <span className={`font-mono font-bold text-sm ${selectedParty.outstandingPaisa > 0 ? "text-slate-800" : "text-slate-500"}`}>{formatCurrency(selectedParty.outstandingPaisa)}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase">Max Credit Limit</span>
                  <span className="font-mono text-slate-850 font-bold text-sm">{selectedParty.creditLimitPaisa > 0 ? formatCurrency(selectedParty.creditLimitPaisa) : "Unlimited"}</span>
                </div>
              </div>

              {selectedParty.creditLimitPaisa > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-slate-405 uppercase font-extrabold">
                    <span>Credit Utilization</span>
                    <span>{Math.min(100, Math.round((selectedParty.outstandingPaisa / selectedParty.creditLimitPaisa) * 100))}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden border">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        creditBlocked ? "bg-red-500" : (selectedParty.outstandingPaisa >= selectedParty.creditLimitPaisa * 0.8 ? "bg-orange-500" : "bg-emerald-500")
                      }`} 
                      style={{ width: `${Math.min(100, (selectedParty.outstandingPaisa / selectedParty.creditLimitPaisa) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            {creditBlocked && (
              <p className="text-[10px] font-bold text-red-700 bg-red-150 p-2 rounded border border-red-300 mt-1.5 leading-relaxed">
                🛑 <strong>BLOCKED!</strong> Outstanding + current invoice exceeds credit capacity. Please select CASH payment or settle ledger outstandings.
              </p>
            )}
          </div>
        )}

        {/* Invoice Summary */}
        <div className="glass-card p-4 sm:p-5 space-y-4">
          <h2 className="font-display text-base font-bold text-med-navy flex items-center gap-2 border-b border-slate-100 pb-2">
            <FileText className="h-5 w-5 text-med-green" /> Bill Summary
          </h2>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Wholesale Subtotal</span>
              <span className="font-mono text-slate-700">{formatCurrency(calculations.subtotalPaisa)}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-semibold text-rose-600">
              <span>Schemes Discount (-)</span>
              <span className="font-mono">-{formatCurrency(calculations.discountPaisa)}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>CGST / SGST Tax (+)</span>
              <span className="font-mono text-slate-700">{formatCurrency(calculations.gstPaisa)}</span>
            </div>
            <div className="border-t border-dashed border-slate-200 my-2 pt-3 flex justify-between items-center">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">NET PAYABLE</span>
              <span className="font-mono font-black text-2xl bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent drop-shadow-xs">{formatCurrency(calculations.totalPaisa)}</span>
            </div>
          </div>

          {billingError ? <p className="rounded-lg bg-red-50 p-2.5 text-xs font-bold text-red-700">{billingError}</p> : null}
          {billingSuccess ? <p className="rounded-lg bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700">{billingSuccess}</p> : null}

          {generatedInvoiceNo && completedInvoice && (
            <button
              onClick={() => setShowPrintModal(true)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition-all text-xs animate-pulse"
            >
              <Printer className="h-4 w-4 text-slate-500" /> Open Print Console ({generatedInvoiceNo})
            </button>
          )}

          <button
            onClick={handleBillSave}
            disabled={isPending || creditBlocked}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 font-bold text-white shadow-md hover:shadow-emerald-500/25 hover:from-emerald-700 hover:to-emerald-600 active:scale-[0.97] transition-all text-sm disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Booking B2B Sale...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Book B2B {invoiceType === "challan" ? "Challan" : "Invoice"}
              </>
            )}
          </button>
        </div>

      </div>

      {/* Sleek Floating Keyboard Shortcuts Bar */}
      <div className="col-span-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-wrap gap-4 items-center justify-between text-xs font-semibold text-slate-400">
        <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" /> Wholesale Rapid Keyboard Shortcuts</span>
        <div className="flex flex-wrap gap-3.5">
          <span className="flex items-center gap-1.5"><kbd className="font-mono text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded shadow-sm text-slate-200 font-bold">/</kbd> Focus Search</span>
          <span className="flex items-center gap-1.5"><kbd className="font-mono text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded shadow-sm text-slate-200 font-bold">F8</kbd> Book Bill & Save</span>
          <span className="flex items-center gap-1.5"><kbd className="font-mono text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded shadow-sm text-slate-200 font-bold">Esc</kbd> Close Print Modal</span>
        </div>
      </div>

    </div>

    {showPrintModal && completedInvoice && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            /* Hide everything on the page except our print target safely using visibility */
            body { visibility: hidden !important; }
            #b2b-print-target, #b2b-print-target * { visibility: visible !important; }
            #b2b-print-target {
              display: block !important;
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              background: white !important;
              color: #0f172a !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              overflow: visible !important;
              z-index: 999999 !important;
            }
            ${printFormat === 'thermal' ? `
            @page { margin: 0; size: 80mm auto; }
            html, body { width: 80mm !important; margin: 0 !important; }
            #b2b-print-target { width: 80mm !important; max-width: 80mm !important; }
            ` : `
            @page { margin: 8mm; size: A4 portrait; }
            html, body { width: 210mm !important; margin: 0 !important; }
            `}
          }
        `}} />
        
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
          {/* Modal Header */}
          <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-black text-white flex items-center gap-2">
                <Printer className="h-5 w-5 text-emerald-500 animate-pulse" /> Wholesale Invoice Generated
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Invoice Ref: <code className="font-mono text-slate-350">{completedInvoice.invoiceNo}</code></p>
            </div>
            <button 
              onClick={() => setShowPrintModal(false)}
              className="rounded-lg p-1.5 hover:bg-slate-850 transition-colors text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Modal Body / Selector & Invoice Preview Container */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40 flex flex-col md:flex-row gap-6">
            
            {/* Left Selector Options Panel */}
            <div className="w-full md:w-64 space-y-4 shrink-0">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md space-y-3.5">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Print Configuration</p>
                
                {/* Format Toggle Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => setPrintFormat("a4")}
                    className={`w-full h-10 rounded-lg font-bold text-xs border flex items-center justify-center gap-2 transition-all ${
                      printFormat === "a4"
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-[0_4px_12px_rgba(16,185,129,0.25)]"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    <FileText className="h-4 w-4" /> A4 Tax Invoice Sheet
                  </button>
                  <button
                    onClick={() => setPrintFormat("thermal")}
                    className={`w-full h-10 rounded-lg font-bold text-xs border flex items-center justify-center gap-2 transition-all ${
                      printFormat === "thermal"
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-[0_4px_12px_rgba(16,185,129,0.25)]"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    <Printer className="h-4 w-4" /> 3" Thermal Receipt
                  </button>
                </div>
                
                <div className="border-t border-slate-800 pt-3 text-[10px] text-slate-450 leading-relaxed font-semibold">
                  <span className="text-emerald-500 font-bold block mb-1">💡 Pro-Tip:</span>
                  Select your layout first, then click "Trigger System Print" to open the browser print dialog.
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md space-y-2.5">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Transaction Snapshot</p>
                <div className="text-xs space-y-1.5 font-semibold text-slate-400">
                  <p className="flex justify-between items-center"><span>Chemist:</span> <span className="text-slate-100 font-bold max-w-[120px] truncate">{completedInvoice.partyName}</span></p>
                  <p className="flex justify-between items-center">
                    <span>Mode:</span> 
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      completedInvoice.paymentMode === "credit"
                        ? "bg-amber-950/85 text-amber-400 border border-amber-800/40"
                        : "bg-emerald-950/85 text-emerald-400 border border-emerald-800/40"
                    }`}>
                      {completedInvoice.paymentMode === "credit" ? "Trade Credit" : completedInvoice.paymentMode}
                    </span>
                  </p>
                  <p className="flex justify-between items-center"><span>Items:</span> <span className="text-slate-100 font-mono font-bold">{completedInvoice.items.length} meds</span></p>
                  <div className="border-t border-slate-800 pt-2.5 mt-1">
                    <p className="text-[10px] font-extrabold uppercase text-slate-450 tracking-wider">NET PAYABLE</p>
                    <p className="text-emerald-400 font-mono font-black text-lg mt-0.5">{formatCurrency(completedInvoice.calculations.totalPaisa)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Real-time Dynamic View Target */}
            <div className="flex-1 bg-slate-950 border border-slate-850 rounded-xl p-4 md:p-6 shadow-inner overflow-x-auto overflow-y-visible flex justify-start [background-image:radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]">
              
              {/* INVOICE CONTAINER TO PRINT */}
              <div 
                id="b2b-print-target"
                className={printFormat === "a4" 
                  ? "w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-800 p-6 flex flex-col justify-between mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-800/10 rounded-sm"
                  : "w-[80mm] bg-white text-slate-800 p-3 font-mono text-[11px] leading-snug flex flex-col justify-start mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-800/10 rounded-sm"
                }
                style={printFormat === "a4" ? { minWidth: "750px" } : { width: "80mm" }}
              >
                
                {/* layout renderer */}
                {printFormat === "a4" ? (
                  // 1. CLASSIC A4 B2B TAX INVOICE
                  <div className="space-y-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Title Bar */}
                      <div className="text-center border-b-2 border-slate-800 pb-2">
                        <h2 className="text-lg font-black tracking-widest text-slate-900 uppercase">
                          {completedInvoice.invoiceType === "challan" ? "DELIVERY CHALLAN" : "TAX INVOICE"}
                        </h2>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-0.5">Wholesale Pharmaceutical Distribution</p>
                      </div>
                      
                      {/* Two Column Business Details */}
                      <div className="grid grid-cols-2 gap-6 mt-4 border-b border-slate-350 pb-4 text-[11px]">
                        <div className="space-y-1.5 border-r border-slate-200 pr-4">
                          <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">B2B SUPPLIER DETAILS</p>
                          <h4 className="font-extrabold text-slate-900 text-sm">MEDICARE PHARMACEUTICALS</h4>
                          <p className="text-slate-500 font-semibold leading-relaxed">
                            B2B Warehouse Block 4, Industrial Area, Okhla,<br />
                            New Delhi, Delhi - 110020
                          </p>
                          <p className="font-bold text-slate-700 mt-1">📞 Helpline: <span className="font-mono text-slate-800">+91 99999 88888</span></p>
                          <p className="font-bold text-slate-505 font-mono mt-1">
                            GSTIN: <span className="font-black text-slate-900">07AAAAA1111A1Z1</span>
                          </p>
                          <p className="font-semibold text-slate-600 text-[10px] leading-tight">
                            DL No: <span className="font-bold">DL-20B-12948 / DL-21B-12949</span>
                          </p>
                        </div>
                        
                        <div className="space-y-1.5 pl-2">
                          <p className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">RETAIL CHEMIST (BUYER)</p>
                          <h4 className="font-black text-slate-900 text-sm">{completedInvoice.partyName}</h4>
                          <p className="text-slate-500 font-semibold leading-relaxed">
                            {completedInvoice.partyAddress || "Shop location address not configured."}
                          </p>
                          {completedInvoice.partyPhone && (
                            <p className="font-bold text-slate-700 mt-1">📞 Contact: <span className="font-mono text-slate-800">{completedInvoice.partyPhone}</span></p>
                          )}
                          <p className="font-bold text-slate-505 font-mono mt-1">
                            GSTIN: <span className="font-black text-slate-900">{completedInvoice.partyGstin || "UNREGISTERED (URP)"}</span>
                          </p>
                          <p className="font-semibold text-slate-600 text-[10px]">
                            Drug License: <span className="font-bold">{completedInvoice.partyDl || "N/A"}</span>
                          </p>
                        </div>
                      </div>
                      
                      {/* Invoice Metadata Banner */}
                      <div className="bg-slate-55 border border-slate-200 rounded-lg p-3 grid grid-cols-4 gap-4 mt-4 text-[11px] font-semibold text-slate-500">
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase">Invoice Number</span>
                          <span className="font-bold text-slate-850 font-mono text-xs">{completedInvoice.invoiceNo}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase">Billing Date</span>
                          <span className="font-bold text-slate-800">
                            {new Date(completedInvoice.date).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase">Payment Terms</span>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-800">
                            {completedInvoice.paymentMode === "credit" ? "Trade Credit" : completedInvoice.paymentMode}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase">Beat Agent</span>
                          <span className="font-bold text-slate-800">{completedInvoice.salesmanName || "Office Counter Direct"}</span>
                        </div>
                      </div>
                      
                      {/* Billing Items Table */}
                      <table className="w-full text-left text-[11px] border-collapse mt-5">
                        <thead>
                          <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[9px]">
                            <th className="px-3 py-2 border border-slate-700 text-center w-[4%]">S.No</th>
                            <th className="px-3 py-2 border border-slate-700 w-[24%]">Medicine Billed Lot & Pack</th>
                            <th className="px-3 py-2 border border-slate-700 text-center w-[8%] font-mono">HSN</th>
                            <th className="px-3 py-2 border border-slate-700 text-center w-[10%]">Batch</th>
                            <th className="px-3 py-2 border border-slate-700 text-center w-[8%]">Mfg</th>
                            <th className="px-3 py-2 border border-slate-700 text-center w-[8%]">Expiry</th>
                            <th className="px-3 py-2 border border-slate-700 text-right w-[6%]">Qty</th>
                            <th className="px-3 py-2 border border-slate-700 text-right w-[5%]">Free</th>
                            <th className="px-3 py-2 border border-slate-700 text-right w-[9%]">PTR (₹)</th>
                            <th className="px-3 py-2 border border-slate-700 text-right w-[5%]">Disc%</th>
                            <th className="px-3 py-2 border border-slate-700 text-right w-[5%]">GST%</th>
                            <th className="px-3 py-2 border border-slate-700 text-right w-[8%]">Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {completedInvoice.items.map((item: any, idx: number) => (
                            <tr key={idx} className={`font-semibold text-slate-700 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                              <td className="px-3 py-2 border border-slate-200 text-center font-mono">{idx + 1}</td>
                              <td className="px-3 py-2 border border-slate-200">
                                <p className="font-extrabold text-slate-900 leading-tight">{item.medicineName}</p>
                                <p className="text-[9px] text-slate-450 font-semibold mt-0.5">
                                  {item.packSize || "—"} • {item.manufacturer || "Unknown Mfg"}
                                </p>
                              </td>
                              <td className="px-3 py-2 border border-slate-200 text-center font-mono text-[10px] text-slate-650">{item.hsnCode || "—"}</td>
                              <td className="px-3 py-2 border border-slate-200 text-center font-mono font-bold text-slate-800">{item.batchNo}</td>
                              <td className="px-3 py-2 border border-slate-200 text-center text-slate-500 font-mono text-[10px]">{item.mfgDate || "—"}</td>
                              <td className="px-3 py-2 border border-slate-200 text-center text-slate-500 font-mono text-[10px]">{item.expiryDate}</td>
                              <td className="px-3 py-2 border border-slate-200 text-right font-mono font-bold text-slate-800">{item.quantity}</td>
                              <td className="px-3 py-2 border border-slate-200 text-right font-mono font-bold text-slate-600">{item.freeQuantity}</td>
                              <td className="px-3 py-2 border border-slate-200 text-right font-mono">₹{(item.ptrPaisa / 100).toFixed(2)}</td>
                              <td className="px-3 py-2 border border-slate-200 text-right font-mono">{item.discountPercent || "0"}%</td>
                              <td className="px-3 py-2 border border-slate-200 text-right font-mono">{item.gstRate}%</td>
                              <td className="px-3 py-2 border border-slate-200 text-right font-mono font-bold text-slate-900">₹{(item.lineTotalPaisa / 100).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {/* Financial Summaries & Tax Breakdowns */}
                      <div className="grid grid-cols-12 gap-6 mt-6">
                        <div className="col-span-7 space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Detailed GST Tax Breakdowns</p>
                          <table className="w-full text-left text-[10px] border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 font-bold text-slate-500">
                                <th className="py-1">Tax Slab</th>
                                <th className="py-1 text-right">Taxable Amt</th>
                                <th className="py-1 text-right">CGST Amt</th>
                                <th className="py-1 text-right">SGST Amt</th>
                                <th className="py-1 text-right">Total GST</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {Array.from(new Set(completedInvoice.items.map((i: any) => i.gstRate))).map((rate: any) => {
                                const slabItems = completedInvoice.items.filter((i: any) => i.gstRate === rate);
                                const slabTaxable = slabItems.reduce((acc: number, cur: any) => acc + cur.lineTotalPaisa - Math.round(cur.lineTotalPaisa * (rate / (100 + rate))), 0);
                                const slabGst = slabItems.reduce((acc: number, cur: any) => acc + Math.round(cur.lineTotalPaisa * (rate / (100 + rate))), 0);
                                const halfGst = Math.round(slabGst / 2);
                                return (
                                  <tr key={rate}>
                                    <td className="py-1 font-bold text-slate-800">GST {rate}%</td>
                                    <td className="py-1 text-right font-mono">₹{(slabTaxable / 100).toFixed(2)}</td>
                                    <td className="py-1 text-right font-mono">₹{(halfGst / 100).toFixed(2)}</td>
                                    <td className="py-1 text-right font-mono">₹{(halfGst / 100).toFixed(2)}</td>
                                    <td className="py-1 text-right font-mono font-bold text-slate-900">₹{(slabGst / 100).toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="col-span-5 space-y-2 border border-slate-200 rounded-lg p-3 bg-white font-semibold text-slate-650 text-xs">
                          <div className="flex justify-between">
                            <span>Invoice Subtotal:</span>
                            <span className="font-mono text-slate-900">₹{(completedInvoice.calculations.subtotalPaisa / 100).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-red-650">
                            <span>Scheme Discounts:</span>
                            <span className="font-mono">- ₹{(completedInvoice.calculations.discountPaisa / 100).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>CGST + SGST Tax:</span>
                            <span className="font-mono text-slate-900">₹{(completedInvoice.calculations.gstPaisa / 100).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-sm">
                            <span className="text-emerald-700">NET PAYABLE:</span>
                            <span className="font-mono text-emerald-600">₹{(completedInvoice.calculations.totalPaisa / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-slate-200 pt-3 text-[10px] text-slate-550 font-semibold italic">
                        <strong className="text-[9px] uppercase font-black text-slate-400 not-italic block mb-0.5">Amount Billed in Words</strong>
                        {numberToRupeesWords(completedInvoice.calculations.totalPaisa)}
                      </div>
                    </div>
                    
                    {/* Footer & Signature Section */}
                    <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200 text-[10px] font-semibold text-slate-400 mt-8">
                      <div className="col-span-2 space-y-1 text-slate-450 leading-normal pr-4">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Standard B2B Terms & Conditions</p>
                        <p>1. Pharmaceutical goods once billed and shipped cannot be returned or swapped.</p>
                        <p>2. Outstandings on trade credit must be settled within active distributor terms ({completedInvoice.paymentMode === "credit" ? "As Mapped" : "Immediate"}).</p>
                        <p>3. Subject to local business jurisdiction laws only.</p>
                      </div>
                      
                      <div className="flex flex-col justify-between items-center h-20 text-center pl-2">
                        <div className="w-full text-center mt-2 relative">
                          <span className="font-serif italic font-black text-slate-800 text-sm tracking-wide block mb-0.5">Medicare Distributors</span>
                          <span className="block text-[10px] font-mono text-slate-400 font-normal select-none pointer-events-none opacity-40 leading-none">authorized electronic copy</span>
                          <div className="w-full border-b border-dashed border-slate-350 mt-2"></div>
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-wider">Authorized Signatory</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // 2. 3-INCH THERMAL RECEIPT
                  <div className="flex flex-col justify-start w-full">
                    <div className="text-center space-y-0.5">
                      <h3 className="font-black text-xs text-slate-900">MEDICARE DISTRIBUTORS</h3>
                      <p className="text-[9px] text-slate-505">B2B Wholesale Pharma Hub</p>
                      <p className="text-[9px] font-mono">GSTIN: 07AAAAA1111A1Z1</p>
                      <p className="text-[9px] font-mono">DL No: DL-20B-12948 / DL-21B-12949</p>
                      <p className="text-[9px]">Phone: +91 99999 88888</p>
                    </div>
                    
                    <p className="my-2 border-b border-dashed border-slate-800"></p>
                    
                    <div className="space-y-0.5 text-[10px] text-slate-700">
                      <p className="font-mono"><strong>Ref:</strong> {completedInvoice.invoiceNo}</p>
                      <p><strong>Date:</strong> {new Date(completedInvoice.date).toLocaleString("en-IN")}</p>
                      <p><strong>Retailer:</strong> {completedInvoice.partyName}</p>
                      {completedInvoice.partyGstin && <p className="font-mono"><strong>GST:</strong> {completedInvoice.partyGstin}</p>}
                      <p><strong>Terms:</strong> <span className="uppercase font-bold">{completedInvoice.paymentMode}</span></p>
                      {completedInvoice.salesmanName && <p><strong>Salesman:</strong> {completedInvoice.salesmanName}</p>}
                    </div>
                    
                    <p className="my-2 border-b border-dashed border-slate-800"></p>
                    
                    <div className="space-y-1.5 text-slate-850 font-semibold">
                      <div className="flex justify-between font-bold text-[9px] uppercase">
                        <span className="w-[50%]">Item Lot</span>
                        <span className="w-[20%] text-right font-mono">Qty</span>
                        <span className="w-[30%] text-right font-mono">Total</span>
                      </div>
                      
                      <p className="border-b border-slate-200/50 my-1"></p>
                      
                      {completedInvoice.items.map((item: any, idx: number) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between font-bold">
                            <span className="w-[50%] truncate">{item.medicineName}</span>
                            <span className="w-[20%] text-right font-mono">{item.quantity}{item.freeQuantity > 0 ? `+${item.freeQuantity}` : ""}</span>
                            <span className="w-[30%] text-right font-mono">₹{(item.lineTotalPaisa / 100).toFixed(0)}</span>
                          </div>
                          <div className="text-[9px] text-slate-500 font-mono pl-1 font-normal">
                            Batch: {item.batchNo} • Exp: {item.expiryDate} • Rate: ₹{(item.ptrPaisa / 100).toFixed(0)}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <p className="my-2 border-b border-dashed border-slate-800"></p>
                    
                    <div className="space-y-1 font-mono text-right text-[10px] text-slate-700">
                      <p className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{(completedInvoice.calculations.subtotalPaisa / 100).toFixed(2)}</span>
                      </p>
                      <p className="flex justify-between text-slate-505">
                        <span>Discounts:</span>
                        <span>-₹{(completedInvoice.calculations.discountPaisa / 100).toFixed(2)}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>CGST/SGST Tax:</span>
                        <span>₹{(completedInvoice.calculations.gstPaisa / 100).toFixed(2)}</span>
                      </p>
                      <p className="flex justify-between font-black text-slate-900 border-t border-slate-300 pt-1 text-xs">
                        <span>NET PAYABLE:</span>
                        <span>₹{(completedInvoice.calculations.totalPaisa / 100).toFixed(2)}</span>
                      </p>
                    </div>
                    
                    <p className="my-2 border-b border-dashed border-slate-800"></p>
                    
                    <div className="text-center space-y-1 text-[9px] font-sans text-slate-550">
                      <p className="font-bold text-slate-800">Thank you for your business!</p>
                      <p>Please reconcile invoice outstandings within mapped trade billing cycles.</p>
                      <p className="text-[8px] font-mono text-slate-300 mt-2">Powered by Medicare B2B</p>
                    </div>
                  </div>
                )}
                
              </div>
              
            </div>
          </div>
          
          {/* Modal Footer / Triggers */}
          <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 no-print">
            <button
              onClick={() => setShowPrintModal(false)}
              className="h-10 px-4 rounded-xl border border-slate-700 bg-slate-800 font-bold text-slate-300 hover:bg-slate-750 hover:text-white transition-colors text-xs active:scale-[0.98]"
            >
              Close & Return to POS
            </button>

            <div className="flex items-center gap-2">
              {/* WhatsApp Share */}
              {completedInvoice?.partyPhone && (
                <a
                  href={`https://wa.me/${completedInvoice.partyPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `B2B Invoice: ${completedInvoice.invoiceNo}\nChemist: ${completedInvoice.partyName}\nTotal: ₹${(completedInvoice.calculations.totalPaisa / 100).toFixed(2)}\nPayment: ${completedInvoice.paymentMode.toUpperCase()}\nMedicines: ${completedInvoice.items.map((i: any) => `${i.medicineName} (Qty:${i.quantity})`).join(", ")}\nThank you!`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs flex items-center gap-2 shadow-md hover:shadow-[0_4px_12px_rgba(16,185,129,0.25)] active:scale-[0.98] transition-all"
                >
                  <Send className="h-4 w-4" /> WhatsApp Bill
                </a>
              )}

              <button
                onClick={() => window.print()}
                className="h-10 px-6 rounded-xl bg-med-green font-bold text-white shadow-sm hover:bg-med-greenDark active:scale-95 transition-all text-xs flex items-center gap-2"
              >
                <Printer className="h-4 w-4" /> Trigger System Print
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
}

// Utility function to convert numbers to Indian Rupees Words
function numberToRupeesWords(paisa: number): string {
  if (isNaN(paisa) || paisa < 0) return "Zero Rupees Only";
  const totalRupees = Math.floor(paisa / 100);
  if (totalRupees === 0) return "Zero Rupees Only";
  
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  function convertLessThanThousand(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) {
      const unit = n % 10;
      return tens[Math.floor(n / 10)] + (unit ? " " + ones[unit] : "");
    }
    const rem = n % 100;
    return ones[Math.floor(n / 100)] + " Hundred" + (rem ? " and " + convertLessThanThousand(rem) : "");
  }
  
  let num = totalRupees;
  let wordResult = "";
  
  if (Math.floor(num / 10000000) > 0) {
    wordResult += convertLessThanThousand(Math.floor(num / 10000000)) + " Crore ";
    num %= 10000000;
  }
  if (Math.floor(num / 100000) > 0) {
    wordResult += convertLessThanThousand(Math.floor(num / 100000)) + " Lakh ";
    num %= 100000;
  }
  if (Math.floor(num / 1000) > 0) {
    wordResult += convertLessThanThousand(Math.floor(num / 1000)) + " Thousand ";
    num %= 1000;
  }
  if (num > 0) {
    wordResult += convertLessThanThousand(num);
  }
  
  return wordResult.trim() + " Rupees Only";
}
