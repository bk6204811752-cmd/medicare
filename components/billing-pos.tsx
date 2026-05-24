"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraOff, ChevronDown, ChevronUp, Database, Keyboard, Loader2, Minus, PackagePlus, Plus, Printer, RotateCcw, Save, Search, Send, Sparkles, Trash2, AlertTriangle, Clock, Zap, Flashlight, FlashlightOff, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { calculateBillTotals } from "@/lib/gst";
import type { SaleLine } from "@/lib/types";
import { daysUntil, formatCurrency, parseUnitsPerPack } from "@/lib/utils";
import { AddMedicineForm } from "@/components/add-medicine-form";
import type { DrugMasterSuggestion } from "@/components/drug-master-confirm-modal";
import { BillDetailClient } from "@/app/(app)/shop/billing/[id]/BillDetailClient";

// ─── Lazy-loaded barcode reader singleton ───
let _readerPromise: Promise<any> | null = null;
function getReader() {
  if (!_readerPromise) {
    _readerPromise = import("@zxing/browser").then(
      (mod) => new mod.BrowserMultiFormatReader()
    );
  }
  return _readerPromise;
}

type InventorySearchRow = {
  id: string;
  batchNo: string;
  expiryDate: string;
  mrpPaisa: number;
  saleRatePaisa: number;
  gstRate: SaleLine["gstRate"];
  hsnCode: string;
  quantity: number;
  medicine: {
    name: string;
    genericName?: string;
    manufacturer?: string;
    barcode?: string;
    packSize?: string | null;
    schedule: SaleLine["schedule"];
  };
};

type MedicineSuggestion = {
  id: string;
  name: string;
  genericName?: string | null;
  manufacturer?: string | null;
  barcode?: string | null;
};

type CustomerOption = {
  id: string;
  name: string;
  phone?: string;
  doctorName?: string;
};

type BillingLine = SaleLine & {
  maxQuantity: number;
};

