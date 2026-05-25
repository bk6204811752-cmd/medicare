"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraOff, ChevronDown, ChevronUp, Database, FileImage, Keyboard, Loader2, Minus, PackagePlus, Plus, Printer, RotateCcw, Save, Search, Send, Sparkles, Trash2, Upload, AlertTriangle, Clock, Zap, Flashlight, FlashlightOff, UserPlus, X, ShoppingCart, Users } from "lucide-react";
import { toast } from "sonner";
import { calculateBillTotals } from "@/lib/gst";
import type { SaleLine } from "@/lib/types";
import { daysUntil, formatCurrency, parseUnitsPerPack } from "@/lib/utils";
import { AddMedicineForm } from "@/components/add-medicine-form";
import { BarcodeScanner } from "@/components/barcode-scanner";
import type { DrugMasterSuggestion } from "@/components/drug-master-confirm-modal";
import { BillDetailClient } from "@/app/(app)/shop/billing/[id]/BillDetailClient";



type InventorySearchRow = {
  id: string;
  medicineId: string;
  batchNo: string;
  expiryDate: string;
  mrpPaisa: number;
  saleRatePaisa: number;
  gstRate: SaleLine["gstRate"];
  hsnCode: string;
  quantity: number;
  isGenericSubstitute?: boolean;
  substituteFor?: string;
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
  medicineId?: string;
  genericName?: string | null;
};

const SEVERE_INTERACTIONS: Record<string, Record<string, string>> = {
  "aspirin": {
    "warfarin": "Severe risk of major GI bleeding or systemic hemorrhages due to antiplatelet and anticoagulant synergy.",
    "ibuprofen": "Increased risk of gastrointestinal ulceration and bleeding; NSAIDs may also decrease the cardioprotective effect of aspirin.",
    "naproxen": "Increased risk of gastrointestinal ulceration and bleeding.",
    "methotrexate": "Aspirin decreases methotrexate renal clearance, leading to life-threatening methotrexate toxicity (bone marrow suppression)."
  },
  "warfarin": {
    "aspirin": "Severe risk of major GI bleeding or systemic hemorrhages due to antiplatelet and anticoagulant synergy.",
    "ibuprofen": "Increased risk of gastrointestinal bleeding; NSAIDs can damage GI mucosa and have antiplatelet effects.",
    "naproxen": "Increased risk of gastrointestinal bleeding.",
    "amiodarone": "Amiodarone increases warfarin levels, dramatically elevating the risk of bleeding. Prothrombin time/INR must be monitored.",
    "clarithromycin": "Clarithromycin increases warfarin levels, elevating bleeding risks.",
    "erythromycin": "Erythromycin increases warfarin levels, elevating bleeding risks."
  },
  "sildenafil": {
    "nitroglycerin": "Co-administration causes severe, life-threatening hypotension due to synergistic nitric oxide / cGMP vasodilation.",
    "isosorbide dinitrate": "Co-administration causes severe, life-threatening hypotension.",
    "isosorbide mononitrate": "Co-administration causes severe, life-threatening hypotension."
  },
  "tadalafil": {
    "nitroglycerin": "Co-administration causes severe, life-threatening hypotension.",
    "isosorbide dinitrate": "Co-administration causes severe, life-threatening hypotension.",
    "isosorbide mononitrate": "Co-administration causes severe, life-threatening hypotension."
  },
  "amlodipine": {
    "simvastatin": "Amlodipine increases Simvastatin exposure, elevating the risk of Simvastatin-induced myopathy and rhabdomyolysis."
  },
  "simvastatin": {
    "amlodipine": "Amlodipine increases Simvastatin exposure, elevating the risk of myopathy.",
    "clarithromycin": "Clarithromycin increases Simvastatin exposure, elevating myopathy/rhabdomyolysis risk.",
    "erythromycin": "Erythromycin increases Simvastatin exposure, elevating myopathy/rhabdomyolysis risk."
  },
  "atorvastatin": {
    "clarithromycin": "Clarithromycin increases Atorvastatin exposure, elevating rhabdomyolysis risk.",
    "erythromycin": "Erythromycin increases Atorvastatin exposure, elevating rhabdomyolysis risk."
  },
  "spironolactone": {
    "potassium chloride": "Co-administration causes severe hyperkalemia which can lead to life-threatening cardiac arrhythmias."
  },
  "metformin": {
    "contrast media": "Iodinated contrast media can cause acute kidney injury, leading to Metformin accumulation and severe lactic acidosis."
  },
  "tramadol": {
    "fluoxetine": "Increased risk of serotonin syndrome and seizures.",
    "sertraline": "Increased risk of serotonin syndrome and seizures.",
    "escitalopram": "Increased risk of serotonin syndrome and seizures."
  },
  "clopidogrel": {
    "omeprazole": "Omeprazole decreases the conversion of clopidogrel to its active metabolite, significantly reducing its antiplatelet efficacy.",
    "esomeprazole": "Esomeprazole decreases clopidogrel active metabolite levels, reducing efficacy."
  },
  "digoxin": {
    "amiodarone": "Amiodarone increases Digoxin levels by reducing renal clearance, increasing risk of life-threatening Digoxin toxicity."
  },
  "ciprofloxacin": {
    "tizanidine": "Ciprofloxacin inhibits tizanidine metabolism, causing severe hypotension, bradycardia, and drowsiness."
  }
};

