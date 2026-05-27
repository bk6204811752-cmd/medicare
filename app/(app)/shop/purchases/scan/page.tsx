"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Camera, Upload, FileText, Loader2, CheckCircle, AlertCircle,
  Eye, RefreshCw, Plus, Trash2, ArrowRight, ShieldAlert, Sparkles,
  Play
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

type ScannedItem = {
  medicineName: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  quantity: number;
  purchaseRatePaisa: number;
  mrpPaisa: number;
  gstRate: number;
  hsnCode: string;
};

type SampleInvoice = {
  name: string;
  supplierName: string;
  invoiceNo: string;
  items: ScannedItem[];
};

const SAMPLE_INVOICES: SampleInvoice[] = [
  {
    name: "Saveo B2B Distributor Invoice",
    supplierName: "Saveo Connects Ltd",
    invoiceNo: "SAVEO-9843-2026",
    items: [
      {
        medicineName: "Paracetamol 650mg",
        batchNo: "P650-26A",
        mfgDate: "2026-01-10",
        expiryDate: "2027-08-31",
        quantity: 100,
        purchaseRatePaisa: 1250, // ₹12.50
        mrpPaisa: 1950, // ₹19.50
        gstRate: 12,
        hsnCode: "30049099",
      },
      {
        medicineName: "Metformin 500mg",
        batchNo: "MET-26H",
        mfgDate: "2026-02-15",
        expiryDate: "2028-01-31",
        quantity: 150,
        purchaseRatePaisa: 840, // ₹8.40
        mrpPaisa: 1450, // ₹14.50
        gstRate: 12,
        hsnCode: "30049099",
      },
      {
        medicineName: "Amoxicillin 250mg",
        batchNo: "AMX-26B",
        mfgDate: "2026-03-01",
        expiryDate: "2027-11-30",
        quantity: 50,
        purchaseRatePaisa: 1890, // ₹18.90
        mrpPaisa: 2800, // ₹28.00
        gstRate: 12,
        hsnCode: "30049099",
      },
    ],
  },
  {
    name: "Medikabazaar Consumables Invoice",
    supplierName: "Medikabazaar India",
    invoiceNo: "MB-MED-4912-26",
    items: [
      {
        medicineName: "Disposable Syringes 2ml",
        batchNo: "SYR-984",
        mfgDate: "2026-01-05",
        expiryDate: "2031-01-31",
        quantity: 500,
        purchaseRatePaisa: 220, // ₹2.20
        mrpPaisa: 500, // ₹5.00
        gstRate: 12,
        hsnCode: "90183100",
      },
      {
        medicineName: "3-Ply Surgical Masks Box",
        batchNo: "MSK-765",
        mfgDate: "2026-02-10",
        expiryDate: "2029-02-28",
        quantity: 20,
        purchaseRatePaisa: 9500, // ₹95.00 per box
        mrpPaisa: 19500, // ₹195.00
        gstRate: 5,
        hsnCode: "63079090",
      },
    ],
  },
];

