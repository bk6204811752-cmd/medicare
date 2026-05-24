"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { 
  ChevronDown, Database, Plus, Search, Sparkles, X, 
  Camera, Upload, RefreshCw, CheckCircle2, 
  AlertCircle, FileText, Info, HelpCircle, Clipboard,
  Loader2
} from "lucide-react";
import { AddMedicineForm } from "@/components/add-medicine-form";
import type { DrugMasterSuggestion } from "@/components/drug-master-confirm-modal";

type SelectItem = {
  id: string;
  name: string;
  genericName?: string;
  gstRate?: number;
  hsnCode?: string;
  mrpPaisa?: number;
};

// Smart regex parser function to extract invoice fields
function parseInvoiceText(text: string, medicinesList: SelectItem[]) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let detectedMedicineId = "";
  let detectedName = "";
  let detectedBatch = "";
  let detectedExpiry = "";
  let detectedQty = "";
  let detectedPurchaseRate = "";
  let detectedMrp = "";
  let detectedSaleRate = "";
  let detectedGst = "12";
  let detectedHsn = "";

  // Normalize full text for searching
  const textLower = text.toLowerCase();

  // 1. Match medicine from database list
  for (const med of medicinesList) {
    const medNameLower = med.name.toLowerCase();
    if (textLower.includes(medNameLower)) {
      detectedMedicineId = med.id;
      detectedName = med.name;
      detectedGst = String(med.gstRate ?? 12);
      detectedHsn = med.hsnCode ?? "";
      detectedMrp = med.mrpPaisa ? String(med.mrpPaisa / 100) : "";
      detectedSaleRate = detectedMrp;
      break;
    }
  }

  // Token-based fallback similarity matching
  if (!detectedMedicineId) {
    for (const med of medicinesList) {
      const tokens = med.name.toLowerCase().split(/\s+/).filter(t => t.length > 3 && !/^(tablet|capsule|syrup|injection|drops|ointment|cream)$/i.test(t));
      if (tokens.length > 0 && tokens.every(token => textLower.includes(token))) {
        detectedMedicineId = med.id;
        detectedName = med.name;
        detectedGst = String(med.gstRate ?? 12);
        detectedHsn = med.hsnCode ?? "";
        detectedMrp = med.mrpPaisa ? String(med.mrpPaisa / 100) : "";
        detectedSaleRate = detectedMrp;
        break;
      }
    }
  }

  // Fallback: Extract brand names (e.g. Tab Dolo 650, Cap Pan-D)
  if (!detectedName) {
    const medPatterns = [
      /(?:tab|tablet|cap|capsule|syr|syrup|inj|injection|oint|ointment|susp|sachet)\s+([a-zA-Z0-9\-\s]{3,30})/i,
      /\b([a-zA-Z0-9\-]{3,25}\s+(?:650|500|400|200|100|50|20|10|5|2\.5)\s*(?:mg|ml|g))/i
    ];
    for (const pattern of medPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        detectedName = match[1].trim();
        break;
      }
    }
  }

  // 2. Batch Number detection
  const batchPatterns = [
    /(?:b\.?no|batch(?:\s*no)?|b\/n|b\/no|lot(?:\s*no)?)\s*[:\-\s#]*([a-zA-Z0-9\-]{4,15})/i,
    /\b(bch|bat|lot|btn)\-?[0-9a-zA-Z]{3,10}\b/i
  ];
  for (const pattern of batchPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && !/^(tablet|capsule|syrup|expiry|expdate|mrp|paisa|rupee|hsn)$/i.test(match[1])) {
      detectedBatch = match[1].toUpperCase();
      break;
    }
  }

  // Fallback search for alphanumeric tokens
  if (!detectedBatch) {
    const batchRegex = /\b([A-Z0-9]{5,10})\b/;
    for (const line of lines) {
      const match = line.match(batchRegex);
      if (match && match[1] && /[A-Z]/.test(match[1]) && /[0-9]/.test(match[1]) && !/^(TABLET|CAPSULE|SYRUP)$/.test(match[1])) {
        detectedBatch = match[1];
        break;
      }
    }
  }

  // 3. Expiry Date detection
  const expPatterns = [
    /(?:exp(?:\.?\s*date)?|expiry|exp\.?\s*dt|e\.?\s*date)\s*[:\-\s]*([0-9]{2}[/\-][0-9]{2,4})/i,
    /\b(0[1-9]|1[0-2])[/\-](20[2-9][0-9]|[2-9][0-9])\b/,
    /\b(20[2-9][0-9]|[2-9][0-9])[/\-](0[1-9]|1[0-2])\b/
  ];
  for (const pattern of expPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const parts = match[1].split(/[/\-]/);
      if (parts.length === 2) {
        let month = parts[0];
        let year = parts[1];
        if (month.length === 4) {
          year = parts[0];
          month = parts[1];
        }
        if (year.length === 2) {
          year = "20" + year;
        }
        month = month.padStart(2, "0");
        detectedExpiry = `${year}-${month}-28`;
        break;
      }
    }
  }

  // 4. Quantity detection
  const qtyPatterns = [
    /(?:qty|quantity|q\.?ty|q\.?t)\s*[:\-\s]*([0-9]+)\b/i,
    /\b(qty|qty\.)\s*([0-9]+)\b/i,
    /\b([0-9]+)\s*(?:nos|pcs|tablets|tabs|strips|box)\b/i
  ];
  for (const pattern of qtyPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      detectedQty = match[1];
      break;
    }
  }

  // 5. Pricing (MRP & Purchase Rate)
  const mrpMatch = text.match(/(?:mrp|m\.r\.p|max\.?\s*retail)\s*[:\-\s]*([0-9]+(?:\.[0-9]{2})?)/i);
  if (mrpMatch && mrpMatch[1]) {
    detectedMrp = mrpMatch[1];
    detectedSaleRate = mrpMatch[1];
  }
  
  const rateMatch = text.match(/(?:rate|pur\s*rate|cost|purchase\s*rate|p\.rate)\s*[:\-\s]*([0-9]+(?:\.[0-9]{2})?)/i);
  if (rateMatch && rateMatch[1]) {
    detectedPurchaseRate = rateMatch[1];
  }

  // Fallback pricing search for decimal numbers
  if (!detectedMrp || !detectedPurchaseRate) {
    const decimalNumbers: string[] = [];
    const decimalRegex = /\b([0-9]+\.[0-9]{2})\b/g;
    let match;
    while ((match = decimalRegex.exec(text)) !== null) {
      if (!decimalNumbers.includes(match[1])) {
        decimalNumbers.push(match[1]);
      }
    }
    if (decimalNumbers.length >= 2) {
      const sortedPrices = decimalNumbers.map(Number).sort((a, b) => b - a);
      if (!detectedMrp) {
        detectedMrp = String(sortedPrices[0]);
        detectedSaleRate = String(sortedPrices[0]);
      }
      if (!detectedPurchaseRate) {
        detectedPurchaseRate = String(sortedPrices[1]);
      }
    }
  }

  // 6. GST Rate
  const gstMatch = text.match(/(?:gst|tax|cgst|sgst)\s*(?:rate|%|pct)?\s*[:\-\s]*([0-9]+)%/i);
  if (gstMatch && gstMatch[1]) {
    detectedGst = gstMatch[1];
  }

  // 7. HSN Code
  const hsnMatch = text.match(/(?:hsn|hsn\s*code|hsn\/sac)\s*[:\-\s]*([0-9]{4,8})/i);
  if (hsnMatch && hsnMatch[1]) {
    detectedHsn = hsnMatch[1];
  }

  return {
    medicineId: detectedMedicineId,
    name: detectedName,
    batchNo: detectedBatch,
    expiryDate: detectedExpiry,
    quantity: detectedQty,
    purchaseRate: detectedPurchaseRate,
    mrp: detectedMrp,
    saleRate: detectedSaleRate,
    gstRate: detectedGst,
    hsnCode: detectedHsn
  };
}