export function BillingPos({ tenant }: { tenant: any }) {
  const [rows, setRows] = useState<InventorySearchRow[]>([]);
  const [suggestions, setSuggestions] = useState<MedicineSuggestion[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [query, setQuery] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [prescriptionNo, setPrescriptionNo] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [lines, setLines] = useState<BillingLine[]>([]);
  const [lastInvoice, setLastInvoice] = useState<{ id: string; invoiceNo: string; totalPaisa: number; phone: string } | null>(null);
  const [savedSaleDetails, setSavedSaleDetails] = useState<{ sale: any; items: any[] } | null>(null);
  const [modalPrintFormat, setModalPrintFormat] = useState<"a4" | "thermal">("a4");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [showManualBarcode, setShowManualBarcode] = useState(false);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [addMedicinePrefill, setAddMedicinePrefill] = useState<{ barcode?: string; name?: string }>({});
  const [lastScanCode, setLastScanCode] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const brightnessIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanControlsRef = useRef<{ stop: () => void } | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const customerDropdownRef = useRef<HTMLDivElement | null>(null);
  const [searching, setSearching] = useState(false);
  const [drugMasterHits, setDrugMasterHits] = useState<DrugMasterSuggestion[]>([]);
  const [drugMasterLoading, setDrugMasterLoading] = useState(false);
  const [scanCountdown, setScanCountdown] = useState(0);
  const scanCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // External USB barcode scanner detection: rapid keypresses ending with Enter
  const barcodeBufferRef = useRef("");
  const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totals = useMemo(() => calculateBillTotals(lines), [lines]);
  const totalItems = lines.reduce((sum, l) => sum + l.quantity, 0);

  // Filtered customer list for autocomplete dropdown
  const filteredCustomers = useMemo(() => {
    const q = (customerSearch || customerName || customerPhone).toLowerCase().trim();
    if (!q) return customers.slice(0, 8);
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    ).slice(0, 8);
  }, [customers, customerSearch, customerName, customerPhone]);

  // ─── Keyboard shortcuts + external USB barcode scanner detection ───
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Function key shortcuts
      if (e.key === "F2") { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === "F3") { e.preventDefault(); startScanning(); }
      if (e.key === "F4") { e.preventDefault(); setShowManualBarcode(p => !p); }
      if (e.key === "F8") { e.preventDefault(); saveBill("print-a4"); }
      if (e.key === "F9") { e.preventDefault(); saveBill("print-thermal"); }

      // External USB barcode scanner detection:
      // USB scanners type characters rapidly (<50ms between keys) and end with Enter
      const target = e.target as HTMLElement;
      const isFormField = target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA";
      if (isFormField) return; // Don't intercept when typing in a field

      if (e.key === "Enter" && barcodeBufferRef.current.length >= 6) {
        e.preventDefault();
        const code = barcodeBufferRef.current;
        barcodeBufferRef.current = "";
        handleBarcodeResult(code);
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        barcodeBufferRef.current += e.key;
        barcodeTimerRef.current = setTimeout(() => { barcodeBufferRef.current = ""; }, 80);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, saving, customerName, customerPhone, doctorName, prescriptionNo, paymentMode, totals]);

  // Fetch recent customers
  useEffect(() => {
    fetch("/api/customers")
      .then((response) => response.json())
      .then((result) => setCustomers((result.data ?? []).slice(0, 50)))
      .catch(() => setCustomers([]));
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced medicine search with loading indicator — 100ms for speed
  useEffect(() => {
    if (query.length < 1) {
      setRows([]);
      setSuggestions([]);
      setSearching(false);
      return;
    }

    // Allow single character only for numeric (barcode prefix), require 2+ for text
    const isNumeric = /^\d+$/.test(query);
    if (!isNumeric && query.length < 2) {
      setRows([]);
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/medicines/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((result) => {
          setRows(result.data ?? []);
          setSuggestions(result.suggestions ?? []);
          setSearching(false);
        })
        .catch(() => setSearching(false));
    }, isNumeric ? 50 : 100); // Barcode = 50ms, text search = 100ms

    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  // Debounced Drug Master API search — runs in parallel with inventory search
  useEffect(() => {
    if (query.length < 2 || /^\d+$/.test(query)) {
      setDrugMasterHits([]);
      setDrugMasterLoading(false);
      return;
    }
    setDrugMasterLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/drug-master/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then(r => r.json())
        .then(result => {
          setDrugMasterHits(result.data ?? []);
          setDrugMasterLoading(false);
        })
        .catch(() => setDrugMasterLoading(false));
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const matches = query.length < 2 ? [] : rows;

  // ─── Add item to bill ───
  const addItemToBill = useCallback((item: InventorySearchRow) => {
    setLines((current) => {
      const existing = current.find((line) => line.inventoryId === item.id);
      if (existing) {
        if (existing.quantity >= existing.maxQuantity) {
          toast.warning(`Only ${existing.maxQuantity} units available for ${existing.medicineName}.`);
          return current;
        }
        return current.map((line) => (line.inventoryId === item.id ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [
        ...current,
        {
          inventoryId: item.id,
          medicineName: item.medicine.name,
          batchNo: item.batchNo,
          expiryDate: item.expiryDate,
          quantity: 1,
          mrpPaisa: Number(item.mrpPaisa),
          saleRatePaisa: Number(item.saleRatePaisa),
          discountPercent: 0,
          gstRate: item.gstRate,
          hsnCode: String(item.hsnCode ?? ""),
          schedule: item.medicine.schedule,
          maxQuantity: Number(item.quantity)
        }
      ];
    });
    setQuery("");
    setSuggestions([]);
    setShowAddMedicine(false);
  }, []);

  function addLine(inventoryId: string) {
    const item = rows.find((row) => row.id === inventoryId);
    if (!item) return;
    addItemToBill(item);
  }

  function updateLine(inventoryId: string, patch: Partial<BillingLine>) {
    setLines((current) =>
      current.map((line) => {
        if (line.inventoryId !== inventoryId) return line;
        const next = { ...line, ...patch };
        next.quantity = Math.min(Math.max(1, Number(next.quantity) || 1), line.maxQuantity);
        next.discountPercent = Math.min(Math.max(0, Number(next.discountPercent) || 0), 100);
        next.saleRatePaisa = Math.max(0, Number(next.saleRatePaisa) || 0);
        return next;
      })
    );
  }

  // ─── Camera barcode scanner with continuous scanning ───
  function cleanupScanner() {
    if (scanControlsRef.current) {
      try { scanControlsRef.current.stop(); } catch { /* ignore */ }
      scanControlsRef.current = null;
    }
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (brightnessIntervalRef.current) {
      clearInterval(brightnessIntervalRef.current);
      brightnessIntervalRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setTorchEnabled(false);
    setTorchSupported(false);
  }

  function stopScanning() {
    cleanupScanner();
    if (scanCountdownRef.current) {
      clearInterval(scanCountdownRef.current);
      scanCountdownRef.current = null;
    }
    setScanning(false);
    setScanStatus("");
    setScanCountdown(0);
  }

  // ─── Torch toggle helper ───
  async function toggleTorch(forceState?: boolean) {
    try {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      if (!track) return;
      const newState = forceState ?? !torchEnabled;
      await track.applyConstraints({ advanced: [{ torch: newState } as any] });
      setTorchEnabled(newState);
    } catch { /* torch not supported */ }
  }

  // ─── Brightness detection from video frame ───
  function startBrightnessDetection() {
    if (brightnessIntervalRef.current) clearInterval(brightnessIntervalRef.current);
    brightnessIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth === 0) return;
      const w = 64, h = 48; // sample at low res for performance
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      let totalLuminance = 0;
      const pixelCount = w * h;
      for (let i = 0; i < data.length; i += 4) {
        totalLuminance += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      }
      const avgLuminance = totalLuminance / pixelCount;
      // Auto-enable torch in low light
      if (avgLuminance < 50 && !torchEnabled && torchSupported) {
        toggleTorch(true);
        toast.info("🔦 Low light detected — flash enabled", { duration: 2000 });
      }
    }, 2500);
  }

  async function handleBarcodeResult(code: string) {
    stopScanning();
    setScanStatus("Processing barcode...");
    setLastScanCode(code);

    // Vibrate on successful scan (mobile)
    if (navigator.vibrate) navigator.vibrate(200);

    try {
      const response = await fetch(`/api/medicines/search?q=${encodeURIComponent(code)}`);
      const resultJson = await response.json();
      const item = resultJson.data?.[0] as InventorySearchRow | undefined;
      if (item) {
        setRows([item]);
        addItemToBill(item);
        toast.success(`✅ Added ${item.medicine.name}`, {
          action: { label: "Scan again", onClick: () => startScanning() },
        });
      } else {
        setQuery(code);
        setAddMedicinePrefill({ barcode: code });
        setShowAddMedicine(true);
        toast.warning("Barcode not in stock — quick-add form opened.", { duration: 4000 });
      }
    } catch {
      toast.error("Failed to look up barcode. Try manual entry.");
    } finally {
      setScanStatus("");
    }
  }

  async function startScanning() {
    if (scanning) {
      stopScanning();
      return;
    }
    setScanning(true);
    setScanStatus("Starting camera...");
    setScanCountdown(30);

    try {
      const reader = await getReader();

      // Use constraints for rear camera + higher resolution + continuous autofocus
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      setScanStatus("📷 Point camera at barcode...");

      // Continuous scanning with callback
      const controls = await reader.decodeFromConstraints(
        constraints,
        videoRef.current!,
        (result: any, _error: any) => {
          if (result) {
            const code = result.getText();
            if (code) {
              handleBarcodeResult(code);
            }
          }
        }
      );

      scanControlsRef.current = controls;

      // Check torch capability and auto-detect brightness
      try {
        const stream = videoRef.current?.srcObject as MediaStream | null;
        const track = stream?.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities?.() as any;
          if (capabilities?.torch) {
            setTorchSupported(true);
            // Start brightness detection — auto-enables torch in low light
            startBrightnessDetection();
          } else {
            setTorchSupported(false);
          }
        }
      } catch { setTorchSupported(false); }

      // Countdown timer
      scanCountdownRef.current = setInterval(() => {
        setScanCountdown(prev => {
          if (prev <= 1) {
            stopScanning();
            toast.info("⏱️ Camera scan timed out. Try manual barcode entry.", { duration: 5000 });
            setShowManualBarcode(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err: any) {
      stopScanning();
      const msg = err?.message?.toLowerCase() ?? "";
      if (msg.includes("permission") || msg.includes("denied") || msg.includes("notallowed")) {
        toast.error("Camera permission denied. Please allow camera access in browser settings.");
      } else if (msg.includes("notfound") || msg.includes("no video")) {
        toast.error("No camera found on this device.");
      } else {
        toast.error("Camera error. Use manual barcode entry instead.");
      }
      setShowManualBarcode(true);
    }
  }

  // ─── Manual barcode lookup ───
  async function lookupManualBarcode() {
    const code = manualBarcode.trim();
    if (!code) { toast.error("Enter a barcode number."); return; }
    try {
      const response = await fetch(`/api/medicines/search?q=${encodeURIComponent(code)}`);
      const resultJson = await response.json();
      const item = resultJson.data?.[0] as InventorySearchRow | undefined;
      if (item) {
        addItemToBill(item);
        toast.success(`✅ Added ${item.medicine.name}`);
        setManualBarcode("");
        setShowManualBarcode(false);
      } else {
        setQuery(code);
        setAddMedicinePrefill({ barcode: code });
        toast.warning("Barcode not found in stock. Add it manually.");
      }
    } catch {
      toast.error("Lookup failed. Check connection.");
    }
  }

  // ─── Quick-add medicine callback ───
  function handleQuickAddSuccess(result: { medicine: any; inventory: any }) {
    if (result.inventory) {
      const inv = result.inventory;
      const newItem: InventorySearchRow = {
        id: inv.id,
        batchNo: inv.batchNo,
        expiryDate: inv.expiryDate,
        mrpPaisa: inv.mrpPaisa,
        saleRatePaisa: inv.saleRatePaisa,
        gstRate: inv.gstRate,
        hsnCode: inv.hsnCode ?? "",
        quantity: inv.quantity,
        medicine: {
          name: inv.medicine.name,
          genericName: inv.medicine.genericName,
          manufacturer: inv.medicine.manufacturer,
          barcode: inv.medicine.barcode,
          schedule: inv.medicine.schedule as SaleLine["schedule"],
        },
      };
      setRows([newItem]);
      addItemToBill(newItem);
    }
    setShowAddMedicine(false);
    setAddMedicinePrefill({});
  }

  async function saveBill(actionAfterSave: "none" | "print-a4" | "print-thermal" | "share" = "none") {
    const controlled = lines.filter((line) => line.schedule === "H" || line.schedule === "H1" || line.schedule === "X");
    if (!lines.length) {
      toast.error("Add at least one medicine before saving.");
      return;
    }
    if (controlled.length && (!doctorName || !prescriptionNo)) {
      toast.error("Prescription and doctor details are required for Schedule H/H1/X items.");
      return;
    }

    setSaving(true);
    const savedTotalPaisa = totals.totalPaisa;
    const savedPhone = customerPhone;
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim() || "Walk-in Customer",
          customerPhone,
          doctorName,
          prescriptionNo,
          paymentMode,
          lines: lines.map((line) => ({
            inventoryId: line.inventoryId,
            quantity: line.quantity,
            saleRatePaisa: line.saleRatePaisa,
            discountPercent: Math.round(line.discountPercent)
          }))
        })
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "Unable to save bill");
        return;
      }

      setLastInvoice({
        id: String(result.data?.sale?.id ?? ""),
        invoiceNo: String(result.data?.sale?.invoice_no ?? "invoice created"),
        totalPaisa: savedTotalPaisa,
        phone: savedPhone
      });
      
      const format = actionAfterSave === "print-thermal" ? "thermal" : "a4";
      setModalPrintFormat(format);
      
      setSavedSaleDetails({
        sale: result.data?.sale,
        items: result.data?.items
      });

      if (actionAfterSave === "print-a4" || actionAfterSave === "print-thermal") {
        setTimeout(() => {
          window.print();
        }, 500);
      } else if (actionAfterSave === "share") {
        const whatsappText = encodeURIComponent(
          `Medicare invoice ${String(result.data?.sale?.invoice_no ?? "invoice created")} from ${tenant.name}. Total: ${formatCurrency(savedTotalPaisa)}. Thank you.`
        );
        const whatsappHref = savedPhone ? `https://wa.me/91${savedPhone.replace(/\D/g, "").slice(-10)}?text=${whatsappText}` : `https://wa.me/?text=${whatsappText}`;
        window.open(whatsappHref, "_blank");
      }

      setLines([]);
      setQuery("");
      setCustomerName("");
      setCustomerPhone("");
      setDoctorName("");
      setPrescriptionNo("");
      toast.success(`Bill saved: ${result.data?.sale?.invoice_no ?? "invoice created"}`);
    } catch {
      toast.error("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }



  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm no-print">
        {/* ─── Search + Scanner Controls ─── */}
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_160px]">
          <label className="relative">
            {searching ? <Loader2 className="absolute left-3 top-3 h-5 w-5 animate-spin text-med-green" /> : <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />}
            <input
              ref={searchInputRef}
              className="h-12 w-full rounded-md border border-slate-300 pl-10 pr-16 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20"
              placeholder="Search medicine name, salt, or barcode..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setQuery(""); e.currentTarget.blur(); } }}
            />
            <kbd className="absolute right-3 top-3.5 hidden rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400 md:inline-block">F2</kbd>
          </label>
          <button
            onClick={startScanning}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-3 font-semibold transition-colors ${
              scanning
                ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                : "border-slate-300 text-med-navy hover:bg-slate-50"
            }`}
          >
            {scanning ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            {scanning ? "Stop" : "Scan"}
          </button>
          <button
            onClick={() => setShowManualBarcode(!showManualBarcode)}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-3 font-semibold ${
              showManualBarcode ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-300 text-med-navy hover:bg-slate-50"
            }`}
          >
            <Keyboard className="h-4 w-4" />
            Barcode
          </button>
          <select className="h-12 rounded-md border border-slate-300 px-3" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="credit">Credit</option>
          </select>
        </div>

        {/* ─── Camera Scanner View ─── */}
        {scanning && (
          <div className="relative mt-3 overflow-hidden rounded-lg bg-slate-900">
            <video ref={videoRef} className="h-56 w-full object-cover" muted autoPlay playsInline />
            {/* Scanning overlay with animated scan line + corner marks */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-32 w-72">
                {/* Corner marks */}
                <div className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-green-400 rounded-tl" />
                <div className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-green-400 rounded-tr" />
                <div className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-green-400 rounded-bl" />
                <div className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-green-400 rounded-br" />
                {/* Animated scan line */}
                <div className="absolute inset-x-2 top-0 h-0.5 animate-bounce bg-gradient-to-r from-transparent via-green-400 to-transparent" style={{ animationDuration: '2s' }} />
              </div>
            </div>
            {/* Countdown + status bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{scanStatus}</p>
                  <p className="text-xs text-white/60">Hold steady • Ensure good lighting</p>
                </div>
                <div className="flex items-center gap-2">
                  {torchSupported && (
                    <button onClick={() => toggleTorch()} className={`rounded-full p-1.5 transition-colors ${torchEnabled ? "bg-yellow-400 text-slate-900" : "bg-white/20 text-white hover:bg-white/30"}`} title={torchEnabled ? "Turn off flash" : "Turn on flash"}>
                      {torchEnabled ? <FlashlightOff className="h-3.5 w-3.5" /> : <Flashlight className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-mono text-white">
                    <Clock className="h-3 w-3" /> {scanCountdown}s
                  </span>
                  <button onClick={stopScanning} className="rounded-full bg-red-500/90 p-1.5 text-white hover:bg-red-600">
                    <CameraOff className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hidden video element for when not scanning (used as target by library) */}
        {!scanning && <video ref={videoRef} className="hidden" muted />}
        {/* Hidden canvas for brightness detection */}
        <canvas ref={canvasRef} className="hidden" />

        {/* ─── Manual Barcode Entry ─── */}
        {showManualBarcode && (
          <div className="mt-3 flex gap-2 rounded-md border border-blue-200 bg-blue-50 p-3">
            <Keyboard className="mt-2.5 h-5 w-5 shrink-0 text-blue-500" />
            <div className="flex-1">
              <p className="mb-1.5 text-xs font-semibold text-blue-900">Manual Barcode Entry</p>
              <div className="flex gap-2">
                <input
                  className="h-10 flex-1 rounded-md border border-blue-300 bg-white px-3 font-mono text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                  placeholder="Type or paste barcode number..."
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && lookupManualBarcode()}
                  autoFocus
                />
                <button
                  onClick={lookupManualBarcode}
                  className="inline-flex h-10 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Search className="h-3.5 w-3.5" /> Look up
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Search Results (Inventory Matches) ─── */}
        {matches.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5">
              <span className="text-xs font-medium text-slate-500">{matches.length} result{matches.length !== 1 ? "s" : ""} found</span>
            </div>
            {matches.slice(0, 10).map((row) => {
              const expDays = daysUntil(row.expiryDate);
              const isExpired = expDays < 0;
              const isNearExpiry = expDays >= 0 && expDays <= 30;
              const isLowStock = row.quantity > 0 && row.quantity <= 10;
              
              const unitsPerPack = parseUnitsPerPack(row.medicine.packSize);
              const packs = Math.floor(row.quantity / unitsPerPack);
              const loose = row.quantity % unitsPerPack;
              
              let stockLabelText = "";
              if (row.quantity <= 0) {
                stockLabelText = "Out of stock";
              } else if (unitsPerPack > 1) {
                stockLabelText = `${packs} Pack${packs !== 1 ? "s" : ""}`;
                if (loose > 0) {
                  stockLabelText += ` + ${loose} Unit${loose !== 1 ? "s" : ""}`;
                }
              } else {
                stockLabelText = `${row.quantity} Unit${row.quantity !== 1 ? "s" : ""}`;
              }

              return (
                <button key={row.id} onClick={() => addLine(row.id)} disabled={isExpired || row.quantity <= 0} className={`grid w-full gap-2 border-b border-slate-100 p-3 text-left md:grid-cols-[1fr_auto] ${
                  isExpired ? "bg-red-50/50 opacity-60 cursor-not-allowed" : "hover:bg-med-greenSoft"
                }`}>
                  <div>
                    <span className="block font-semibold text-med-navy">{row.medicine.name}</span>
                    <span className="text-xs text-slate-500">
                      {row.medicine.genericName && <>{row.medicine.genericName} • </>}
                      Batch {row.batchNo}
                      {row.medicine.manufacturer && <> • {row.medicine.manufacturer}</>}
                      {row.medicine.packSize && <> • {row.medicine.packSize}</>}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.quantity <= 0 ? "bg-red-100 text-red-700" : isLowStock ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {stockLabelText}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isExpired ? "bg-red-100 text-red-700" : isNearExpiry ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {isExpired ? "Expired" : isNearExpiry ? `Exp ${expDays}d ⚠️` : `Exp ${expDays}d`}
                    </span>
                    <span className="rounded-full bg-med-greenSoft px-2 py-0.5 text-xs font-semibold text-med-greenDark">
                      {formatCurrency(row.saleRatePaisa)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ─── Medicine Suggestions (from master, not in inventory) ─── */}
        {matches.length === 0 && suggestions.length > 0 && query.length >= 2 && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" /> These medicines exist in master but have no stock:
            </p>
            {suggestions.slice(0, 5).map((med) => (
              <div key={med.id} className="flex items-center justify-between border-b border-amber-100 py-1.5 last:border-b-0">
                <span className="text-sm">
                  <span className="font-medium text-amber-900">{med.name}</span>
                  {med.genericName && <span className="ml-1 text-amber-700">({med.genericName})</span>}
                </span>
                <Link href="/shop/inventory/add" className="rounded bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900 hover:bg-amber-300">
                  Add stock
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* ─── "Not Found" — Smart Suggestions + Manual Add ─── */}
        {query.length >= 2 && matches.length === 0 && suggestions.length === 0 && !showAddMedicine && (
          <div className="mt-3 space-y-3">
            {/* Smart Suggestions */}
            {(drugMasterHits.length > 0 || drugMasterLoading) && (
              <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-blue-800">
                  {drugMasterLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                  ) : (
                    <Database className="h-3.5 w-3.5 text-blue-500" />
                  )}
                  {drugMasterLoading ? "Searching medicines..." : `Found ${drugMasterHits.length} matching medicines`}
                  <Sparkles className="h-3 w-3 text-blue-400 ml-auto" />
                </p>
                {drugMasterHits.slice(0, 5).map((hit, i) => (
                  <div key={`dm-${hit.name}-${i}`} className="flex items-center justify-between border-b border-blue-100/50 py-2 last:border-b-0">
                    <div>
                      <span className="text-sm font-semibold text-slate-900">{hit.name}</span>
                      {hit.genericName && <span className="ml-1.5 text-xs text-slate-600">({hit.genericName})</span>}
                      {hit.mrpPaisa > 0 && <span className="ml-1.5 text-xs font-medium text-emerald-600">₹{(hit.mrpPaisa / 100).toFixed(2)}</span>}
                      <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">Verified ✓</span>
                    </div>
                    <button
                      onClick={() => {
                        setAddMedicinePrefill({ name: hit.name });
                        setShowAddMedicine(true);
                        toast.info(`Quick-add form opened for "${hit.name}"`);
                      }}
                      className="rounded-md bg-med-green px-2.5 py-1 text-xs font-semibold text-white hover:bg-med-greenDark transition-colors"
                    >
                      <Plus className="inline h-3 w-3 mr-0.5" /> Quick Add
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Manual add fallback */}
            {!drugMasterLoading && drugMasterHits.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-600">No medicine found for &quot;{query}&quot;</p>
                <button
                  onClick={() => {
                    setAddMedicinePrefill({ name: query, ...addMedicinePrefill });
                    setShowAddMedicine(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" /> Add New Medicine Manually
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Inline Add Medicine Form ─── */}
        {showAddMedicine && (
          <div className="mt-3">
            <AddMedicineForm
              mode="inline"
              prefillBarcode={addMedicinePrefill.barcode}
              prefillName={addMedicinePrefill.name}
              onSuccess={handleQuickAddSuccess}
              onCancel={() => { setShowAddMedicine(false); setAddMedicinePrefill({}); }}
            />
          </div>
        )}

        {/* ─── Bill Items — Desktop Table ─── */}
        <div className="mt-4 hidden md:block overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-500">
                {["Medicine", "Batch", "Qty", "Rate", "Disc%", "GST", "Amt", ""].map((head) => (
                  <th key={head} className="border-b border-slate-200 px-2 py-2.5 font-medium text-xs">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const total = totals.lineTotals[index];
                return (
                  <tr key={line.inventoryId} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-medium text-med-navy text-xs">
                      <span className="block leading-tight">{line.medicineName}</span>
                      {(line.schedule === "H" || line.schedule === "H1" || line.schedule === "X") && (
                        <span className="ml-0 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] text-orange-700">{line.schedule}</span>
                      )}
                      <span className="block text-[10px] text-slate-400 mt-0.5">MRP {formatCurrency(line.mrpPaisa)}</span>
                    </td>
                    <td className="px-2 py-2 font-mono text-[10px]">{line.batchNo}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-0.5">
                        <button className="rounded border p-1" onClick={() => updateLine(line.inventoryId, { quantity: Math.max(1, line.quantity - 1) })}><Minus className="h-3 w-3" /></button>
                        <input className="h-7 w-10 rounded border text-center text-xs" type="number" min={1} max={line.maxQuantity} value={line.quantity} onChange={(event) => updateLine(line.inventoryId, { quantity: Number(event.target.value) || 1 })} />
                        <button className="rounded border p-1" onClick={() => updateLine(line.inventoryId, { quantity: line.quantity + 1 })}><Plus className="h-3 w-3" /></button>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-400">Avl {line.maxQuantity}</p>
                    </td>
                    <td className="px-2 py-2">
                      <input className="h-7 w-20 rounded border px-1.5 text-xs" type="number" value={line.saleRatePaisa / 100} onChange={(event) => updateLine(line.inventoryId, { saleRatePaisa: Math.round(Number(event.target.value) * 100) })} />
                    </td>
                    <td className="px-2 py-2">
                      <input className="h-7 w-12 rounded border px-1 text-xs" type="number" value={line.discountPercent} onChange={(event) => updateLine(line.inventoryId, { discountPercent: Number(event.target.value) })} />
                    </td>
                    <td className="px-2 py-2 text-xs">{line.gstRate}%</td>
                    <td className="px-2 py-2 font-semibold text-xs">{formatCurrency(total.totalPaisa)}</td>
                    <td className="px-1 py-2">
                      <button className="rounded p-1.5 text-red-600 hover:bg-red-50" onClick={() => setLines((current) => current.filter((item) => item.inventoryId !== line.inventoryId))} aria-label="Remove item">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ─── Bill Items — Mobile Card Layout ─── */}
        <div className="mt-4 space-y-3 md:hidden">
          {lines.map((line, index) => {
            const total = totals.lineTotals[index];
            return (
              <div key={line.inventoryId} className="relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <button className="absolute right-2 top-2 rounded-full p-1.5 text-red-500 hover:bg-red-50" onClick={() => setLines((current) => current.filter((item) => item.inventoryId !== line.inventoryId))} aria-label="Remove item">
                  <Trash2 className="h-4 w-4" />
                </button>
                <p className="pr-8 font-semibold text-sm text-med-navy">{line.medicineName}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  {(line.schedule === "H" || line.schedule === "H1" || line.schedule === "X") && (
                    <span className="rounded bg-orange-100 px-1.5 py-0.5 text-orange-700">{line.schedule}</span>
                  )}
                  <span>Batch {line.batchNo}</span>
                  <span>MRP {formatCurrency(line.mrpPaisa)}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] font-medium text-slate-500 mb-1">Quantity</p>
                    <div className="flex items-center gap-1">
                      <button className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 active:bg-slate-100" onClick={() => updateLine(line.inventoryId, { quantity: Math.max(1, line.quantity - 1) })}><Minus className="h-4 w-4" /></button>
                      <input className="h-9 w-12 rounded-md border text-center text-sm" type="number" min={1} max={line.maxQuantity} value={line.quantity} onChange={(event) => updateLine(line.inventoryId, { quantity: Number(event.target.value) || 1 })} />
                      <button className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 active:bg-slate-100" onClick={() => updateLine(line.inventoryId, { quantity: line.quantity + 1 })}><Plus className="h-4 w-4" /></button>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400">Avl {line.maxQuantity}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-500 mb-1">Rate (₹)</p>
                    <input className="h-9 w-full rounded-md border px-2 text-sm" type="number" value={line.saleRatePaisa / 100} onChange={(event) => updateLine(line.inventoryId, { saleRatePaisa: Math.round(Number(event.target.value) * 100) })} />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-500 mb-1">Disc %</p>
                    <input className="h-9 w-full rounded-md border px-2 text-sm" type="number" value={line.discountPercent} onChange={(event) => updateLine(line.inventoryId, { discountPercent: Number(event.target.value) })} />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-xs text-slate-500">GST {line.gstRate}%</span>
                  <span className="text-sm font-bold text-med-navy">{formatCurrency(total.totalPaisa)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Empty State ─── */}
        {!lines.length && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Search className="h-7 w-7 text-slate-400" />
            </div>
            <p className="font-medium text-slate-600">Search a medicine or scan a barcode to begin</p>
            <p className="mt-1 text-sm text-slate-400">You can also use an external barcode scanner</p>
            <div className="mx-auto mt-4 hidden md:flex flex-wrap justify-center gap-2">
              <kbd className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">F2 Search</kbd>
              <kbd className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">F3 Camera</kbd>
              <kbd className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">F4 Barcode</kbd>
              <kbd className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">F8 Save</kbd>
            </div>
            <p className="mt-3 text-xs text-slate-400 md:hidden">Use the toolbar below to search, scan, or type a barcode</p>
          </div>
        )}
      </section>

      {/* ─── Mobile Floating Action Bar ─── */}
      <div className="mobile-fab gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm no-print">
        <button onClick={() => searchInputRef.current?.focus()} className="flex h-12 w-12 flex-col items-center justify-center rounded-xl text-slate-600 active:bg-slate-100" aria-label="Search medicine">
          <Search className="h-5 w-5" />
          <span className="mt-0.5 text-[9px]">Search</span>
        </button>
        <button onClick={startScanning} className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl active:bg-slate-100 ${scanning ? "text-red-600" : "text-slate-600"}`} aria-label="Scan barcode">
          {scanning ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
          <span className="mt-0.5 text-[9px]">{scanning ? "Stop" : "Scan"}</span>
        </button>
        <button onClick={() => setShowManualBarcode(!showManualBarcode)} className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl active:bg-slate-100 ${showManualBarcode ? "text-blue-600" : "text-slate-600"}`} aria-label="Manual barcode">
          <Keyboard className="h-5 w-5" />
          <span className="mt-0.5 text-[9px]">Barcode</span>
        </button>
        <button onClick={() => saveBill("none")} disabled={saving || !lines.length} className="flex h-12 w-12 flex-col items-center justify-center rounded-xl text-med-green disabled:opacity-40 active:bg-med-greenSoft" aria-label="Save bill">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          <span className="mt-0.5 text-[9px]">{saving ? "..." : "Save"}</span>
        </button>
      </div>

      <aside className="space-y-4 no-print">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-med-navy">Customer</h2>
          {/* Quick-select chips */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => { setCustomerName("Walk-in Customer"); setCustomerPhone(""); setDoctorName(""); setShowCustomerDropdown(false); }} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${customerName === "Walk-in Customer" ? "bg-med-green text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              Walk-in Customer
            </button>
            <button type="button" onClick={() => { setCustomerName(""); setCustomerPhone(""); setDoctorName(""); searchInputRef.current?.focus(); }} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200">
              <Plus className="mr-1 inline h-3 w-3" /> New
            </button>
          </div>
          {/* Customer name with autocomplete dropdown */}
          <div className="relative mt-3" ref={customerDropdownRef}>
            <input
              className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20"
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(event) => { setCustomerName(event.target.value); setShowCustomerDropdown(true); setCustomerSearch(event.target.value); }}
              onFocus={() => setShowCustomerDropdown(true)}
            />
            {showCustomerDropdown && filteredCustomers.length > 0 && customerName !== "Walk-in Customer" && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {filteredCustomers.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setCustomerName(c.name); setCustomerPhone(c.phone ?? ""); setDoctorName(c.doctorName ?? ""); setShowCustomerDropdown(false); setCustomerSearch(""); }} className="flex w-full items-center gap-3 border-b border-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-med-greenSoft">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-med-green/10 text-xs font-bold text-med-green">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-med-navy">{c.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {c.phone || "No phone"}{c.doctorName ? ` • Dr. ${c.doctorName}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            className="mt-3 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20"
            placeholder="Phone (type to search)"
            value={customerPhone}
            onChange={(event) => {
              const val = event.target.value;
              setCustomerPhone(val);
              setCustomerSearch(val);
              // Auto-fill customer name+doctor when phone matches
              if (val.replace(/\D/g, "").length >= 10) {
                const match = customers.find(c => c.phone?.replace(/\D/g, "").endsWith(val.replace(/\D/g, "").slice(-10)));
                if (match) {
                  setCustomerName(match.name);
                  setDoctorName(match.doctorName ?? "");
                  setShowCustomerDropdown(false);
                  toast.success(`Customer: ${match.name}`, { duration: 2000 });
                }
              }
            }}
          />
          <input className="mt-3 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20" placeholder="Doctor name" value={doctorName} onChange={(event) => setDoctorName(event.target.value)} />
          <input className="mt-3 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20" placeholder="Prescription number" value={prescriptionNo} onChange={(event) => setPrescriptionNo(event.target.value)} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-med-navy">Bill Summary</h2>
            {lines.length > 0 && (
              <span className="rounded-full bg-med-green px-2.5 py-0.5 text-xs font-bold text-white">
                {totalItems} item{totalItems !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <Summary label="Subtotal" value={totals.subtotalPaisa} />
            {totals.discountPaisa > 0 && <Summary label="Discount" value={-totals.discountPaisa} />}
            <Summary label="Taxable" value={totals.taxablePaisa} />
            <Summary label="CGST" value={totals.cgstPaisa} />
            <Summary label="SGST" value={totals.sgstPaisa} />
            {totals.roundOffPaisa !== 0 && <Summary label="Round off" value={totals.roundOffPaisa} />}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-lg font-bold text-med-navy">
              <span>Total</span>
              <span>{formatCurrency(totals.totalPaisa)}</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => saveBill("none")} disabled={saving || !lines.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-slate-50 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 transition-all">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
            <button onClick={() => saveBill("print-a4")} disabled={saving || !lines.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-med-green font-semibold text-white hover:bg-med-greenDark disabled:opacity-60 transition-all">
              <Printer className="h-4 w-4" /> Print A4 <span className="text-[10px] opacity-70">(F8)</span>
            </button>
            <button onClick={() => saveBill("print-thermal")} disabled={saving || !lines.length} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-sky-600 font-semibold text-white hover:bg-sky-700 disabled:opacity-60 transition-all">
              <Printer className="h-4 w-4" /> Print Thermal Roll <span className="text-[10px] opacity-70">(F9)</span>
            </button>
            <button onClick={() => saveBill("share")} disabled={saving || !lines.length} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700 hover:bg-emerald-100/70 disabled:opacity-60 transition-all">
              <Send className="h-4 w-4" /> Save & Share on WhatsApp
            </button>
            {lines.length > 0 && (
              <button
                onClick={() => { if (window.confirm(`Clear all ${lines.length} items from this bill?`)) { setLines([]); toast.info("Bill cleared."); } }}
                className="col-span-2 inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear Bill
              </button>
            )}
          </div>
          {lastInvoice ? (
            <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <p className="font-semibold text-emerald-800">Saved {lastInvoice.invoiceNo}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link href={`/shop/billing/${encodeURIComponent(lastInvoice.id || lastInvoice.invoiceNo)}`} className="rounded-md bg-white px-3 py-2 font-semibold text-med-greenDark shadow-sm">
                  View invoice
                </Link>
                <Link href="/shop/billing/history" className="rounded-md bg-white px-3 py-2 font-semibold text-med-navy shadow-sm">
                  Bill history
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </aside>

      {/* Render the Exact Bill Detail Client Component Overlay Modal */}
      {savedSaleDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto print:static print:bg-white print:p-0 print:block print:overflow-visible print:z-0">
          <div className="relative w-full max-w-5xl rounded-2xl bg-slate-100 p-6 shadow-2xl overflow-y-auto max-h-[92vh] print:bg-white print:p-0 print:border-0 print:shadow-none print:max-h-none print:overflow-visible">
            {/* Modal Header */}
            <div className="mb-4 flex items-center justify-between no-print">
              <h3 className="text-lg font-bold text-slate-800">Print / Share Saved Invoice</h3>
              <button
                onClick={() => {
                  setSavedSaleDetails(null);
                  setLastInvoice(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Render the Exact Bill Detail Client Component */}
            <div className="bg-white rounded-xl shadow-inner border border-slate-200 p-4 overflow-y-auto max-h-[70vh] print:p-0 print:shadow-none print:border-0 print:max-h-none print:overflow-visible">
              <BillDetailClient
                sale={savedSaleDetails.sale}
                items={savedSaleDetails.items}
                tenant={tenant}
                initialFormat={modalPrintFormat}
              />
            </div>

            {/* Modal Footer Controls */}
            <div className="mt-4 flex justify-end gap-3 no-print">
              <button
                onClick={() => {
                  setSavedSaleDetails(null);
                  setLastInvoice(null);
                  setTimeout(() => {
                    searchInputRef.current?.focus();
                  }, 50);
                }}
                className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-all active:scale-95 animate-fade-in"
              >
                Close & Start Next Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-med-navy">{formatCurrency(value)}</span>
    </div>
  );
}