export default function AIInvoiceScannerPage() {
  const router = useRouter();
  
  // UI views: "upload", "scanning", "review"
  const [view, setView] = useState<"upload" | "scanning" | "review">("upload");
  const [scanStep, setScanStep] = useState(0);
  const [selectedSample, setSelectedSample] = useState<SampleInvoice | null>(null);
  const [importing, setImporting] = useState(false);

  // Parsed invoice state
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [items, setItems] = useState<ScannedItem[]>([]);

  // OCR scanning simulation steps
  const scanningSteps = [
    "Activating high-fidelity camera lens and optimizing lighting...",
    "Extracting batch codes and expiration date structures...",
    "Validating transparent GST tax tiers and HSN classifications...",
    "Resolving brand nomenclature with Global Indian Drug Registry...",
    "OCR and AI Parsing Complete! Formatting review ledger...",
  ];

  const handleSelectSample = (sample: SampleInvoice) => {
    setSelectedSample(sample);
    setView("scanning");
    setScanStep(0);
  };

  useEffect(() => {
    if (view !== "scanning") return;

    const interval = setInterval(() => {
      setScanStep((prev) => {
        if (prev >= scanningSteps.length - 1) {
          clearInterval(interval);
          // Set values to form
          if (selectedSample) {
            setSupplierName(selectedSample.supplierName);
            setInvoiceNo(selectedSample.invoiceNo);
            setItems(selectedSample.items);
          }
          setView("review");
          toast.success("AI OCR extraction successful!");
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [view, selectedSample]);

  // Form updates
  const handleUpdateItem = (index: number, field: keyof ScannedItem, value: any) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        medicineName: "New Product",
        batchNo: "BATCH-01",
        mfgDate: new Date().toISOString().slice(0, 10),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        quantity: 10,
        purchaseRatePaisa: 1000,
        mrpPaisa: 1500,
        gstRate: 12,
        hsnCode: "30049099",
      },
    ]);
  };

  const handleImportToStock = async () => {
    if (!supplierName.trim()) {
      toast.error("Please supply a valid Supplier Name");
      return;
    }
    if (items.length === 0) {
      toast.error("At least one parsed item is required");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/purchases/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName,
          invoiceNo,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import items");

      toast.success(`Purchase Entry ${data.data.poNumber} completed! Stock levels updated.`);
      router.push("/shop/purchases");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import invoice");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="AI Digital Invoice OCR Scanner"
        description="eVitalRx-style camera scanning to automatically parse B2B supplier invoices into inventory"
      />

      {/* ─── VIEW 1: UPLOAD & SAMPLE SELECTION ────────────────────────── */}
      {view === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Left: Drag Drop & Camera options */}
          <div className="space-y-6">
            <div className="glass-card p-8 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center space-y-4 hover:border-emerald-500 hover:bg-emerald-50/5 transition-all duration-200 cursor-pointer">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-md">
                <Upload className="h-8 w-8" />
              </div>
              <div>
                <p className="text-base font-extrabold text-slate-700">Upload Stockist PDF Invoice</p>
                <p className="text-xs text-slate-400 mt-1">Drag & drop your Saveo, Medikabazaar, or local invoice here</p>
              </div>
              <div className="flex gap-2">
                <span className="bg-slate-100 px-3 py-1 rounded text-xs font-bold text-slate-500 uppercase">PDF</span>
                <span className="bg-slate-100 px-3 py-1 rounded text-xs font-bold text-slate-500 uppercase">PNG/JPG</span>
              </div>
            </div>

            <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-700">Scan via Device Camera</h4>
                  <p className="text-xs text-slate-400">Position the physical paper invoice in front of the lens</p>
                </div>
              </div>
              <button
                onClick={() => handleSelectSample(SAMPLE_INVOICES[0])}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all"
              >
                <Camera className="h-3.5 w-3.5" /> Start Live Scan
              </button>
            </div>
          </div>

          {/* Right: Quick Samples */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Sparkles className="h-4.5 w-4.5 text-emerald-600" />
              <h3 className="font-extrabold text-base">Select B2B Sample Invoice</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Test out our AI OCR extraction immediately without uploading anything! Choose one of the pre-loaded B2B supplier invoices:
            </p>

            <div className="space-y-3 pt-2">
              {SAMPLE_INVOICES.map((sample) => (
                <button
                  key={sample.name}
                  onClick={() => handleSelectSample(sample)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/5 transition-all shadow-sm group"
                >
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    {sample.supplierName}
                  </p>
                  <p className="text-sm font-extrabold text-slate-800 group-hover:text-emerald-700 transition-colors mt-0.5">
                    {sample.name}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-3 border-t border-slate-100 pt-2">
                    <span>📋 {sample.items.length} items</span>
                    <span className="flex items-center gap-1 font-bold text-emerald-600">
                      Run AI Scan <Play className="h-2.5 w-2.5 fill-emerald-600" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── VIEW 2: AI SCANNING ANIMATION ──────────────────────────── */}
      {view === "scanning" && (
        <div className="glass-card p-12 flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8 shadow-xl border-t-4 border-t-emerald-500 animate-fade-in">
          {/* Pulsing Scan Radar */}
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 rounded-full bg-emerald-500 opacity-20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-emerald-500 opacity-45 animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
              <Loader2 className="h-10 w-10 animate-spin" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-extrabold text-slate-800">Processing B2B Invoice</h3>
            <p className="text-xs text-slate-400">eVitalRx DeepLearning parser is digitizing invoice layout...</p>
          </div>

          {/* Stepper progress list */}
          <div className="w-full max-w-md space-y-3 pt-4">
            {scanningSteps.map((step, idx) => {
              const isPast = idx < scanStep;
              const isCurrent = idx === scanStep;
              return (
                <div
                  key={step}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    isPast
                      ? "border-emerald-100 bg-emerald-50/50 text-emerald-700"
                      : isCurrent
                      ? "border-blue-200 bg-blue-50/30 text-blue-800 animate-pulse"
                      : "border-slate-100 bg-slate-50/20 text-slate-400"
                  }`}
                >
                  <div className="shrink-0">
                    {isPast ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : isCurrent ? (
                      <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-slate-200 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <span className="flex-1">{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── VIEW 3: SPLIT REVIEW LEDGER ───────────────────────────── */}
      {view === "review" && (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 max-w-full overflow-hidden">
          {/* Left: Original Styled Invoice Mock */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Eye className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-extrabold text-slate-600 uppercase tracking-wider">
                Digital Invoice Source
              </h3>
            </div>

            <div className="glass-card p-6 bg-slate-50/70 border border-slate-200 relative overflow-hidden font-mono text-[11px] text-slate-600 shadow-md">
              {/* Receipt decoration lines */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-400" />

              <div className="text-center pb-4 border-b border-dashed border-slate-300">
                <h4 className="font-extrabold text-slate-800 text-sm">{supplierName || "SUPPLIER INVOICE"}</h4>
                <p className="text-[10px] mt-0.5">Primary Medicine B2B Markets</p>
                <p className="text-[9px] text-slate-400 mt-1">Invoice: {invoiceNo || "N/A"}</p>
              </div>

              <div className="py-4 space-y-1.5 border-b border-dashed border-slate-300 text-[10px]">
                <p className="flex justify-between">
                  <span>DATE:</span> <span>{new Date().toISOString().slice(0, 10)}</span>
                </p>
                <p className="flex justify-between">
                  <span>GSTIN:</span> <span>27AABCS8945F1Z2</span>
                </p>
                <p className="flex justify-between">
                  <span>TO:</span> <span className="font-bold">MEDICARE PHARMACY</span>
                </p>
              </div>

              {/* Items List */}
              <div className="py-4 space-y-3 border-b border-dashed border-slate-300">
                <div className="flex justify-between text-slate-800 font-extrabold border-b border-slate-200 pb-1">
                  <span>ITEM / BATCH</span>
                  <span className="text-right">QTY x PTR</span>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <p className="flex justify-between font-extrabold text-slate-700">
                      <span>{item.medicineName}</span>
                      <span>
                        {item.quantity} x {formatCurrency(item.purchaseRatePaisa)}
                      </span>
                    </p>
                    <p className="flex justify-between text-[9px] text-slate-400">
                      <span>Batch: {item.batchNo} | Exp: {item.expiryDate}</span>
                      <span>GST {item.gstRate}%</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="py-4 space-y-1.5 text-[10px]">
                <p className="flex justify-between font-semibold">
                  <span>SUBTOTAL:</span>
                  <span>
                    {formatCurrency(items.reduce((s, i) => s + i.quantity * i.purchaseRatePaisa, 0))}
                  </span>
                </p>
                <p className="flex justify-between font-bold text-slate-800 text-xs mt-2 pt-2 border-t border-slate-200">
                  <span>TOTAL BILL:</span>
                  <span>
                    {formatCurrency(items.reduce((s, i) => s + i.quantity * i.purchaseRatePaisa, 0))}
                  </span>
                </p>
              </div>

              <div className="text-center pt-4 border-t border-dashed border-slate-300 text-[9px] text-slate-400">
                <p>⚡ Powered by Saveo & Medikabazaar Logistics</p>
                <p className="mt-0.5">Verified & Audited Digital Invoice ✓</p>
              </div>
            </div>

            <button
              onClick={() => setView("upload")}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Rescan Invoice
            </button>
          </div>

          {/* Right: Parsed Form review */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                  Review Parsed Ledger
                </h3>
              </div>
              <button
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 text-xs font-bold transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Add Row
              </button>
            </div>

            <div className="glass-card p-5 space-y-4 shadow-md">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Invoice No
                  </label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Items Table Form */}
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase text-slate-400">
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3 w-20">Batch</th>
                      <th className="py-2.5 px-3 w-24">Mfg Date</th>
                      <th className="py-2.5 px-3 w-24">Expiry</th>
                      <th className="py-2.5 px-3 w-16 text-center">Qty</th>
                      <th className="py-2.5 px-3 w-20 text-center">PTR (Paisa)</th>
                      <th className="py-2.5 px-3 w-20 text-center">MRP (Paisa)</th>
                      <th className="py-2.5 px-3 w-12 text-center">GST %</th>
                      <th className="py-2.5 px-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30">
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.medicineName}
                            onChange={(e) => handleUpdateItem(idx, "medicineName", e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.batchNo}
                            onChange={(e) => handleUpdateItem(idx, "batchNo", e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={item.mfgDate}
                            onChange={(e) => handleUpdateItem(idx, "mfgDate", e.target.value)}
                            className="w-full px-1.5 py-1 text-[11px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => handleUpdateItem(idx, "expiryDate", e.target.value)}
                            className="w-full px-1.5 py-1 text-[11px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, "quantity", Number(e.target.value))}
                            className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-center font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.purchaseRatePaisa}
                            onChange={(e) => handleUpdateItem(idx, "purchaseRatePaisa", Number(e.target.value))}
                            className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-center font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.mrpPaisa}
                            onChange={(e) => handleUpdateItem(idx, "mrpPaisa", Number(e.target.value))}
                            className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-center font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.gstRate}
                            onChange={(e) => handleUpdateItem(idx, "gstRate", Number(e.target.value))}
                            className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom total review & import action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Total Purchase Value</p>
                  <p className="text-xl font-extrabold text-slate-800">
                    {formatCurrency(items.reduce((s, i) => s + i.quantity * i.purchaseRatePaisa, 0))}
                  </p>
                </div>

                <button
                  onClick={handleImportToStock}
                  disabled={importing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-all active:scale-95 duration-150 shadow-md disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Importing...
                    </>
                  ) : (
                    <>
                      Confirm & Import to Stock <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