function extractIngredients(genericName: string | undefined | null): string[] {
  if (!genericName) return [];
  const cleaned = genericName
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b/g, "")
    .replace(/[^a-z0-9\s+/&]/g, "");
    
  return cleaned
    .split(/\s*(?:\+|\/|&|\band\b|\bwith\b)\s*/)
    .map(i => i.trim())
    .filter(i => i.length > 2);
}

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
  const [availableBatches, setAvailableBatches] = useState<Record<string, InventorySearchRow[]>>({});

  // ─── Dynamic Drug-Drug Interaction Checker ───
  const cartInteractions = useMemo(() => {
    const interactions: { ingredientA: string; ingredientB: string; description: string; brandA: string; brandB: string }[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const lineA = lines[i];
      const ingredientsA = extractIngredients(lineA.genericName);
      
      for (let j = i + 1; j < lines.length; j++) {
        const lineB = lines[j];
        const ingredientsB = extractIngredients(lineB.genericName);
        
        for (const ingA of ingredientsA) {
          for (const ingB of ingredientsB) {
            const desc = SEVERE_INTERACTIONS[ingA]?.[ingB] || SEVERE_INTERACTIONS[ingB]?.[ingA];
            if (desc) {
              interactions.push({
                ingredientA: ingA,
                ingredientB: ingB,
                description: desc,
                brandA: lineA.medicineName,
                brandB: lineB.medicineName
              });
            }
          }
        }
      }
    }
    return interactions;
  }, [lines]);

  // ─── Background Alternative Batches Loader ───
  useEffect(() => {
    const medIds = lines.map((l) => l.medicineId).filter((id): id is string => !!id);
    medIds.forEach((medId) => {
      if (availableBatches[medId]) return;
      fetch(`/api/inventory?medicineId=${encodeURIComponent(medId)}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            setAvailableBatches((prev) => ({ ...prev, [medId]: json.data }));
          }
        })
        .catch((err) => console.error("Failed to load alternative batches for:", medId, err));
    });
  }, [lines, availableBatches]);

  const [recoveredCart, setRecoveredCart] = useState<any | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // ─── Auto-Saving Cart Cache Effect ───
  useEffect(() => {
    if (!tenant?.id) return;
    const cacheKey = `medicare_cart_cache_${tenant.id}`;
    if (lines.length > 0) {
      const cacheData = {
        lines,
        customerName,
        customerPhone,
        doctorName,
        prescriptionNo,
        paymentMode,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } else {
      localStorage.removeItem(cacheKey);
    }
  }, [lines, customerName, customerPhone, doctorName, prescriptionNo, paymentMode, tenant?.id]);

  // ─── Mount-Time Cache Recovery Detector ───
  useEffect(() => {
    if (!tenant?.id) return;
    const cacheKey = `medicare_cart_cache_${tenant.id}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const isFresh = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000; // 24-hour expiration
        if (isFresh && parsed.lines && parsed.lines.length > 0) {
          setRecoveredCart(parsed);
          setShowRecoveryModal(true);
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (err) {
      console.error("Failed to parse cached cart:", err);
    }
  }, [tenant?.id]);

  const [showManualBarcode, setShowManualBarcode] = useState(false);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [addMedicinePrefill, setAddMedicinePrefill] = useState<{ barcode?: string; name?: string }>({});
  const [lastScanCode, setLastScanCode] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const customerDropdownRef = useRef<HTMLDivElement | null>(null);
  const [searching, setSearching] = useState(false);
  const [drugMasterHits, setDrugMasterHits] = useState<DrugMasterSuggestion[]>([]);
  const [drugMasterLoading, setDrugMasterLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState<"cart" | "checkout">("cart");
  const [modalAutoShare, setModalAutoShare] = useState(false);
  // Prescription upload prompt for H1 medicines
  const [showPrescriptionUpload, setShowPrescriptionUpload] = useState(false);
  const [prescriptionSaleId, setPrescriptionSaleId] = useState<string | null>(null);
  const [prescriptionUploading, setPrescriptionUploading] = useState(false);
  const prescriptionFileRef = useRef<HTMLInputElement>(null);
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
          maxQuantity: Number(item.quantity),
          medicineId: item.medicineId,
          genericName: item.medicine.genericName
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

  const handleRestoreCart = () => {
    if (!recoveredCart) return;
    setLines(recoveredCart.lines);
    setCustomerName(recoveredCart.customerName || "");
    setCustomerPhone(recoveredCart.customerPhone || "");
    setDoctorName(recoveredCart.doctorName || "");
    setPrescriptionNo(recoveredCart.prescriptionNo || "");
    setPaymentMode(recoveredCart.paymentMode || "cash");
    setShowRecoveryModal(false);
    setRecoveredCart(null);
    toast.success("🛒 Unsaved cart successfully restored!");
  };

  const handleDiscardCart = () => {
    if (tenant?.id) {
      localStorage.removeItem(`medicare_cart_cache_${tenant.id}`);
    }
    setShowRecoveryModal(false);
    setRecoveredCart(null);
    toast.info("🗑️ Unsaved cart has been discarded.");
  };

  function updateLine(inventoryId: string, patch: Partial<BillingLine>) {
    setLines((current) =>
      current.map((line) => {
        if (line.inventoryId !== inventoryId) return line;
        const next = { ...line, ...patch };
        next.quantity = Math.min(Math.max(0, isNaN(Number(next.quantity)) ? 0 : Number(next.quantity)), line.maxQuantity);
        next.discountPercent = Math.min(Math.max(0, isNaN(Number(next.discountPercent)) ? 0 : Number(next.discountPercent)), 100);
        next.saleRatePaisa = Math.max(0, isNaN(Number(next.saleRatePaisa)) ? 0 : Number(next.saleRatePaisa));
        return next;
      })
    );
  }

  function switchBatch(currentInventoryId: string, nextItem: InventorySearchRow) {
    setLines((current) =>
      current.map((line) => {
        if (line.inventoryId !== currentInventoryId) return line;
        
        // Prevent swapping to a batch that is already added in the bill
        const exists = current.find((l) => l.inventoryId === nextItem.id);
        if (exists) {
          toast.warning(`${nextItem.medicine.name} (Batch: ${nextItem.batchNo}) is already in your bill.`);
          return line;
        }

        toast.success(`Swapped to Batch: ${nextItem.batchNo}`);
        return {
          ...line,
          inventoryId: nextItem.id,
          batchNo: nextItem.batchNo,
          expiryDate: nextItem.expiryDate,
          mrpPaisa: Number(nextItem.mrpPaisa),
          saleRatePaisa: Number(nextItem.saleRatePaisa),
          maxQuantity: Number(nextItem.quantity),
          quantity: Math.min(line.quantity, Number(nextItem.quantity))
        };
      })
    );
  }

  // ─── Camera barcode scanner triggers ───
  function startScanning() {
    setScanning(true);
  }

  function stopScanning() {
    setScanning(false);
  }

  async function handleBarcodeResult(code: string, isContinuous = false) {
    if (!isContinuous) {
      setScanning(false);
    }
    setLastScanCode(code);

    try {
      const response = await fetch(`/api/medicines/search?q=${encodeURIComponent(code)}`);
      const resultJson = await response.json();
      const item = resultJson.data?.[0] as InventorySearchRow | undefined;
      if (item) {
        const exact = item.medicine.barcode === code;
        addItemToBill(item);
        toast.success(`✅ ${exact ? "Added" : "Matched & Added"} ${item.medicine.name}`, {
          description: `Batch: ${item.batchNo} • Qty: 1`,
        });
      } else {
        setScanning(false);
        setQuery(code);
        setAddMedicinePrefill({ barcode: code });
        setShowAddMedicine(true);
        toast.warning("Barcode not in stock — quick-add form opened.", { duration: 4000 });
      }
    } catch {
      toast.error("Failed to look up barcode. Try manual entry.");
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
        medicineId: inv.medicineId,
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
    if (lines.some((line) => line.quantity <= 0)) {
      toast.error("Quantity must be greater than 0 for all items.");
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
        setModalAutoShare(false);
        setTimeout(() => {
          window.print();
        }, 1200); // Increased print delay to 1200ms to guarantee dynamic external assets like QR code are downloaded
      } else if (actionAfterSave === "share") {
        setModalAutoShare(true);
      } else {
        setModalAutoShare(false);
      }

      setLines([]);
      setQuery("");
      setCustomerName("");
      setCustomerPhone("");
      setDoctorName("");
      setPrescriptionNo("");
      toast.success(`Bill saved: ${result.data?.sale?.invoice_no ?? "invoice created"}`);

      // Store prescription sale ID for upload but don't show the modal yet (wait until print modal closes)
      const hadControlled = controlled.length > 0;
      if (hadControlled && result.data?.sale?.id) {
        setPrescriptionSaleId(result.data.sale.id);
      }
    } catch {
      toast.error("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePrescriptionUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }

    setPrescriptionUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (prescriptionSaleId) {
        formData.append("saleId", prescriptionSaleId);
      }

      const res = await fetch("/api/upload/prescription", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (res.ok) {
        toast.success("Prescription uploaded successfully!");
        setShowPrescriptionUpload(false);
        setPrescriptionSaleId(null);
      } else {
        toast.error(json.error || "Failed to upload prescription.");
      }
    } catch {
      toast.error("An error occurred during upload.");
    } finally {
      setPrescriptionUploading(false);
      if (prescriptionFileRef.current) {
        prescriptionFileRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Wrapper to hide entire POS layout on print if invoice modal is active */}
      <div className={`flex flex-col gap-4 ${savedSaleDetails ? "print:hidden" : ""}`}>
        {/* Premium Viewport Tab Switcher (Visible on screens < xl) */}
      <div className="sticky top-0 z-30 -mx-4 flex border-b border-slate-200 bg-white/95 p-1.5 backdrop-blur-md xl:hidden no-print">
        <button
          type="button"
          onClick={() => setMobileTab("cart")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all ${
            mobileTab === "cart"
              ? "bg-med-green text-white shadow-sm shadow-med-green/15"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Cart</span>
          {lines.length > 0 && (
            <span className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold transition-colors ${
              mobileTab === "cart" ? "bg-white text-med-green" : "bg-med-green text-white"
            }`}>
              {lines.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("checkout")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all ${
            mobileTab === "checkout"
              ? "bg-med-green text-white shadow-sm shadow-med-green/15"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Checkout</span>
          {customerName && customerName !== "Walk-in Customer" && (
            <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          )}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm no-print ${
          mobileTab === "cart" ? "block" : "hidden xl:block"
        } ${lines.length > 0 ? "pb-24 xl:pb-4" : ""}`}>
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
            className={`hidden md:inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-3 font-semibold transition-colors ${
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
            className={`hidden md:inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-3 font-semibold ${
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

        {/* ─── Shared Camera Barcode Scanner ─── */}
        {scanning && (
          <div className="mt-3">
            <BarcodeScanner
              onScan={(result) => handleBarcodeResult(result.text, true)}
              continuousMode={true}
              onClose={stopScanning}
              fullscreenMobile={true}
            />
          </div>
        )}

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
                <button 
                  key={row.id} 
                  onClick={() => addLine(row.id)} 
                  disabled={isExpired || row.quantity <= 0} 
                  className={`grid w-full gap-2 border-b border-slate-100 p-3 text-left md:grid-cols-[1fr_auto] transition-colors ${
                    isExpired 
                      ? "bg-red-50/50 opacity-60 cursor-not-allowed" 
                      : row.isGenericSubstitute
                        ? "bg-blue-50/45 border-l-4 border-l-blue-500 hover:bg-blue-50"
                        : "hover:bg-med-greenSoft"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-med-navy">{row.medicine.name}</span>
                      {row.isGenericSubstitute && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-extrabold text-blue-700 tracking-wide uppercase">
                          Composition Match (Substitute for {row.substituteFor})
                        </span>
                      )}
                    </div>
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

        {/* ─── "Not Found" — Medicine Database Suggestions + Manual Add ─── */}
        {query.length >= 2 && matches.length === 0 && suggestions.length === 0 && !showAddMedicine && (
          <div className="mt-3 space-y-3">
            {/* Medicine Database Suggestions */}
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
                      <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">Database ✓</span>
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

        {/* ─── Clinical Decision Drug Interaction Banner ─── */}
        {cartInteractions.length > 0 && (
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/65 p-4.5 shadow-sm animate-pulse-slow">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-orange-950">⚠️ Severe Drug Interaction Alert</h4>
                <div className="mt-2 space-y-2">
                  {cartInteractions.map((inter, idx) => (
                    <div key={idx} className="text-xs text-orange-850 leading-relaxed border-l-2 border-orange-300 pl-3">
                      <span className="font-extrabold text-orange-900">{inter.brandA} ({inter.ingredientA})</span>{" "}
                      &{" "}
                      <span className="font-extrabold text-orange-900">{inter.brandB} ({inter.ingredientB})</span>{" "}
                      may interact severely:
                      <p className="mt-0.5 text-[11px] text-orange-800 italic">{inter.description}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-orange-600 font-bold uppercase tracking-wider">
                  ⚠️ Clinical Decision Warning • Please consult doctor before dispensing
                </p>
              </div>
            </div>
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
                    <td className="px-2 py-2">
                      {availableBatches[line.medicineId ?? ""] && availableBatches[line.medicineId ?? ""].length > 1 ? (
                        <select
                          value={line.inventoryId}
                          onChange={(e) => {
                            const selected = availableBatches[line.medicineId ?? ""].find((b) => b.id === e.target.value);
                            if (selected) switchBatch(line.inventoryId, selected);
                          }}
                          className="h-7 rounded border border-slate-250 bg-white px-1 text-[10px] font-mono text-slate-800 outline-none focus:border-med-green focus:ring-1 focus:ring-med-green"
                        >
                          {availableBatches[line.medicineId ?? ""].map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.batchNo} (Avl: {b.quantity})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                          {line.batchNo}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-0.5">
                        <button className="rounded border p-1" onClick={() => updateLine(line.inventoryId, { quantity: Math.max(0, line.quantity - 1) })}><Minus className="h-3 w-3" /></button>
                        <input className="h-7 w-10 rounded border text-center text-xs" type="number" min={0} max={line.maxQuantity} value={line.quantity === 0 ? "" : line.quantity} onChange={(event) => updateLine(line.inventoryId, { quantity: event.target.value === "" ? 0 : Number(event.target.value) })} />
                        <button className="rounded border p-1" onClick={() => updateLine(line.inventoryId, { quantity: line.quantity + 1 })}><Plus className="h-3 w-3" /></button>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-400">Avl {line.maxQuantity}</p>
                    </td>
                    <td className="px-2 py-2">
                      <input className="h-7 w-20 rounded border px-1.5 text-xs" type="number" value={line.saleRatePaisa === 0 ? "" : line.saleRatePaisa / 100} onChange={(event) => updateLine(line.inventoryId, { saleRatePaisa: event.target.value === "" ? 0 : Math.round(Number(event.target.value) * 100) })} />
                    </td>
                    <td className="px-2 py-2">
                      <input className="h-7 w-12 rounded border px-1 text-xs" type="number" value={line.discountPercent === 0 ? "" : line.discountPercent} onChange={(event) => updateLine(line.inventoryId, { discountPercent: event.target.value === "" ? 0 : Number(event.target.value) })} />
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
        <div className="mt-4 space-y-3.5 md:hidden">
          {lines.map((line, index) => {
            const total = totals.lineTotals[index];
            return (
              <div key={line.inventoryId} className="relative rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm hover:shadow-md transition-all animate-slide-up">
                <button className="absolute right-3.5 top-3.5 rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" onClick={() => setLines((current) => current.filter((item) => item.inventoryId !== line.inventoryId))} aria-label="Remove item">
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="pr-10">
                  <p className="font-display font-bold text-base text-med-navy leading-tight">{line.medicineName}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    {(line.schedule === "H" || line.schedule === "H1" || line.schedule === "X") && (
                      <span className="rounded bg-orange-50 border border-orange-150 px-2 py-0.5 text-[10px] font-bold text-orange-700 uppercase tracking-wide">{line.schedule}</span>
                    )}
                    {availableBatches[line.medicineId ?? ""] && availableBatches[line.medicineId ?? ""].length > 1 ? (
                      <div className="flex items-center gap-1 rounded-full bg-blue-50 border border-blue-150 px-2.5 py-0.5 text-[10px] text-blue-700">
                        <span className="font-bold uppercase tracking-wide text-[9px] text-blue-800">Batch:</span>
                        <select
                          value={line.inventoryId}
                          onChange={(e) => {
                            const selected = availableBatches[line.medicineId ?? ""].find((b) => b.id === e.target.value);
                            if (selected) switchBatch(line.inventoryId, selected);
                          }}
                          className="bg-transparent font-mono font-bold outline-none cursor-pointer text-blue-700"
                        >
                          {availableBatches[line.medicineId ?? ""].map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.batchNo} (Avl: {b.quantity})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-500 font-mono">Batch {line.batchNo}</span>
                    )}
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-med-greenDark">MRP {formatCurrency(line.mrpPaisa)}</span>
                  </div>
                </div>
                <div className="mt-4.5 grid grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantity</p>
                    <div className="flex items-center gap-1">
                      <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 active:bg-slate-200 hover:bg-slate-100 transition-colors text-slate-600" onClick={() => updateLine(line.inventoryId, { quantity: Math.max(0, line.quantity - 1) })}><Minus className="h-3.5 w-3.5" /></button>
                      <input className="h-9 w-11 rounded-lg border border-slate-200 text-center text-sm font-semibold text-slate-800 outline-none focus:border-med-green focus:ring-1 focus:ring-med-green" type="number" min={0} max={line.maxQuantity} value={line.quantity === 0 ? "" : line.quantity} onChange={(event) => updateLine(line.inventoryId, { quantity: event.target.value === "" ? 0 : Number(event.target.value) })} />
                      <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 active:bg-slate-200 hover:bg-slate-100 transition-colors text-slate-600" onClick={() => updateLine(line.inventoryId, { quantity: line.quantity + 1 })}><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <p className="mt-1 text-[9px] text-slate-400 font-semibold tracking-wide">Avl: {line.maxQuantity}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rate (₹)</p>
                    <input className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm font-semibold text-slate-800 focus:border-med-green focus:ring-1 focus:ring-med-green outline-none" type="number" value={line.saleRatePaisa === 0 ? "" : line.saleRatePaisa / 100} onChange={(event) => updateLine(line.inventoryId, { saleRatePaisa: event.target.value === "" ? 0 : Math.round(Number(event.target.value) * 100) })} />
                  </div>
                  <div className="col-span-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Disc %</p>
                    <input className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm font-semibold text-slate-800 focus:border-med-green focus:ring-1 focus:ring-med-green outline-none" type="number" value={line.discountPercent === 0 ? "" : line.discountPercent} onChange={(event) => updateLine(line.inventoryId, { discountPercent: event.target.value === "" ? 0 : Number(event.target.value) })} />
                  </div>
                </div>
                <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GST {line.gstRate}%</span>
                  <span className="text-base font-extrabold text-med-greenDark">{formatCurrency(total.totalPaisa)}</span>
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
      <div className={`mobile-fab gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm no-print ${
        lines.length > 0 && mobileTab === "cart" ? "hidden" : ""
      }`}>
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

      {/* ─── Mobile Sticky Floating Checkout Footer (Cart Tab Only) ─── */}
      {mobileTab === "cart" && lines.length > 0 && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur-md xl:hidden no-print">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subtotal</p>
              <p className="text-lg font-extrabold text-med-navy">
                {formatCurrency(totals.totalPaisa)}
              </p>
              <p className="text-[10px] font-semibold text-med-green">
                {totalItems} item{totalItems !== 1 ? "s" : ""} in cart
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMobileTab("checkout")}
              className="flex items-center gap-2 rounded-xl bg-med-green px-6 py-3 font-semibold text-white shadow-md shadow-med-green/20 hover:bg-med-greenDark transition-all active:scale-95 animate-pulse"
            >
              <span>Checkout</span>
              <ShoppingCart className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      )}

      <aside className={`space-y-4 no-print ${
        mobileTab === "checkout" ? "block animate-fade-in" : "hidden xl:block"
      }`}>
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
            <button onClick={() => saveBill("none")} disabled={saving || !lines.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-slate-50 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 transition-all active:scale-[0.97]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
            <button onClick={() => saveBill("print-a4")} disabled={saving || !lines.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-med-green font-semibold text-white hover:bg-med-greenDark disabled:opacity-60 transition-all active:scale-[0.97]">
              <Printer className="h-4 w-4" /> Print A4 <span className="text-[10px] opacity-70">(F8)</span>
            </button>
            <button onClick={() => saveBill("print-thermal")} disabled={saving || !lines.length} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-sky-600 font-semibold text-white hover:bg-sky-700 disabled:opacity-60 transition-all active:scale-[0.97]">
              <Printer className="h-4 w-4" /> Print Thermal Roll <span className="text-[10px] opacity-70">(F9)</span>
            </button>
            <button onClick={() => saveBill("share")} disabled={saving || !lines.length} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700 hover:bg-emerald-100/70 disabled:opacity-60 transition-all active:scale-[0.97]">
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
    </div>
  </div>

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
                autoSharePDF={modalAutoShare}
              />
            </div>

            {/* Modal Footer Controls */}
            <div className="mt-4 flex justify-end gap-3 no-print">
              <button
                onClick={() => {
                  setSavedSaleDetails(null);
                  setLastInvoice(null);
                  if (prescriptionSaleId) {
                    setShowPrescriptionUpload(true);
                  } else {
                    setTimeout(() => {
                      searchInputRef.current?.focus();
                    }, 50);
                  }
                }}
                className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-all active:scale-95 animate-fade-in"
              >
                Close & Start Next Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── H1/H Prescription Upload Prompt ─── */}
      {showPrescriptionUpload && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in no-print" onClick={() => { setShowPrescriptionUpload(false); setPrescriptionSaleId(null); }}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-orange-200 animate-scale-in overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 px-5 py-4">
              <h3 className="font-display text-base font-bold text-orange-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Upload Doctor Prescription
              </h3>
              <p className="mt-1 text-xs text-orange-700">This bill contains Schedule H/H1/X medicines. Upload the doctor&apos;s prescription for legal compliance records.</p>
            </div>
            <div className="p-5 space-y-4">
              <input ref={prescriptionFileRef} type="file" accept="image/*" className="hidden" onChange={handlePrescriptionUpload} />
              <button
                onClick={() => prescriptionFileRef.current?.click()}
                disabled={prescriptionUploading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/50 px-4 py-6 text-sm font-semibold text-orange-800 hover:bg-orange-100/50 hover:border-orange-400 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {prescriptionUploading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="h-5 w-5" /> Take Photo or Select Prescription Image</>
                )}
              </button>
              <div className="flex justify-between items-center">
                <button
                  onClick={() => { setShowPrescriptionUpload(false); setPrescriptionSaleId(null); }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Skip for now
                </button>
                <span className="text-[10px] text-slate-400">You can upload later from Prescriptions page</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Cart Recovery Modal overlay ─── */}
      {showRecoveryModal && recoveredCart && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in no-print" onClick={handleDiscardCart}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 animate-scale-in overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 px-5 py-4">
              <h3 className="font-display text-base font-bold text-emerald-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
                Restore Unsaved Billing Cart?
              </h3>
              <p className="mt-1 text-xs text-emerald-700">
                It looks like you had an active unsaved billing session from earlier today. Would you like to restore it?
              </p>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Unsaved Cart Details Summary Card */}
              <div className="rounded-xl border border-slate-150 bg-slate-50/50 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Customer:</span>
                  <span className="font-bold text-med-navy">
                    {recoveredCart.customerName || "Walk-in Customer"}{" "}
                    {recoveredCart.customerPhone ? `(${recoveredCart.customerPhone})` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Payment Mode:</span>
                  <span className="font-semibold text-slate-700 capitalize">{recoveredCart.paymentMode}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5">
                  <span className="text-slate-400 font-medium">Restoring Items ({recoveredCart.lines.length}):</span>
                  <span className="font-bold text-slate-800 font-mono truncate max-w-[200px]">
                    {recoveredCart.lines.map((l: any) => l.medicineName).slice(0, 3).join(", ")}
                    {recoveredCart.lines.length > 3 ? "..." : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5 text-sm">
                  <span className="text-slate-500 font-bold">Estimated Total:</span>
                  <span className="font-black text-emerald-800">
                    {formatCurrency(
                      recoveredCart.lines.reduce(
                        (sum: number, l: any) =>
                          sum + l.quantity * l.saleRatePaisa * (1 - (l.discountPercent || 0) / 100),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  onClick={handleDiscardCart}
                  className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2.5 text-center text-sm font-bold text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors active:scale-95 duration-100"
                >
                  Discard Cart
                </button>
                <button
                  onClick={handleRestoreCart}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-emerald-600/10 hover:bg-emerald-700 active:scale-95 transition-all duration-100"
                >
                  ⚡ Restore & Continue
                </button>
              </div>
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