export function AddStockForm({ medicines, suppliers }: { medicines: SelectItem[]; suppliers: SelectItem[] }) {
  const router = useRouter();
  const [localMedicines, setLocalMedicines] = useState<SelectItem[]>(medicines);
  const [medicineId, setMedicineId] = useState("");
  const selected = localMedicines.find((m) => m.id === medicineId);
  const [saving, setSaving] = useState(false);

  // Uncontrolled to Controlled inputs states
  const [supplierId, setSupplierId] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [mrp, setMrp] = useState("");
  const [saleRate, setSaleRate] = useState("");
  const [gstRate, setGstRate] = useState("12");
  const [hsnCode, setHsnCode] = useState("");
  const [reorderLevel, setReorderLevel] = useState("10");
  const [rackLocation, setRackLocation] = useState("");

  // Searchable combobox states
  const [medicineSearch, setMedicineSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [drugMasterHits, setDrugMasterHits] = useState<DrugMasterSuggestion[]>([]);
  const [drugMasterLoading, setDrugMasterLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState("");

  // Manual Paste Fallback Modal States
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState("");

  // Confirmation editor States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [scannedData, setScannedData] = useState<{
    medicineId: string;
    name: string;
    batchNo: string;
    expiryDate: string;
    quantity: string;
    purchaseRate: string;
    mrp: string;
    saleRate: string;
    gstRate: string;
    hsnCode: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const filteredMedicines = localMedicines.filter((m) => {
    if (!medicineSearch.trim()) return true;
    const q = medicineSearch.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.genericName?.toLowerCase().includes(q);
  });

  // Safely bind MediaStream to <video> element once mounted (solves black screen preview bug)
  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch((err) => {
        console.warn("video.play() failed:", err);
      });
    }
  }, [cameraActive, cameraStream]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced Drug Master API search for stock form
  useEffect(() => {
    if (medicineSearch.length < 2) {
      setDrugMasterHits([]);
      setDrugMasterLoading(false);
      return;
    }
    // Only fetch if no exact local match
    const hasLocal = localMedicines.some(m => m.name.toLowerCase() === medicineSearch.toLowerCase());
    if (hasLocal) { setDrugMasterHits([]); return; }
    
    setDrugMasterLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/drug-master/search?q=${encodeURIComponent(medicineSearch)}`, { signal: controller.signal })
        .then(r => r.json())
        .then(result => {
          setDrugMasterHits(result.data ?? []);
          setDrugMasterLoading(false);
        })
        .catch(() => setDrugMasterLoading(false));
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [medicineSearch, localMedicines]);

  // Select a Drug Master suggestion — auto-fills all fields
  function selectDrugMasterHit(hit: DrugMasterSuggestion) {
    setMedicineId("new");
    setMedicineSearch(hit.name);
    setShowDropdown(false);
    setDrugMasterHits([]);
    setMrp(hit.mrpPaisa > 0 ? String(hit.mrpPaisa / 100) : "");
    setSaleRate(hit.mrpPaisa > 0 ? String(hit.mrpPaisa / 100) : "");
    setGstRate(String(hit.gstRate ?? 12));
    setHsnCode(hit.hsnCode ?? "");
    toast.success(`⚡ Auto-filled from Drug Master: ${hit.name}`, { duration: 2500 });
  }

  function selectMedicine(m: SelectItem) {
    setMedicineId(m.id);
    setMedicineSearch(m.name);
    setShowDropdown(false);
    
    // Auto-fill defaults on manual dropdown selection
    setMrp(m.mrpPaisa ? String(m.mrpPaisa / 100) : "");
    setSaleRate(m.mrpPaisa ? String(m.mrpPaisa / 100) : "");
    setGstRate(String(m.gstRate ?? 12));
    setHsnCode(m.hsnCode ?? "");
  }

  function clearSelection() {
    setMedicineId("");
    setMedicineSearch("");
    inputRef.current?.focus();
  }

  function handleAddMedicineSuccess(result: { medicine: any; inventory: any }) {
    const med = result.medicine;
    const newItem: SelectItem = {
      id: med.id,
      name: med.name,
      genericName: med.genericName,
      gstRate: med.gstRate,
      hsnCode: med.hsnCode,
      mrpPaisa: med.mrpPaisa,
    };
    setLocalMedicines((prev) => [newItem, ...prev]);
    selectMedicine(newItem);
    setShowAddMedicine(false);
    toast.success(`Medicine "${med.name}" created and selected`);
  }

  // Camera Capture Trigger Functions with Bulletproof Constraint Fallbacks
  const startCamera = async () => {
    setImagePreview(null);
    setOcrLoading(false);
    setOcrProgress(0);
    setLoadingStep("");
    
    try {
      let stream: MediaStream;
      try {
        // Try ideal high-res constraints first
        const constraints = {
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn("High-res constraints failed, falling back to simple video constraint", err);
        // Fallback to simple environment constraint
        const constraints = {
          video: { facingMode: "environment" }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      
      setCameraStream(stream);
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access failed completely", err);
      toast.error("Could not access camera. Please allow permissions or upload an image file.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setOcrLoading(true);
    setLoadingStep("📷 Capturing high-resolution frame...");
    setOcrProgress(2);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      
      // Draw frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      
      setImagePreview(dataUrl);
      stopCamera();
      
      // Run OCR
      await runOCR(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
        setShowScanner(true);
        stopCamera();
        await runOCR(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Run Tesseract OCR with Dynamic Imports to bypass SSR pre-rendering crashes
  const runOCR = async (imageSrc: string) => {
    setOcrLoading(true);
    setLoadingStep("🤖 Starting local OCR engine (WebAssembly)...");
    setOcrProgress(5);
    
    try {
      // Dynamic import prevents server-side Next.js execution errors
      const Tesseract = (await import("tesseract.js")).default;
      
      const result = await Tesseract.recognize(
        imageSrc,
        "eng",
        {
          workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.0.5/dist/worker.min.js",
          corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.4/tesseract-core-wasm.js",
          langPath: "https://tessdata.projectnaptha.com/4.0.0",
          logger: (m) => {
            if (m.status === "recognizing text") {
              setLoadingStep(`🔍 Reading text from invoice: ${Math.round(m.progress * 100)}%`);
              setOcrProgress(10 + Math.round(m.progress * 85));
            } else if (m.status === "loading tesseract ocr core") {
              setLoadingStep("⚙️ Initializing local WebAssembly runtime...");
              setOcrProgress(8);
            }
          }
        }
      );
      
      setLoadingStep("📊 Analyzing invoice layout and items...");
      setOcrProgress(98);
      
      const text = result.data.text;
      console.log("OCR Extracted Text:", text);
      
      if (!text.trim()) {
        toast.error("No text could be extracted. Please make sure the image is clear and bright.");
        setOcrLoading(false);
        return;
      }
      
      // Parse details
      const parsed = parseInvoiceText(text, localMedicines);
      setScannedData(parsed);
      setOcrLoading(false);
      setShowScanner(false);
      setShowConfirmModal(true);
    } catch (err) {
      console.error("OCR Exception", err);
      toast.error(`OCR Failed: ${err instanceof Error ? err.message : String(err)}. Please try uploading again or paste text.`);
      setOcrLoading(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) {
      toast.error("Please paste some text first.");
      return;
    }
    
    setImagePreview(null); // No preview since it was text pasting
    const parsed = parseInvoiceText(pastedText, localMedicines);
    setScannedData(parsed);
    setShowPasteModal(false);
    setShowConfirmModal(true);
    setPastedText("");
    toast.success("Text parsed successfully!");
  };

  const handleConfirmScanned = () => {
    if (scannedData) {
      if (scannedData.medicineId === "new") {
        setMedicineId("new");
        setMedicineSearch(scannedData.name || "");
      } else if (scannedData.medicineId) {
        setMedicineId(scannedData.medicineId);
        const med = localMedicines.find(m => m.id === scannedData.medicineId);
        if (med) setMedicineSearch(med.name);
      } else if (scannedData.name) {
        setMedicineId("new");
        setMedicineSearch(scannedData.name);
      }
      
      setBatchNo(scannedData.batchNo || "");
      setExpiryDate(scannedData.expiryDate || "");
      setQuantity(scannedData.quantity || "");
      setPurchaseRate(scannedData.purchaseRate || "");
      setMrp(scannedData.mrp || "");
      setSaleRate(scannedData.saleRate || "");
      setGstRate(scannedData.gstRate || "12");
      setHsnCode(scannedData.hsnCode || "");
      
      setShowConfirmModal(false);
      toast.success("Invoice details populated in form successfully!");
    }
  };

  async function saveScannedStockDirectly() {
    if (!scannedData) return;
    setSaving(true);
    let actualMedicineId = scannedData.medicineId;

    // Auto-create medicine record if it's a new on-the-fly entry
    if (scannedData.medicineId === "new") {
      const name = scannedData.name.trim();
      if (!name) {
        toast.error("Please enter a valid medicine name for the new record");
        setSaving(false);
        return;
      }

      try {
        const mrpValue = Math.round(sanitizePrice(scannedData.mrp) * 100);
        let gstRateValue = sanitizeInt(scannedData.gstRate, 12);
        const validGstRates = [0, 5, 12, 18];
        if (!validGstRates.includes(gstRateValue)) {
          gstRateValue = 12; // Fallback
        }
        const hsnCodeValue = String(scannedData.hsnCode || "").trim();

        const response = await fetch("/api/medicines/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            genericName: "", 
            manufacturer: "",
            category: "Other",
            composition: "",
            dosageForm: "Tablet",
            strength: "",
            packSize: "",
            hsnCode: hsnCodeValue,
            gstRate: gstRateValue,
            mrpPaisa: mrpValue,
            schedule: "OTC",
            requiresPrescription: false
          })
        });

        const result = await response.json();
        if (!response.ok) {
          toast.error(result.error ?? "Failed to create new medicine record");
          setSaving(false);
          return;
        }

        actualMedicineId = result.data.id;
        
        // Immediately sync local list to bind with newly created medicine
        const newItem: SelectItem = {
          id: result.data.id,
          name: name,
          genericName: "",
          gstRate: gstRateValue,
          hsnCode: hsnCodeValue,
          mrpPaisa: mrpValue,
        };
        setLocalMedicines((prev) => [newItem, ...prev]);
        setMedicineId(result.data.id);
        setMedicineSearch(name);
      } catch (err) {
        toast.error("Error creating new medicine record");
        setSaving(false);
        return;
      }
    }

    if (!actualMedicineId) {
      toast.error("Please select or match a medicine first");
      setSaving(false);
      return;
    }

    // Validate and sanitize GST rate strictly to match Zod literals [0, 5, 12, 18]
    let parsedGst = sanitizeInt(scannedData.gstRate, 12);
    const validGstRates = [0, 5, 12, 18];
    if (!validGstRates.includes(parsedGst)) {
      parsedGst = 12; // Fallback
    }

    const payload = {
      medicineId: actualMedicineId,
      supplierId: String(supplierId),
      batchNo: String(scannedData.batchNo).trim(),
      mfgDate: "",
      expiryDate: String(scannedData.expiryDate || ""),
      purchaseRatePaisa: Math.round(sanitizePrice(scannedData.purchaseRate) * 100),
      mrpPaisa: Math.round(sanitizePrice(scannedData.mrp) * 100),
      saleRatePaisa: Math.round(sanitizePrice(scannedData.saleRate) * 100),
      gstRate: parsedGst,
      hsnCode: String(scannedData.hsnCode || "").trim(),
      quantity: sanitizeInt(scannedData.quantity, 0),
      reorderLevel: 10,
      rackLocation: ""
    };

    if (!payload.batchNo) {
      toast.error("Batch number is required");
      setSaving(false);
      return;
    }
    if (!payload.expiryDate) {
      toast.error("Expiry date is required");
      setSaving(false);
      return;
    }
    if (payload.quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "Unable to save stock");
        return;
      }

      toast.success("Stock saved and inventory updated successfully!");
      setShowConfirmModal(false);
      router.push("/shop/inventory");
      router.refresh();
    } catch {
      toast.error("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  // Helper to sanitize price inputs (strips currency symbols, spaces, suffixes)
  function sanitizePrice(value: string | number) {
    const clean = String(value || "").replace(/[^0-9.]/g, "");
    const num = Number(clean);
    return isNaN(num) ? 0 : num;
  }

  function sanitizeInt(value: string | number, defaultValue = 0) {
    const clean = String(value || "").replace(/\D/g, "");
    const num = Number(clean);
    return isNaN(num) || clean === "" ? defaultValue : num;
  }

  async function submit() {
    if (!medicineId) {
      toast.error("Please select or enter a medicine first");
      return;
    }
    setSaving(true);
    let actualMedicineId = medicineId;

    // Auto-create medicine record if it's a new on-the-fly entry
    if (medicineId === "new") {
      const name = medicineSearch.trim();
      if (!name) {
        toast.error("Please enter a valid medicine name");
        setSaving(false);
        return;
      }

      try {
        const mrpValue = Math.round(sanitizePrice(mrp) * 100);
        let gstRateValue = sanitizeInt(gstRate, 12);
        const validGstRates = [0, 5, 12, 18];
        if (!validGstRates.includes(gstRateValue)) {
          gstRateValue = 12; // Fallback
        }
        const hsnCodeValue = String(hsnCode || "").trim();

        const response = await fetch("/api/medicines/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            genericName: "", 
            manufacturer: "",
            category: "Other",
            composition: "",
            dosageForm: "Tablet",
            strength: "",
            packSize: "",
            hsnCode: hsnCodeValue,
            gstRate: gstRateValue,
            mrpPaisa: mrpValue,
            schedule: "OTC",
            requiresPrescription: false
          })
        });

        const result = await response.json();
        if (!response.ok) {
          toast.error(result.error ?? "Failed to create new medicine record");
          setSaving(false);
          return;
        }

        actualMedicineId = result.data.id;
        
        // Immediately sync local state to bind with newly created medicine to prevent duplicate creation errors if stock saving fails
        const newItem: SelectItem = {
          id: result.data.id,
          name: name,
          genericName: "",
          gstRate: gstRateValue,
          hsnCode: hsnCodeValue,
          mrpPaisa: mrpValue,
        };
        setLocalMedicines((prev) => [newItem, ...prev]);
        setMedicineId(result.data.id);
        setMedicineSearch(name);
      } catch (err) {
        toast.error("Error creating new medicine record");
        setSaving(false);
        return;
      }
    }

    // Validate and sanitize GST rate strictly to match Zod literals [0, 5, 12, 18]
    let parsedGst = sanitizeInt(gstRate, 12);
    const validGstRates = [0, 5, 12, 18];
    if (!validGstRates.includes(parsedGst)) {
      parsedGst = 12; // Fallback
    }

    const payload = {
      medicineId: actualMedicineId,
      supplierId: String(supplierId),
      batchNo: String(batchNo).trim(),
      mfgDate: String(mfgDate),
      expiryDate: String(expiryDate),
      purchaseRatePaisa: Math.round(sanitizePrice(purchaseRate) * 100),
      mrpPaisa: Math.round(sanitizePrice(mrp) * 100),
      saleRatePaisa: Math.round(sanitizePrice(saleRate) * 100),
      gstRate: parsedGst,
      hsnCode: String(hsnCode || selected?.hsnCode || "").trim(),
      quantity: sanitizeInt(quantity, 0),
      reorderLevel: sanitizeInt(reorderLevel, 10),
      rackLocation: String(rackLocation || "").trim()
    };

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "Unable to save stock");
        return;
      }

      toast.success("Stock saved and inventory updated successfully!");
      router.push("/shop/inventory");
      router.refresh();
    } catch {
      toast.error("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    await submit();
  }

  return (
    <div className="space-y-4">
      {/* Dynamic scan-trigger banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 shadow-sm animate-in slide-in-from-top-2 duration-300">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
            <span>Smart Invoice Capture</span>
          </h3>
          <p className="text-xs text-slate-500">
            Stockist dawa lekar aaya hai? Scan the invoice page with your camera, upload a photo, or paste raw text. Works 100% locally!
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Mobile direct native camera capture (bypasses browser constraints and secure context requirements) */}
          <label className="flex sm:hidden items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-sm hover:shadow transition-all min-h-11">
            <Camera className="h-4 w-4" />
            <span>Mobile Camera</span>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setShowScanner(true);
              startCamera();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-med-green hover:bg-emerald-600 text-white font-bold text-xs shadow-sm hover:shadow transition-all min-h-11"
          >
            <Camera className="h-4 w-4" />
            <span>Scan Camera</span>
          </button>
          
          <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer shadow-sm min-h-11">
            <Upload className="h-4 w-4 text-slate-550" />
            <span>Upload Image</span>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </label>

          <button
            type="button"
            onClick={() => setShowPasteModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-350 bg-slate-100/80 hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-sm min-h-11"
          >
            <Clipboard className="h-4 w-4 text-slate-550" />
            <span>Paste Text (Fail-safe)</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
        {/* Searchable Medicine Combobox OR Detailed Master Entry Form */}
        <div className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-600 font-semibold">Medicine *</span>

          {!showAddMedicine ? (
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  className="h-11 w-full rounded-md border border-slate-300 pl-9 pr-16 outline-none transition-shadow focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm"
                  placeholder="Search or enter medicine name..."
                  value={medicineSearch}
                  onChange={(e) => {
                    setMedicineSearch(e.target.value);
                    setShowDropdown(true);
                    if (!e.target.value.trim()) setMedicineId("");
                  }}
                  onFocus={() => setShowDropdown(true)}
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  {medicineSearch && (
                    <button type="button" onClick={clearSelection} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
                </div>
              </div>

              {/* Dropdown suggestions */}
              {showDropdown && (
                <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {filteredMedicines.length === 0 ? (
                    <div className="px-4 py-3 text-center text-xs text-slate-400">No matching medicines found</div>
                  ) : (
                    filteredMedicines.slice(0, 50).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectMedicine(m);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-med-greenSoft ${m.id === medicineId ? "bg-med-greenSoft" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-med-navy">{m.name}</p>
                          {m.genericName && <p className="truncate text-xs text-slate-500">{m.genericName}</p>}
                        </div>
                        {m.mrpPaisa ? <span className="shrink-0 text-xs text-slate-400 font-medium">₹{(m.mrpPaisa / 100).toFixed(2)}</span> : null}
                      </button>
                    ))
                  )}
                  
                  {/* Drug Master Database Results */}
                  {(drugMasterHits.length > 0 || drugMasterLoading) && (
                    <div>
                      <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 px-3 py-1.5">
                        {drugMasterLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
                        ) : (
                          <Database className="h-3 w-3 text-purple-500" />
                        )}
                        <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                          Drug Master Database {drugMasterLoading ? "— Searching..." : `— ${drugMasterHits.length} found`}
                        </span>
                        <Sparkles className="h-3 w-3 text-purple-400 ml-auto" />
                      </div>
                      {drugMasterHits.slice(0, 8).map((hit, i) => (
                        <button
                          key={`dm-stock-${hit.name}-${i}`}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectDrugMasterHit(hit);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-purple-50/60"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-semibold text-slate-800">{hit.name}</p>
                              <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-600">Drug Master ⚡</span>
                            </div>
                            {hit.genericName && <p className="truncate text-xs text-slate-500">{hit.genericName}{hit.manufacturer ? ` • ${hit.manufacturer}` : ""}</p>}
                          </div>
                          {hit.mrpPaisa > 0 && <span className="shrink-0 text-xs text-emerald-600 font-medium">₹{(hit.mrpPaisa / 100).toFixed(2)}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* On-the-fly Medicine Creation Trigger */}
                  {medicineSearch.trim() && !localMedicines.some(m => m.name.toLowerCase() === medicineSearch.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setMedicineId("new");
                        setShowDropdown(false);
                      }}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-amber-600 bg-amber-50/40 transition-colors hover:bg-amber-50"
                    >
                      <Sparkles className="h-4 w-4 shrink-0" /> Add &quot;{medicineSearch}&quot; as new medicine (Auto-create on save)
                    </button>
                  )}

                  {/* Add New Medicine button (Full form inline) */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowDropdown(false);
                      setShowAddMedicine(true);
                    }}
                    className="flex w-full items-center gap-2 border-t border-slate-105 px-4 py-3 text-left text-sm font-bold text-med-green transition-colors hover:bg-med-greenSoft"
                  >
                    <Plus className="h-4 w-4 shrink-0" /> Fill detailed new medicine form
                  </button>
                </div>
              )}

              {/* Selected badge */}
              {medicineId && (
                <div className={`mt-2 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs ${
                  medicineId === "new" ? "bg-amber-50 border border-amber-200 text-amber-850" : "bg-med-greenSoft text-med-navy"
                }`}>
                  <span className="font-bold">
                    {medicineId === "new" ? "New Medicine (Auto-create on save):" : "Selected:"}
                  </span>
                  <span>{medicineId === "new" ? medicineSearch : selected?.name}</span>
                  {selected?.genericName && <span className="text-slate-500">({selected.genericName})</span>}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/10 p-4 animate-in fade-in duration-200">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-blue-900">Add New Medicine to Master List</span>
                <button
                  type="button"
                  onClick={() => setShowAddMedicine(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
              <AddMedicineForm
                mode="inline"
                showInventoryFields={false}
                onSuccess={handleAddMedicineSuccess}
                onCancel={() => setShowAddMedicine(false)}
              />
            </div>
          )}
        </div>

        {/* Dynamic Controlled Form Inputs */}
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold">Supplier</span>
          <select 
            name="supplierId" 
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-med-green focus:ring-2 focus:ring-med-green/20 outline-none"
          >
            <option value="">No supplier</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold">Batch no *</span>
          <input 
            name="batchNo" 
            required 
            value={batchNo} 
            onChange={(e) => setBatchNo(e.target.value)} 
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
            placeholder="e.g. BCH1298"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold">MFG date</span>
          <input 
            name="mfgDate" 
            type="date" 
            value={mfgDate} 
            onChange={(e) => setMfgDate(e.target.value)} 
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold">Expiry date *</span>
          <input 
            name="expiryDate" 
            type="date" 
            required 
            value={expiryDate} 
            onChange={(e) => setExpiryDate(e.target.value)} 
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold">Quantity *</span>
          <input 
            name="quantity" 
            type="number" 
            required 
            value={quantity} 
            onChange={(e) => setQuantity(e.target.value)} 
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
            placeholder="0"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold">Purchase rate *</span>
          <input 
            name="purchaseRate" 
            type="number" 
            step="0.01" 
            required 
            value={purchaseRate} 
            onChange={(e) => setPurchaseRate(e.target.value)} 
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
            placeholder="0.00"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold">MRP *</span>
          <input 
            name="mrp" 
            type="number" 
            step="0.01" 
            required 
            value={mrp} 
            onChange={(e) => setMrp(e.target.value)} 
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
            placeholder="0.00"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold">Sale rate *</span>
          <input 
            name="saleRate" 
            type="number" 
            step="0.01" 
            required 
            value={saleRate} 
            onChange={(e) => setSaleRate(e.target.value)} 
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
            placeholder="0.00"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold">GST rate *</span>
          <input 
            name="gstRate" 
            type="number" 
            required 
            value={gstRate} 
            onChange={(e) => setGstRate(e.target.value)} 
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
            placeholder="12"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold">HSN code</span>
          <input 
            name="hsnCode" 
            value={hsnCode} 
            onChange={(e) => setHsnCode(e.target.value)} 
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
            placeholder="e.g. 3004"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold">Reorder level</span>
          <input 
            name="reorderLevel" 
            type="number" 
            value={reorderLevel} 
            onChange={(e) => setReorderLevel(e.target.value)} 
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold">Rack location</span>
          <input 
            name="rackLocation" 
            value={rackLocation} 
            onChange={(e) => setRackLocation(e.target.value)} 
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
            placeholder="e.g. Rack A-1"
          />
        </label>

        <button disabled={saving || !medicineId} className="min-h-11 rounded-md bg-med-green font-semibold text-white disabled:opacity-60 md:col-span-2">
          {saving ? "Saving..." : "Save stock"}
        </button>
      </form>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ─── MODAL 1: Invoice Camera Scanner ─── */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-950 p-6 text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-emerald-500" />
                <h3 className="text-base font-bold tracking-tight">Camera Invoice Scanner</h3>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  stopCamera();
                  setShowScanner(false);
                }}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video preview / OCR Loading bar */}
            <div className="relative flex-1 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 min-h-[300px] flex items-center justify-center">
              {cameraActive && !ocrLoading && (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover" 
                  />
                  {/* Glowing viewport guidelines */}
                  <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
                    <div className="w-full h-4/5 border-2 border-dashed border-emerald-500 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse flex items-center justify-center">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-slate-950/80 px-2.5 py-1 rounded border border-emerald-500/30">
                        Align invoice text here
                      </span>
                    </div>
                  </div>
                </>
              )}

              {ocrLoading && (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md w-full">
                  <div className="relative flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin" />
                    <Sparkles className="absolute h-6 w-6 text-emerald-400 animate-pulse" />
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{loadingStep}</p>
                    <p className="text-xs text-slate-400">Processing fully offline inside your browser</p>
                  </div>

                  {/* High-fidelity Progress Bar */}
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">{ocrProgress}% Complete</span>
                </div>
              )}

              {!cameraActive && !ocrLoading && (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <Info className="h-12 w-12 text-slate-500" />
                  <p className="text-sm text-slate-350 font-medium">Processing File Uploaded Snapshot</p>
                </div>
              )}
            </div>

            {/* Viewport footer actions */}
            {cameraActive && !ocrLoading && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={captureAndProcess}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-105 text-white font-bold text-sm shadow-lg w-full max-w-xs transition-all min-h-12"
                >
                  <Sparkles className="h-4.5 w-4.5 shrink-0" />
                  <span>Capture & Read Text</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 3: Manual Text Pasting (Fail-Safe) ─── */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clipboard className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Paste Invoice Text</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPasteModal(false)}
                className="rounded-full p-1.5 text-slate-450 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 flex-1">
              <p className="text-xs text-slate-500 leading-relaxed">
                If the camera scanner is blocked by your browser, or Tesseract core files cannot download due to local network limits, you can paste the raw invoice text below. The local regex parsing engine will still extract the fields automatically!
              </p>
              
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste raw stock invoice bill text here..."
                rows={8}
                className="w-full rounded-lg border border-slate-300 p-3 text-xs outline-none focus:border-med-green focus:ring-1 focus:ring-med-green font-mono leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs min-h-10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasteSubmit}
                className="px-6 py-2 rounded-lg bg-med-green hover:bg-emerald-600 text-white font-bold text-xs min-h-10 shadow-sm"
              >
                Parse & Review Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: Side-by-Side Scanned Details Confirmation ─── */}
      {showConfirmModal && scannedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">Review Scanned Invoice Details</h3>
                  <p className="text-xs text-slate-500 font-medium">Verify or adjust detected stockist values before applying them.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowConfirmModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Split Screen Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid gap-6 md:grid-cols-12 min-h-0">
              
              {/* Left Side: Captured Invoice Image Preview / Raw Text Info */}
              <div className="md:col-span-5 flex flex-col space-y-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span>Scanned Document Source</span>
                </span>
                
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden relative flex items-center justify-center min-h-[220px]">
                  {imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt="Scanned Invoice Snapshot" 
                      className="max-h-[350px] object-contain rounded-lg shadow-sm" 
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <Clipboard className="h-10 w-10 text-emerald-600 mx-auto opacity-80" />
                      <p className="text-xs font-bold text-slate-700">Text Paste Document Source</p>
                      <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed mx-auto">
                        Details were extracted directly using the clipboard manual parser.
                      </p>
                    </div>
                  )}
                  
                  {/* Scan Info Card overlay */}
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-sm text-[10px] p-2 rounded-lg border border-slate-800 text-slate-300 space-y-0.5">
                    <p className="font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Parser Sync Succeeded (Local Environment)
                    </p>
                    <p className="truncate opacity-75">All regex rules evaluated locally.</p>
                  </div>
                </div>
              </div>

              {/* Right Side: Detected editable inputs editor */}
              <div className="md:col-span-7 space-y-4">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Auto-Detected Form Fields</span>
                </span>

                <div className="grid gap-3 sm:grid-cols-2 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  
                  {/* Medicine Selector Link */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600">Matched Medicine *</label>
                      {scannedData.name && (
                        <span className="text-[10px] font-medium text-slate-400 truncate max-w-[250px]">
                          Scanned text: &quot;{scannedData.name}&quot;
                        </span>
                      )}
                    </div>
                    <select
                      value={scannedData.medicineId}
                      onChange={(e) => {
                        const val = e.target.value;
                        const med = localMedicines.find(m => m.id === val);
                        setScannedData(prev => prev ? {
                          ...prev,
                          medicineId: val,
                          gstRate: med ? String(med.gstRate ?? 12) : prev.gstRate,
                          hsnCode: med ? (med.hsnCode ?? "") : prev.hsnCode,
                          mrp: med && med.mrpPaisa ? String(med.mrpPaisa / 100) : prev.mrp,
                          saleRate: med && med.mrpPaisa ? String(med.mrpPaisa / 100) : prev.saleRate,
                        } : null);
                      }}
                      className="h-10 w-full rounded-lg border border-slate-350 bg-white px-3 text-xs outline-none focus:ring-1 focus:ring-med-green font-semibold"
                    >
                      <option value="">-- Click to bind to existing medicine --</option>
                      <option value="new" className="text-amber-600 font-bold">
                        ✨ Add as New Medicine
                      </option>
                      {localMedicines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.genericName ? `(${m.genericName})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Editable New Medicine Name Field */}
                  {scannedData.medicineId === "new" && (
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-600">New Medicine Name *</label>
                      <input
                        type="text"
                        value={scannedData.name || ""}
                        onChange={(e) => setScannedData(prev => prev ? { ...prev, name: e.target.value } : null)}
                        placeholder="Enter new medicine name..."
                        className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-med-green"
                        required
                      />
                    </div>
                  )}

                  {/* Scanned Batch */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600">Batch no</label>
                      {scannedData.batchNo && <span className="text-[9px] text-emerald-600 font-bold">✨ Detected</span>}
                    </div>
                    <input
                      type="text"
                      value={scannedData.batchNo}
                      onChange={(e) => setScannedData(prev => prev ? { ...prev, batchNo: e.target.value } : null)}
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-mono font-bold"
                    />
                  </div>

                  {/* Scanned Expiry */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600">Expiry Date</label>
                      {scannedData.expiryDate && <span className="text-[9px] text-emerald-600 font-bold">✨ Detected</span>}
                    </div>
                    <input
                      type="date"
                      value={scannedData.expiryDate}
                      onChange={(e) => setScannedData(prev => prev ? { ...prev, expiryDate: e.target.value } : null)}
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold"
                    />
                  </div>

                  {/* Scanned Qty */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600">Quantity</label>
                      {scannedData.quantity && <span className="text-[9px] text-emerald-600 font-bold">✨ Detected</span>}
                    </div>
                    <input
                      type="number"
                      value={scannedData.quantity}
                      onChange={(e) => setScannedData(prev => prev ? { ...prev, quantity: e.target.value } : null)}
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold"
                    />
                  </div>

                  {/* Scanned Purchase Rate */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600">Purchase Rate (₹)</label>
                      {scannedData.purchaseRate && <span className="text-[9px] text-emerald-600 font-bold">✨ Detected</span>}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={scannedData.purchaseRate}
                      onChange={(e) => setScannedData(prev => prev ? { ...prev, purchaseRate: e.target.value } : null)}
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold"
                    />
                  </div>

                  {/* Scanned MRP */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600">MRP (₹)</label>
                      {scannedData.mrp && <span className="text-[9px] text-emerald-600 font-bold">✨ Detected</span>}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={scannedData.mrp}
                      onChange={(e) => setScannedData(prev => prev ? { ...prev, mrp: e.target.value, saleRate: e.target.value } : null)}
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold"
                    />
                  </div>

                  {/* Scanned Sale Rate */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">Sale Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={scannedData.saleRate}
                      onChange={(e) => setScannedData(prev => prev ? { ...prev, saleRate: e.target.value } : null)}
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold"
                    />
                  </div>

                  {/* Scanned GST */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">GST Rate (%)</label>
                    <input
                      type="number"
                      value={scannedData.gstRate}
                      onChange={(e) => setScannedData(prev => prev ? { ...prev, gstRate: e.target.value } : null)}
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold"
                    />
                  </div>

                  {/* Scanned HSN */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">HSN Code</label>
                    <input
                      type="text"
                      value={scannedData.hsnCode}
                      onChange={(e) => setScannedData(prev => prev ? { ...prev, hsnCode: e.target.value } : null)}
                      className="h-9 w-full rounded-lg border border-slate-300 px-3 text-xs font-bold"
                    />
                  </div>

                </div>

                {/* Info Tip block */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 text-emerald-850 text-xs border border-emerald-100">
                  <Info className="h-4.5 w-4.5 shrink-0 text-emerald-600 mt-0.5" />
                  <p className="leading-normal">
                    Confirming will automatically populate all fields on the main form. You can still modify any values before submitting the final stock addition.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs min-h-10 transition-colors"
              >
                Discard Scan
              </button>
              
              <button
                type="button"
                onClick={handleConfirmScanned}
                className="px-4 py-2.5 rounded-lg border border-slate-350 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs min-h-10 transition-colors"
              >
                Confirm & Edit in Form
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveScannedStockDirectly}
                className="flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-lg bg-med-green hover:bg-emerald-600 text-white font-bold text-xs min-h-10 shadow-sm transition-all disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving Stock...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Save to Stock (Direct)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
