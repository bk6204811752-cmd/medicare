"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { 
  ChevronDown, Database, Plus, Search, Sparkles, X, Zap, 
  Camera, Upload, RefreshCw, CheckCircle2, 
  AlertCircle, FileText, Info, HelpCircle, Clipboard,
  Loader2, Truck, UserCheck, FileSpreadsheet
} from "lucide-react";
import { AddMedicineForm } from "@/components/add-medicine-form";
import { BarcodeScanner } from "@/components/barcode-scanner";
import type { DrugMasterSuggestion } from "@/components/drug-master-confirm-modal";
import { parseUnitsPerPack } from "@/lib/utils";

type SelectItem = {
  id: string;
  name: string;
  genericName?: string;
  gstRate?: number;
  hsnCode?: string;
  mrpPaisa?: number;
  packSize?: string;
};

type ScannedItem = {
  id: string;
  medicineId: string;
  name: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  quantity: string;
  purchaseRate: string;
  mrp: string;
  saleRate: string;
  gstRate: string;
  hsnCode: string;
  supplierId?: string;
};

export function parseWebFlexDate(value: string, type: 'mfg' | 'exp'): string {
  if (!value) return "";
  const cleaned = value.trim();
  
  // 1. Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  
  // 2. Check YYYY-MM
  if (/^\d{4}-\d{2}$/.test(cleaned)) {
    const [y, m] = cleaned.split("-");
    if (type === "exp") {
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      return `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
    } else {
      return `${y}-${m}-01`;
    }
  }

  // 3. Check DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY or DD-MM-YY
  const fullDateMatch = cleaned.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (fullDateMatch) {
    let [, d, m, y] = fullDateMatch;
    if (y.length === 2) y = "20" + y;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // 4. Check MM/YYYY or MM-YYYY or MM/YY or MM-YY
  const monthYearMatch = cleaned.match(/^(\d{1,2})[\/-](\d{2,4})$/);
  if (monthYearMatch) {
    let [, m, y] = monthYearMatch;
    if (y.length === 2) y = "20" + y;
    m = m.padStart(2, "0");
    if (type === "exp") {
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      return `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
    } else {
      return `${y}-${m}-01`;
    }
  }

  // 5. Check MMYY (4 digits)
  const mmyyMatch = cleaned.match(/^(\d{2})(\d{2})$/);
  if (mmyyMatch) {
    let m = mmyyMatch[1];
    let y = "20" + mmyyMatch[2];
    if (parseInt(m) >= 1 && parseInt(m) <= 12) {
      if (type === "exp") {
        const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
        return `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
      } else {
        return `${y}-${m}-01`;
      }
    }
  }

  // 6. Check MMYYYY (6 digits)
  const mmyyyyMatch = cleaned.match(/^(\d{2})(\d{4})$/);
  if (mmyyyyMatch) {
    let m = mmyyyyMatch[1];
    let y = mmyyyyMatch[2];
    if (parseInt(m) >= 1 && parseInt(m) <= 12) {
      if (type === "exp") {
        const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
        return `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
      } else {
        return `${y}-${m}-01`;
      }
    }
  }

  return "";
}

// Fallback single-item parser
function parseInvoiceTextSingle(text: string, medicinesList: SelectItem[]) {
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

  // Fallback: Extract brand names
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

  // 3. Expiry Date detection (resilient to spaces like "05 / 2022" and full dates "15/06/2025")
  const expPatterns = [
    // Full date with day: DD/MM/YYYY or DD-MM-YYYY
    /(?:exp(?:\.?\s*date)?|expiry|exp\.?\s*dt|e\.?\s*date|mfg\.?\s*date)\s*[:\-\s]*([0-9]{1,2}\s*[\/\-]\s*[0-9]{1,2}\s*[\/\-]\s*[0-9]{2,4})/i,
    // Month/Year format: MM/YYYY
    /(?:exp(?:\.?\s*date)?|expiry|exp\.?\s*dt|e\.?\s*date)\s*[:\-\s]*([0-9]{2}\s*[\/\-]\s*[0-9]{2,4})/i,
    // Standalone full date: DD/MM/YYYY
    /\b([0-9]{1,2})\s*[\/\-]\s*([0-9]{1,2})\s*[\/\-]\s*(20[2-9][0-9])\b/,
    // Standalone MM/YYYY
    /\b(0[1-9]|1[0-2])\s*[\/\-]\s*(20[2-9][0-9]|[2-9][0-9])\b/,
  ];
  for (const pattern of expPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const raw = match[1];
      const parts = raw.split(/[\/\-]/).map(p => p.trim());
      if (parts.length === 3) {
        // Full date DD/MM/YYYY
        let [d, m, y] = parts;
        if (y.length === 2) y = "20" + y;
        if (parseInt(d) > 12) { // likely day is first
          detectedExpiry = `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
        } else {
          detectedExpiry = `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
        }
        break;
      } else if (parts.length === 2) {
        // MM/YYYY format - use last day of that month
        let month = parts[0];
        let year = parts[1];
        if (month.length === 4) { year = parts[0]; month = parts[1]; }
        if (year.length === 2) year = "20" + year;
        month = month.padStart(2, "0");
        // Get last day of month
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        detectedExpiry = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
        break;
      }
    }
    // Handle 3-group regex (standalone full date)
    if (match && match[3]) {
      const d = match[1].padStart(2, "0");
      const m = match[2].padStart(2, "0");
      const y = match[3];
      detectedExpiry = `${y}-${m}-${d}`;
      break;
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
    mfgDate: "",
    expiryDate: detectedExpiry,
    quantity: detectedQty,
    purchaseRate: detectedPurchaseRate,
    mrp: detectedMrp,
    saleRate: detectedSaleRate,
    gstRate: detectedGst,
    hsnCode: detectedHsn
  };
}

// Table-aware Multi-Row Parser
function parseInvoiceText(text: string, medicinesList: SelectItem[]): ScannedItem[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items: ScannedItem[] = [];

  for (const line of lines) {
    const lineLower = line.toLowerCase();
    
    // Filter headers, footers, total rows and other noise
    if (
      lineLower.includes("particular") ||
      lineLower.includes("quantity") ||
      lineLower.includes("batch no") ||
      lineLower.includes("exp.") ||
      lineLower.includes("mfg.") ||
      lineLower.includes("amount") ||
      lineLower.includes("total") ||
      lineLower.includes("return shall") ||
      lineLower.includes("accepted only") ||
      lineLower.includes("shop") ||
      lineLower.includes("invoice") ||
      lineLower.includes("bill")
    ) {
      continue;
    }

    // Expiry Date (supports full dates DD/MM/YYYY and month/year MM/YYYY or MM/YY)
    let expiryDateStr = "";
    let cleanLine = line;
    
    // Try full date first: DD/MM/YYYY or DD-MM-YYYY
    const fullDateRegex = /\b([0-9]{1,2})\s*[\/\-]\s*([0-9]{1,2})\s*[\/\-]\s*(20[2-9][0-9])\b/g;
    const fullDateMatch = fullDateRegex.exec(line);
    if (fullDateMatch) {
      const d = fullDateMatch[1].padStart(2, "0");
      const m = fullDateMatch[2].padStart(2, "0");
      const y = fullDateMatch[3];
      expiryDateStr = `${y}-${m}-${d}`;
      cleanLine = cleanLine.replace(fullDateMatch[0], " ");
    } else {
      // Fallback to month/year: MM/YYYY
      const expRegex = /\b(0[1-9]|1[0-2])\s*[\/\-]\s*(20[2-9][0-9]|[2-9][0-9])\b/g;
      const expMatch = expRegex.exec(line);
      if (expMatch) {
        let month = expMatch[1];
        let year = expMatch[2];
        if (year.length === 2) year = "20" + year;
        month = month.padStart(2, "0");
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        expiryDateStr = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
        cleanLine = cleanLine.replace(expMatch[0], " ");
      }
    }

    // A valid invoice table row must have an expiry date
    if (!expiryDateStr) {
      continue;
    }

    // Extract decimal numbers (MRP, Purchase Rate, Amount)
    const priceRegex = /\b([0-9]+\.[0-9]{2})\b/g;
    const decimalNumbers: string[] = [];
    let priceMatch;
    while ((priceMatch = priceRegex.exec(cleanLine)) !== null) {
      decimalNumbers.push(priceMatch[1]);
    }

    // Remove price numbers from cleanLine
    let cleanLineNoPrices = cleanLine;
    for (const dec of decimalNumbers) {
      cleanLineNoPrices = cleanLineNoPrices.replace(dec, " ");
    }

    let detectedMrp = "";
    let detectedRate = "";
    if (decimalNumbers.length >= 2) {
      // Index-based columns match: 1st is MRP, 2nd is Purchase Rate
      detectedMrp = decimalNumbers[0];
      detectedRate = decimalNumbers[1];
    } else if (decimalNumbers.length === 1) {
      detectedMrp = decimalNumbers[0];
      detectedRate = decimalNumbers[0];
    }

    // Alphanumeric Batch Number detection
    const tokens = cleanLineNoPrices.split(/\s+/).map(t => t.trim()).filter(Boolean);
    let detectedBatch = "";
    const commonMfgCodes = ["SPI", "GSP", "BAD", "CIP", "ABT", "GLP", "MFG", "EXP", "MRP", "QTY", "SR", "NO"];
    
    for (const token of tokens) {
      const tokenUpper = token.toUpperCase();
      const isAlphanumeric = /[A-Za-z]/.test(token) && /[0-9]/.test(token);
      const isPureBatchToken = /^[A-Z0-9]{5,12}$/i.test(token);
      
      if (
        (isAlphanumeric || isPureBatchToken) && 
        token.length >= 5 && 
        token.length <= 12 && 
        !commonMfgCodes.includes(tokenUpper) &&
        !/^[0-9]+$/.test(token)
      ) {
        detectedBatch = tokenUpper;
        break;
      }
    }

    if (!detectedBatch) {
      for (const token of tokens) {
        if (token.length >= 5 && token.length <= 12 && /^[A-Z0-9\-]+$/i.test(token) && !commonMfgCodes.includes(token.toUpperCase()) && !/^[0-9]+$/.test(token)) {
          detectedBatch = token.toUpperCase();
          break;
        }
      }
    }

    // Pack Size detection (e.g. "15 Capsule" or "10 Tablet")
    const packQtyRegex = /\b([0-9]+)\s*(Capsule|Tablet|Edible Powder|Tab|Cap|Caps|Tabs|Syr|Susp|Softgel|Inj|Unit|Gm|Ml)s?\b/i;
    const packQtyMatch = line.match(packQtyRegex);
    let detectedPackSize = 10;
    if (packQtyMatch) {
      detectedPackSize = parseInt(packQtyMatch[1], 10) || 10;
    }

    // Purchased Qty detection
    let detectedQty = "1";
    const integers = tokens.map(t => parseInt(t, 10)).filter(n => !isNaN(n));
    if (integers.length > 0) {
      const candidateIntegers = integers.filter(n => n < 100 && n !== detectedPackSize);
      if (candidateIntegers.length > 0) {
        detectedQty = String(candidateIntegers[candidateIntegers.length - 1]);
      } else {
        detectedQty = String(integers[integers.length - 1]);
      }
    }

    // Medicine Name Extraction
    let rawName = "";
    if (packQtyMatch && packQtyMatch.index !== undefined) {
      rawName = line.substring(0, packQtyMatch.index).trim();
    } else if (detectedBatch) {
      const idx = line.indexOf(detectedBatch);
      if (idx !== -1) {
        rawName = line.substring(0, idx).trim();
      }
    } else {
      rawName = line.trim();
    }

    // Clean brand name
    rawName = rawName.replace(/^\d+[\s\.\-]/, "").trim();
    for (const code of commonMfgCodes) {
      rawName = rawName.replace(new RegExp(`\\b${code}\\b`, "i"), "").trim();
    }

    if (!rawName || rawName.length < 3) {
      continue;
    }

    // Database check
    let detectedMedicineId = "new";
    let matchedName = rawName;
    let detectedGst = "12";
    let detectedHsn = "";

    const nameLower = rawName.toLowerCase();
    for (const med of medicinesList) {
      const medNameLower = med.name.toLowerCase();
      if (nameLower.includes(medNameLower) || medNameLower.includes(nameLower)) {
        detectedMedicineId = med.id;
        matchedName = med.name;
        detectedGst = String(med.gstRate ?? 12);
        detectedHsn = med.hsnCode ?? "";
        break;
      }
    }

    // Calculate total loose units
    const finalQty = String(Number(detectedQty) * detectedPackSize);

    items.push({
      id: Math.random().toString(36).substring(2, 9),
      medicineId: detectedMedicineId,
      name: matchedName,
      batchNo: detectedBatch,
      mfgDate: "",
      expiryDate: expiryDateStr,
      quantity: finalQty,
      purchaseRate: detectedRate,
      mrp: detectedMrp,
      saleRate: detectedMrp,
      gstRate: detectedGst,
      hsnCode: detectedHsn
    });
  }

  // Fallback if table line parsing failed completely
  if (items.length === 0) {
    const single = parseInvoiceTextSingle(text, medicinesList);
    if (single.name || single.batchNo) {
      items.push({
        id: Math.random().toString(36).substring(2, 9),
        ...single
      });
    }
  }

  return items;
}

export function AddStockForm({ medicines, suppliers }: { medicines: SelectItem[]; suppliers: SelectItem[] }) {
  const router = useRouter();
  const [localMedicines, setLocalMedicines] = useState<SelectItem[]>(medicines);
  const [medicineId, setMedicineId] = useState("");
  const selected = localMedicines.find((m) => m.id === medicineId);
  const [saving, setSaving] = useState(false);

  // Uncontrolled to Controlled inputs states
  const [localSuppliers, setLocalSuppliers] = useState<SelectItem[]>(suppliers);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierGstin, setSupplierGstin] = useState("");
  const [supplierCreditDays, setSupplierCreditDays] = useState("30");
  const [addingSupplier, setAddingSupplier] = useState(false);

  const [supplierId, setSupplierId] = useState("");

  async function handleAddSupplierSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierName.trim()) {
      toast.error("Manufacturer name is required");
      return;
    }
    setAddingSupplier(true);
    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: supplierName.trim(),
          phone: supplierPhone.trim() || undefined,
          email: supplierEmail.trim() || undefined,
          address: supplierAddress.trim() || undefined,
          gstin: supplierGstin.trim() || undefined,
          creditDays: Number(supplierCreditDays) || 30,
          balancePaisa: 0
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save supplier");
      }
      const newSup = result.data;
      if (newSup) {
        const item: SelectItem = {
          id: newSup.id,
          name: newSup.name
        };
        setLocalSuppliers((prev) => [item, ...prev]);
        setSupplierId(newSup.id);
        setShowAddSupplier(false);
        setSupplierName("");
        setSupplierPhone("");
        setSupplierEmail("");
        setSupplierAddress("");
        setSupplierGstin("");
        setSupplierCreditDays("30");
        toast.success(`Registered & selected manufacturer: ${newSup.name}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to register manufacturer");
    } finally {
      setAddingSupplier(false);
    }
  }

  const [batchNo, setBatchNo] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [packs, setPacks] = useState("");
  const [unitsPerPack, setUnitsPerPack] = useState("");
  const [looseUnits, setLooseUnits] = useState("");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [mrp, setMrp] = useState("");
  const [saleRate, setSaleRate] = useState("");
  const [gstRate, setGstRate] = useState("12");
  const [hsnCode, setHsnCode] = useState("");
  const [reorderLevel, setReorderLevel] = useState("10");
  const [rackLocation, setRackLocation] = useState("");

  const calculateAndSetQuantity = (p: string, u: string, l: string) => {
    const packsVal = parseInt(p, 10);
    const unitsVal = parseInt(u, 10);
    const looseVal = parseInt(l, 10) || 0;

    if (!isNaN(packsVal) && !isNaN(unitsVal)) {
      setQuantity(String(packsVal * unitsVal + looseVal));
    } else if (!isNaN(packsVal) && isNaN(unitsVal)) {
      setQuantity(String(packsVal + looseVal));
    } else if (isNaN(packsVal) && !isNaN(unitsVal)) {
      setQuantity(String(looseVal));
    } else {
      setQuantity(String(looseVal));
    }
  };

  // Searchable combobox states
  const [medicineSearch, setMedicineSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [prefillBarcode, setPrefillBarcode] = useState("");
  const [drugMasterHits, setDrugMasterHits] = useState<DrugMasterSuggestion[]>([]);
  const [drugMasterLoading, setDrugMasterLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
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
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [rowStatuses, setRowStatuses] = useState<Record<string, "idle" | "saving" | "success" | "error">>({});
  const [isMobile, setIsMobile] = useState(false);

  // Bulk CSV/TXT/PDF file import states
  const [showBulkFileModal, setShowBulkFileModal] = useState(false);
  const [bulkFileProcessing, setBulkFileProcessing] = useState(false);
  const [bulkFileStep, setBulkFileStep] = useState("");
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Device detection for camera options
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth < 768 || 
        /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMedicines = localMedicines.filter((m) => {
    if (!medicineSearch.trim()) return true;
    const q = medicineSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) || 
      (m.genericName || "").toLowerCase().includes(q) ||
      (m as any).composition?.toLowerCase().includes(q)
    );
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

    const pSize = hit.packSize ? parseUnitsPerPack(hit.packSize) : 10;
    setUnitsPerPack(String(pSize));
    setPacks("1");
    setLooseUnits("0");
    setQuantity(String(pSize));

    toast.success(`✅ Auto-filled: ${hit.name}`, { duration: 2500 });
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

    const pSize = m.packSize ? parseUnitsPerPack(m.packSize) : 10;
    setUnitsPerPack(String(pSize));
    setPacks("1");
    setLooseUnits("0");
    setQuantity(String(pSize));
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
      packSize: med.packSize,
    };
    setLocalMedicines((prev) => [newItem, ...prev]);
    selectMedicine(newItem);
    setShowAddMedicine(false);
    toast.success(`Medicine "${med.name}" created and selected`);
  }

  // ─── Camera Barcode/QR Scanner Handler ───
  async function handleBarcodeScan(barcodeText: string) {
    setShowBarcodeScanner(false);
    const loadingToastId = toast.loading("Searching barcode...");

    try {
      const response = await fetch(`/api/medicines/search?q=${encodeURIComponent(barcodeText)}`);
      const result = await response.json();
      
      // 1. Try to find in inventory/local first
      if (result.data && result.data.length > 0) {
        const invItem = result.data[0];
        const med: SelectItem = {
          id: invItem.medicineId || invItem.medicine.id,
          name: invItem.medicine.name,
          genericName: invItem.medicine.genericName,
          gstRate: invItem.gstRate || invItem.medicine.gstRate,
          hsnCode: invItem.hsnCode || invItem.medicine.hsnCode,
          mrpPaisa: invItem.mrpPaisa || invItem.medicine.mrpPaisa,
          packSize: invItem.medicine.packSize,
        };
        
        if (!localMedicines.some((m) => m.id === med.id)) {
          setLocalMedicines((prev) => [med, ...prev]);
        }
        
        selectMedicine(med);
        toast.dismiss(loadingToastId);
        toast.success(`✅ Found & selected medicine: ${med.name}`);
        return;
      }

      // 2. Try suggestions (master list)
      if (result.suggestions && result.suggestions.length > 0) {
        const med = result.suggestions[0] as SelectItem;
        
        if (!localMedicines.some((m) => m.id === med.id)) {
          setLocalMedicines((prev) => [med, ...prev]);
        }
        
        selectMedicine(med);
        toast.dismiss(loadingToastId);
        toast.success(`✅ Found in master database & selected: ${med.name}`);
        return;
      }

      // 3. Fallback: check drug master suggestions API directly
      const dmResponse = await fetch(`/api/drug-master/search?q=${encodeURIComponent(barcodeText)}`);
      const dmResult = await dmResponse.json();
      if (dmResult.data && dmResult.data.length > 0) {
        const hit = dmResult.data[0] as DrugMasterSuggestion;
        selectDrugMasterHit(hit);
        toast.dismiss(loadingToastId);
        toast.success(`✅ Found in central database & auto-filled: ${hit.name}`);
        return;
      }

      // 4. Not found: Open quick add form and pre-fill barcode
      setPrefillBarcode(barcodeText);
      setShowAddMedicine(true);
      toast.dismiss(loadingToastId);
      toast.warning("Barcode not found — opening quick-add medicine form.", { duration: 5000 });
    } catch (err) {
      console.error("Barcode lookup failed:", err);
      toast.dismiss(loadingToastId);
      toast.error("Failed to look up barcode. Try manual search.");
    }
  }

  // Camera Capture Trigger Functions with Bulletproof Constraint Fallbacks
  const startCamera = async () => {
    setImagePreview(null);
    setOcrLoading(false);
    setOcrProgress(0);
    setLoadingStep("");
    
    // Secure Context / API support check
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error(
        <div className="flex flex-col gap-1.5 text-xs text-slate-800 p-1">
          <p className="font-bold text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
            <span>Secure Connection Required</span>
          </p>
          <p className="text-slate-650 font-medium leading-relaxed">
            Your browser disables live stream cameras on insecure HTTP connections.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button 
              onClick={() => {
                toast.dismiss();
                fileInputRef.current?.click();
              }}
              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-sm transition-all"
            >
              📸 Open Mobile Camera (Native)
            </button>
            <button 
              onClick={() => toast.dismiss()}
              className="px-2 py-1 rounded border border-slate-300 text-slate-650 hover:bg-slate-50 font-bold text-[10px] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>,
        { duration: 10000 }
      );
      setShowScanner(false);
      return;
    }

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

  // ─── Parse CSV/TXT structured stock data ───
  function parseCsvTextToItems(text: string): ScannedItem[] {
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
    const items: ScannedItem[] = [];

    // Detect if CSV has a header row
    const firstLine = lines[0]?.toLowerCase() || "";
    const hasHeader = firstLine.includes("name") || firstLine.includes("medicine") ||
      firstLine.includes("batch") || firstLine.includes("expiry") || firstLine.includes("qty") ||
      firstLine.includes("product") || firstLine.includes("brand") || firstLine.includes("rate") ||
      firstLine.includes("mrp") || firstLine.includes("gst") || firstLine.includes("hsn") ||
      firstLine.includes("price") || firstLine.includes("cost") || firstLine.includes("exp");

    const dataLines = hasHeader ? lines.slice(1) : lines;

    // Try to detect delimiter: comma, tab, pipe, semicolon
    const sample = dataLines[0] || "";
    let delimiter = ",";
    if ((sample.match(/\t/g) || []).length > (sample.match(/,/g) || []).length) delimiter = "\t";
    else if ((sample.match(/\|/g) || []).length > 2) delimiter = "|";
    else if ((sample.match(/;/g) || []).length > (sample.match(/,/g) || []).length) delimiter = ";";

    // Column index mapping from header
    let colMap: Record<string, number>;
    let detectedSupplierName = ""; // auto-detect supplier from CSV header/column
    if (hasHeader) {
      colMap = { name: -1, batch: -1, mfgDate: -1, expiry: -1, qty: -1, rate: -1, mrp: -1, gst: -1, hsn: -1, saleRate: -1, supplier: -1 };
      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
      headers.forEach((h, i) => {
        if (/med|name|medicine|drug|product|brand/i.test(h)) colMap.name = i;
        else if (/batch|lot|b\.?no|b\/n/i.test(h)) colMap.batch = i;
        else if (/mfg|manufactur(?:er|ing)?\s*date/i.test(h)) colMap.mfgDate = i;
        else if (/exp|expiry/i.test(h)) colMap.expiry = i;
        else if (/qty|quantity|units|stock/i.test(h)) colMap.qty = i;
        // Purchase rate - match cost/purchase rate BEFORE sale/sell rate
        else if (/purchase\s*rate|pur\s*rate|cost\s*rate|pts|pur_rate|purrate|p\.?rate/i.test(h)) colMap.rate = i;
        // Sale rate - match 'sell rate', 'selling rate', 'sale rate', 'ptr', 'retail rate'
        else if (/sell(?:ing)?\s*rate|sale\s*rate|retail\s*rate|ptr|salerate|sell_rate/i.test(h)) colMap.saleRate = i;
        else if (/mrp|max\s*retail|retail\s*price/i.test(h)) colMap.mrp = i;
        else if (/gst|tax|cgst|sgst|igst|tax\s*rate/i.test(h)) colMap.gst = i;
        else if (/hsn/i.test(h)) colMap.hsn = i;
        // Supplier/manufacturer column
        else if (/supplier|manufacturer|company|vendor|mfr|manuf(?:acturer)?/i.test(h)) colMap.supplier = i;
        else if (/^rate$/i.test(h)) {
          // Standalone 'rate' column - assign to purchase rate if not yet set
          if (colMap.rate === -1) colMap.rate = i;
        } else if (/retail|sale/i.test(h)) {
          // catch-all 'retail' or 'sale' as saleRate if not yet set
          if (colMap.saleRate === -1) colMap.saleRate = i;
        } else if (/cost|purchase/i.test(h)) {
          if (colMap.rate === -1) colMap.rate = i;
        }
      });
    } else {
      // Default order fallback if no header
      colMap = { name: 0, batch: 1, mfgDate: -1, expiry: 2, qty: 3, rate: 4, mrp: 5, gst: 6, hsn: 7, saleRate: -1, supplier: -1 };
    }

    for (const line of dataLines) {
      const cols = line.split(delimiter).map(c => c.trim().replace(/^["\']+|["\']+$/g, ""));
      if (cols.length < 2) continue;

      const rawName = colMap.name >= 0 ? (cols[colMap.name] || "") : "";
      if (!rawName || rawName.length < 2) continue;

      const rawExpiry = colMap.expiry >= 0 ? (cols[colMap.expiry] || "") : "";
      const rawMfg = colMap.mfgDate >= 0 ? (cols[colMap.mfgDate] || "") : "";

      // Parse date: support DD/MM/YYYY, MM/YYYY, YYYY-MM-DD
      function parseFlexDate(raw: string): string {
        if (!raw) return "";
        raw = raw.trim();
        // YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
        // DD/MM/YYYY or DD-MM-YYYY
        const fullM = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
        if (fullM) {
          let [, d, m, y] = fullM;
          if (y.length === 2) y = "20" + y;
          return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
        }
        // MM/YYYY or MM-YYYY
        const monthYear = raw.match(/^(\d{1,2})[\/-](\d{2,4})$/);
        if (monthYear) {
          let [, m, y] = monthYear;
          if (y.length === 2) y = "20" + y;
          m = m.padStart(2, "0");
          const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
          return `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
        }
        return "";
      }

      const expiryDate = parseFlexDate(rawExpiry);
      const mfgDate = parseFlexDate(rawMfg);

      // Match medicine from local list
      let medicineId = "new";
      const nameLower = rawName.toLowerCase();
      for (const med of localMedicines) {
        if (nameLower.includes(med.name.toLowerCase()) || med.name.toLowerCase().includes(nameLower)) {
          medicineId = med.id;
          break;
        }
      }

      // Helper to clean price and numeric strings (removes ₹, Rs., commas, trailing /-, spaces)
      function cleanPriceStr(val: string): string {
        if (!val) return "";
        const clean = val.replace(/[^0-9.]/g, "");
        return clean === "." ? "" : clean;
      }

      const mrpVal = colMap.mrp >= 0 ? cleanPriceStr(cols[colMap.mrp] || "") : "";
      const rateVal = colMap.rate >= 0 ? cleanPriceStr(cols[colMap.rate] || "") : "";
      // Sale rate: use saleRate column if present; else fall back to MRP; never leave blank
      const saleRateVal = colMap.saleRate >= 0 && cols[colMap.saleRate]
        ? cleanPriceStr(cols[colMap.saleRate])
        : mrpVal;
      const gstVal = colMap.gst >= 0 ? cleanPriceStr(cols[colMap.gst] || "") : "";
      const qtyVal = colMap.qty >= 0 ? cleanPriceStr(cols[colMap.qty] || "") : "";

      // Auto-detect supplier name from column (first non-empty value wins)
      if (!detectedSupplierName && colMap.supplier >= 0 && cols[colMap.supplier]?.trim()) {
        detectedSupplierName = cols[colMap.supplier].trim();
      }

      items.push({
        id: Math.random().toString(36).substring(2, 9),
        medicineId,
        name: rawName,
        batchNo: colMap.batch >= 0 ? (cols[colMap.batch] || "") : "",
        mfgDate,
        expiryDate,
        quantity: qtyVal,
        purchaseRate: rateVal,
        mrp: mrpVal,
        saleRate: saleRateVal || mrpVal,
        gstRate: gstVal,
        hsnCode: colMap.hsn >= 0 ? (cols[colMap.hsn] || "") : "",
        supplierId: supplierId || "",
      });
    }
    // Attach detected supplier name to first item for auto-creation later
    if (detectedSupplierName && items.length > 0) {
      (items as any)._detectedSupplierName = detectedSupplierName;
    }
    return items as ScannedItem[] & { _detectedSupplierName?: string };
  }

  // ─── Bulk File Upload Handler (CSV/TXT/PDF) ───
  const handleBulkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-uploaded
    e.target.value = "";

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    setBulkFileProcessing(true);
    setBulkFileStep("📂 Reading file...");

    try {
      if (ext === "pdf") {
        // For PDF — use FileReader to read as ArrayBuffer then extract text via pdfjs-dist if available, or fallback to OCR
        setBulkFileStep("📄 Converting PDF to image for OCR...");
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          setImagePreview(dataUrl);
          setShowScanner(true);
          setBulkFileProcessing(false);
          await runOCR(dataUrl);
        };
        reader.readAsDataURL(file);
        return;
      }

      // CSV / TXT processing
      setBulkFileStep("📊 Parsing CSV/TXT structured data...");
      const text = await file.text();

      if (!text.trim()) {
        toast.error("File is empty or unreadable.");
        setBulkFileProcessing(false);
        return;
      }

      let parsed: ScannedItem[];

      // Detect if it looks like a structured CSV (has delimiters) or raw invoice text
      const lineCount = text.split("\n").filter(Boolean).length;
      const commaCount = (text.match(/,/g) || []).length;
      const isStructuredCsv = commaCount > lineCount || ext === "csv";

      if (isStructuredCsv) {
        parsed = parseCsvTextToItems(text);
        // ── Auto-create Supplier if detected from CSV column ──
        const detectedSupName = (parsed as any)._detectedSupplierName as string | undefined;
        if (detectedSupName) {
          // Check if already exists locally
          const existingSup = localSuppliers.find(s => s.name.toLowerCase() === detectedSupName.toLowerCase());
          if (existingSup) {
            setSupplierId(existingSup.id);
            toast.success(`✅ Auto-selected supplier: ${existingSup.name}`);
          } else {
            // Create new supplier via API
            try {
              setBulkFileStep("🏭 Auto-registering supplier/manufacturer from CSV...");
              const supRes = await fetch("/api/suppliers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: detectedSupName,
                  creditDays: 30,
                  balancePaisa: 0
                })
              });
              const supResult = await supRes.json();
              if (supRes.ok && supResult.data) {
                const newSup: SelectItem = { id: supResult.data.id, name: supResult.data.name };
                setLocalSuppliers(prev => [newSup, ...prev]);
                setSupplierId(supResult.data.id);
                toast.success(`✅ Auto-created & selected manufacturer: "${detectedSupName}". Edit details later in Suppliers.`);
              }
            } catch (err) {
              console.warn("Supplier auto-create failed:", err);
            }
          }
        }
        if (parsed.length === 0) {
          // Fallback to raw text parsing
          parsed = parseInvoiceText(text, localMedicines);
        }
      } else {
        // Raw text invoice — use existing regex parser
        parsed = parseInvoiceText(text, localMedicines);
      }

      if (parsed.length === 0) {
        toast.error("Could not parse any stock items from the file. Check the format and try again.");
        setBulkFileProcessing(false);
        return;
      }

      setScannedItems(parsed);
      setSelectedRowIds(parsed.map(x => x.id));
      const initialStatuses: Record<string, "idle" | "saving" | "success" | "error"> = {};
      parsed.forEach(x => { initialStatuses[x.id] = "idle"; });
      setRowStatuses(initialStatuses);
      setImagePreview(null);
      setShowConfirmModal(true);
      toast.success(`✅ Parsed ${parsed.length} stock items from ${file.name}!`);
    } catch (err) {
      console.error("Bulk file parse error:", err);
      toast.error("Failed to process file. Please check the format.");
    } finally {
      setBulkFileProcessing(false);
      setBulkFileStep("");
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
      
      let result;
      try {
        // Attempt 1: 100% Offline Local Scan Engine: Use files served locally from /public/ocr
        result = await Tesseract.recognize(
          imageSrc,
          "eng",
          {
            workerPath: "/ocr/worker.min.js",
            corePath: "/ocr",
            langPath: "/ocr",
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
      } catch (firstErr) {
        console.warn("Local offline Tesseract load failed, attempting fallback to remote CDNs...", firstErr);
        setLoadingStep("🔄 Connection fallback: Loading remote OCR core...");
        setOcrProgress(12);
        
        // Attempt 2: Connection fallback to CDN mirror in case local static hosting has issues
        result = await Tesseract.recognize(
          imageSrc,
          "eng",
          {
            workerPath: "https://unpkg.com/tesseract.js@5.0.5/dist/worker.min.js",
            corePath: "https://unpkg.com/tesseract.js-core@5.0.4", // directory container!
            langPath: "https://tessdata.projectnaptha.com/4.0.0",
            logger: (m) => {
              if (m.status === "recognizing text") {
                setLoadingStep(`🔍 Reading text from invoice (CDN): ${Math.round(m.progress * 100)}%`);
                setOcrProgress(15 + Math.round(m.progress * 80));
              } else if (m.status === "loading tesseract ocr core") {
                setLoadingStep("⚙️ Loading WASM core from CDN mirror...");
                setOcrProgress(14);
              }
            }
          }
        );
      }
      
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
      if (parsed.length === 0) {
        toast.error("No medicines could be parsed. Please check the image quality or try pasting raw text.");
        setOcrLoading(false);
        return;
      }
      setScannedItems(parsed);
      setSelectedRowIds(parsed.map(x => x.id));
      
      const initialStatuses: Record<string, "idle" | "saving" | "success" | "error"> = {};
      parsed.forEach(x => {
        initialStatuses[x.id] = "idle";
      });
      setRowStatuses(initialStatuses);

      setOcrLoading(false);
      setShowScanner(false);
      setShowConfirmModal(true);
    } catch (err) {
      console.error("OCR Exception", err);
      toast.error(
        <div className="flex flex-col gap-1.5 text-xs text-slate-800 p-1">
          <p className="font-bold text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
            <span>OCR Engine Blocked</span>
          </p>
          <p className="text-slate-650 leading-relaxed font-medium">
            Local network or browser blocked loading the OCR files from CDNs.
          </p>
          <button 
            onClick={() => {
              toast.dismiss();
              setShowPasteModal(true);
            }}
            className="mt-1.5 px-3 py-1 rounded bg-slate-800 text-white font-bold text-[10px] hover:bg-slate-700 shadow-sm transition-all"
          >
            📋 Paste Invoice Text Instead (Fail-safe)
          </button>
        </div>,
        { duration: 8000 }
      );
      setOcrLoading(false);
      setShowScanner(false); // Gracefully close the scanning modal so it doesn't get stuck!
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) {
      toast.error("Please paste some text first.");
      return;
    }
    
    setImagePreview(null); // No preview since it was text pasting
    const parsed = parseInvoiceText(pastedText, localMedicines);
    if (parsed.length === 0) {
      toast.error("No medicines could be parsed. Please check the pasted text.");
      return;
    }
    setScannedItems(parsed);
    setSelectedRowIds(parsed.map(x => x.id));
    
    const initialStatuses: Record<string, "idle" | "saving" | "success" | "error"> = {};
    parsed.forEach(x => {
      initialStatuses[x.id] = "idle";
    });
    setRowStatuses(initialStatuses);

    setShowPasteModal(false);
    setShowConfirmModal(true);
    setPastedText("");
    toast.success("Text parsed successfully!");
  };

  const handleConfirmScannedSingle = (item: ScannedItem) => {
    if (item.medicineId === "new") {
      setMedicineId("new");
      setMedicineSearch(item.name || "");
    } else if (item.medicineId) {
      setMedicineId(item.medicineId);
      const med = localMedicines.find(m => m.id === item.medicineId);
      if (med) setMedicineSearch(med.name);
    } else if (item.name) {
      setMedicineId("new");
      setMedicineSearch(item.name);
    }
    
    setBatchNo(item.batchNo || "");
    setMfgDate(item.mfgDate || "");
    setExpiryDate(item.expiryDate || "");
    
    const parsedQty = parseInt(item.quantity || "0", 10);
    setQuantity(item.quantity || "");
    
    let pSize = 10;
    if (item.medicineId && item.medicineId !== "new") {
      const med = localMedicines.find(m => m.id === item.medicineId);
      if (med && med.packSize) pSize = parseUnitsPerPack(med.packSize);
    }
    setUnitsPerPack(String(pSize));
    if (!isNaN(parsedQty) && parsedQty > 0) {
      setPacks(String(Math.floor(parsedQty / pSize)));
      setLooseUnits(String(parsedQty % pSize));
    } else {
      setPacks("");
      setLooseUnits("");
    }

    setPurchaseRate(item.purchaseRate || "");
    setMrp(item.mrp || "");
    setSaleRate(item.saleRate || "");
    setGstRate(item.gstRate || "12");
    setHsnCode(item.hsnCode || "");
    
    setShowConfirmModal(false);
    toast.success(`Populated "${item.name}" into main form! You can now adjust and save it.`);
  };

  async function saveSingleItem(item: ScannedItem): Promise<boolean> {
    setRowStatuses(prev => ({ ...prev, [item.id]: 'saving' }));
    let actualMedicineId = item.medicineId;

    if (item.medicineId === "new") {
      const name = item.name.trim();
      if (!name) {
        toast.error("Please enter a valid medicine name");
        setRowStatuses(prev => ({ ...prev, [item.id]: 'error' }));
        return false;
      }

      try {
        const mrpValue = Math.round(sanitizePrice(item.mrp) * 100);
        let gstRateValue = sanitizeInt(item.gstRate, 12);
        const validGstRates = [0, 5, 12, 18, 28];
        if (!validGstRates.includes(gstRateValue)) {
          gstRateValue = 12;
        }
        const hsnCodeValue = String(item.hsnCode || "").trim();

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
          toast.error(result.error ?? `Failed to create medicine "${name}"`);
          setRowStatuses(prev => ({ ...prev, [item.id]: 'error' }));
          return false;
        }

        actualMedicineId = result.data.id;
        
        const newItem: SelectItem = {
          id: result.data.id,
          name: name,
          genericName: "",
          gstRate: gstRateValue,
          hsnCode: hsnCodeValue,
          mrpPaisa: mrpValue,
        };
        setLocalMedicines((prev) => [newItem, ...prev]);
      } catch (err) {
        toast.error(`Error creating medicine "${name}"`);
        setRowStatuses(prev => ({ ...prev, [item.id]: 'error' }));
        return false;
      }
    }

    if (!actualMedicineId) {
      toast.error(`Please map "${item.name}" to a valid medicine first.`);
      setRowStatuses(prev => ({ ...prev, [item.id]: 'error' }));
      return false;
    }

    let parsedGst = sanitizeInt(item.gstRate, 12);
    const validGstRates = [0, 5, 12, 18, 28];
    if (!validGstRates.includes(parsedGst)) {
      parsedGst = 12;
    }

    const parsedExpiry = parseWebFlexDate(item.expiryDate, 'exp');
    const parsedMfg = item.mfgDate ? parseWebFlexDate(item.mfgDate, 'mfg') : "";

    if (!parsedExpiry) {
      toast.error(`Expiry date is required and must be in a valid format (e.g. MM/YYYY) for "${item.name}"`);
      setRowStatuses(prev => ({ ...prev, [item.id]: 'error' }));
      return false;
    }
    if (item.mfgDate && !parsedMfg) {
      toast.error(`Invalid Manufacturing Date format (e.g. MM/YYYY) for "${item.name}"`);
      setRowStatuses(prev => ({ ...prev, [item.id]: 'error' }));
      return false;
    }

    const payload = {
      medicineId: actualMedicineId,
      supplierId: String(item.supplierId || supplierId || ""),
      batchNo: String(item.batchNo).trim(),
      mfgDate: parsedMfg,
      expiryDate: parsedExpiry,
      purchaseRatePaisa: Math.round(sanitizePrice(item.purchaseRate) * 100),
      mrpPaisa: Math.round(sanitizePrice(item.mrp) * 100),
      saleRatePaisa: Math.round(sanitizePrice(item.saleRate) * 100),
      gstRate: parsedGst,
      hsnCode: String(item.hsnCode || "").trim(),
      quantity: sanitizeInt(item.quantity, 0),
      reorderLevel: 10,
      rackLocation: ""
    };

    if (!payload.batchNo) {
      toast.error(`Batch number is required for "${item.name}"`);
      setRowStatuses(prev => ({ ...prev, [item.id]: 'error' }));
      return false;
    }
    if (!payload.expiryDate) {
      toast.error(`Expiry date is required for "${item.name}"`);
      setRowStatuses(prev => ({ ...prev, [item.id]: 'error' }));
      return false;
    }
    if (item.quantity === "" || payload.quantity <= 0) {
      toast.error(`Quantity is required & must be greater than zero for "${item.name}"`);
      setRowStatuses(prev => ({ ...prev, [item.id]: 'error' }));
      return false;
    }
    if (item.purchaseRate === "" || payload.purchaseRatePaisa <= 0) {
      toast.error(`Purchase rate is required & must be greater than zero for "${item.name}"`);
      setRowStatuses(prev => ({ ...prev, [item.id]: 'error' }));
      return false;
    }
    if (item.mrp === "" || payload.mrpPaisa <= 0) {
      toast.error(`MRP is required & must be greater than zero for "${item.name}"`);
      setRowStatuses(prev => ({ ...prev, [item.id]: 'error' }));
      return false;
    }
    if (item.gstRate === "") {
      toast.error(`GST rate is required for "${item.name}"`);
      setRowStatuses(prev => ({ ...prev, [item.id]: 'error' }));
      return false;
    }

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? `Unable to save stock for "${item.name}"`);
        setRowStatuses(prev => ({ ...prev, [item.id]: 'error' }));
        return false;
      }

      setRowStatuses(prev => ({ ...prev, [item.id]: 'success' }));
      return true;
    } catch {
      toast.error(`Network error adding stock for "${item.name}"`);
      setRowStatuses(prev => ({ ...prev, [item.id]: 'error' }));
      return false;
    }
  }

  async function saveSelectedItems() {
    const itemsToSave = scannedItems.filter(item => selectedRowIds.includes(item.id) && rowStatuses[item.id] !== 'success');
    if (itemsToSave.length === 0) {
      toast.error("No items selected or all selected items are already added.");
      return;
    }

    setSaving(true);
    let successCount = 0;
    
    for (const item of itemsToSave) {
      const ok = await saveSingleItem(item);
      if (ok) successCount++;
    }

    setSaving(false);
    toast.success(`Bulk Entry: Successfully added ${successCount} of ${itemsToSave.length} medicines to inventory!`);
    
    // Check if everything is successfully added
    const allDone = scannedItems.every(x => rowStatuses[x.id] === "success" || !selectedRowIds.includes(x.id));
    if (allDone) {
      setTimeout(() => {
        setShowConfirmModal(false);
        router.push("/shop/inventory");
        router.refresh();
      }, 1500);
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
        const validGstRates = [0, 5, 12, 18, 28];
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

    // Validate and sanitize GST rate strictly to match Zod literals [0, 5, 12, 18, 28]
    let parsedGst = sanitizeInt(gstRate, 12);
    const validGstRates = [0, 5, 12, 18, 28];
    if (!validGstRates.includes(parsedGst)) {
      parsedGst = 12; // Fallback
    }

    const parsedExpiry = parseWebFlexDate(expiryDate, 'exp');
    const parsedMfg = mfgDate ? parseWebFlexDate(mfgDate, 'mfg') : "";

    // Validate required fields on client side
    if (!String(batchNo).trim()) {
      toast.error("Batch number is required");
      setSaving(false);
      return;
    }
    if (!parsedExpiry) {
      toast.error("Expiry date is required and must be in a valid format (e.g. MM/YYYY or DD/MM/YYYY)");
      setSaving(false);
      return;
    }
    if (mfgDate && !parsedMfg) {
      toast.error("Invalid Manufacturing Date format (e.g. MM/YYYY or DD/MM/YYYY)");
      setSaving(false);
      return;
    }
    if (sanitizeInt(quantity, 0) <= 0) {
      toast.error("Quantity must be greater than zero");
      setSaving(false);
      return;
    }

    const payload = {
      medicineId: actualMedicineId,
      supplierId: String(supplierId),
      batchNo: String(batchNo).trim(),
      mfgDate: parsedMfg,
      expiryDate: parsedExpiry,
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

  const updateScannedItem = (id: string, field: keyof ScannedItem, value: string) => {
    setScannedItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'medicineId') {
          const med = localMedicines.find(m => m.id === value);
          if (med) {
            updated.gstRate = updated.gstRate || String(med.gstRate ?? 12);
            updated.hsnCode = updated.hsnCode || med.hsnCode || "";
            updated.mrp = updated.mrp || (med.mrpPaisa ? String(med.mrpPaisa / 100) : "");
            updated.saleRate = updated.saleRate || (med.mrpPaisa ? String(med.mrpPaisa / 100) : "");
          }
        }
        return updated;
      }
      return item;
    }));
  };

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
            Stockist dawa lekar aaya hai? Scan invoice with camera, upload image, paste text, or <strong>import CSV/TXT/PDF bulk stock file</strong> directly!
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Conditionally render a single camera option based on device detection */}
          {isMobile ? (
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-sm hover:shadow transition-all min-h-11 hover:scale-[1.02] active:scale-[0.98]">
              <Camera className="h-4 w-4" />
              <span>Camera Scan (Native)</span>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                capture="environment"
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowScanner(true);
                startCamera();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-med-green hover:bg-emerald-600 text-white font-bold text-xs shadow-sm hover:shadow transition-all min-h-11 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Camera className="h-4 w-4" />
              <span>Camera Scan (Live Feed)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowBarcodeScanner(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all min-h-11 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="h-4 w-4" />
            <span>Scan Barcode</span>
          </button>
          
          <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer shadow-sm min-h-11 transition-all hover:scale-[1.02] active:scale-[0.98]">
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
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-350 bg-slate-100/80 hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-sm min-h-11 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Clipboard className="h-4 w-4 text-slate-550" />
            <span>Paste Text (Fail-safe)</span>
          </button>

          {/* ── NEW: Bulk CSV/TXT/PDF/Excel Stock File Upload ── */}
          <label
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs cursor-pointer shadow-sm min-h-11 transition-all hover:scale-[1.02] active:scale-[0.98] hover:border-purple-500 ${bulkFileProcessing ? "opacity-70 cursor-wait" : ""}`}
            title="Upload CSV, TXT, or PDF file with stock data"
          >
            {bulkFileProcessing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /><span>{bulkFileStep || "Processing..."}</span></>
            ) : (
              <><FileSpreadsheet className="h-4 w-4" /><span>Upload CSV / TXT / PDF</span></>
            )}
            <input
              ref={bulkFileInputRef}
              type="file"
              accept=".csv,.txt,.pdf,.xlsx,.xls"
              className="hidden"
              disabled={bulkFileProcessing}
              onChange={handleBulkFileUpload}
            />
          </label>
        </div>
      </div>

      {/* CSV/TXT Format Guide Info Card */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl border border-purple-100 bg-purple-50/40 text-xs">
        <FileSpreadsheet className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-purple-800 mb-1">CSV/TXT Bulk Stock File Format Guide</p>
          <p className="text-slate-600 leading-relaxed">
            Upload a <strong>.csv</strong> or <strong>.txt</strong> file with columns: 
            <code className="mx-1 px-1 py-0.5 bg-purple-100 rounded text-[10px] font-mono">Medicine Name, Batch No, MFG Date, Expiry Date, Qty, Purchase Rate, MRP, GST%, HSN</code>
            — or upload a <strong>.pdf</strong> invoice which will be auto-scanned via OCR.
          </p>
          <p className="text-slate-500 mt-1">
            <strong>Date formats supported:</strong> DD/MM/YYYY, MM/YYYY, YYYY-MM-DD — exact dates are preserved! Header row is optional.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const csvContent = `Medicine Name,Batch No,MFG Date,Expiry Date,Qty,Purchase Rate,MRP,GST%,HSN\nParacetamol 500mg Tab,BCH001,01/06/2024,31/05/2026,100,8.50,15.00,12,3004\nAmoxicillin 250mg,BCH002,15/03/2024,14/03/2026,50,18.90,28.00,12,3004\nMetformin 500mg ER,BCH003,,12/2025,200,6.40,14.50,5,3004`;
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "stock_import_template.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Sample CSV template downloaded!");
          }}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold transition-all shadow-sm"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Sample CSV
        </button>
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
                  
                  {/* Medicine Database Suggestions */}
                  {(drugMasterHits.length > 0 || drugMasterLoading) && (
                    <div>
                      <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5">
                        {drugMasterLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                        ) : (
                          <Database className="h-3 w-3 text-blue-500" />
                        )}
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                          Medicine Database {drugMasterLoading ? "— Searching..." : `— ${drugMasterHits.length} found`}
                        </span>
                        <Sparkles className="h-3 w-3 text-blue-400 ml-auto" />
                      </div>
                      {drugMasterHits.slice(0, 8).map((hit, i) => (
                        <button
                          key={`dm-stock-${hit.name}-${i}`}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectDrugMasterHit(hit);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-blue-50/60"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-semibold text-slate-800">{hit.name}</p>
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">Database ✓</span>
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
                prefillBarcode={prefillBarcode}
                onSuccess={handleAddMedicineSuccess}
                onCancel={() => { setShowAddMedicine(false); setPrefillBarcode(""); }}
              />
            </div>
          )}
        </div>

        {/* Dynamic Controlled Form Inputs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-605 font-semibold">Supplier / Manufacturer</span>
            <button
              type="button"
              onClick={() => setShowAddSupplier(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-med-green hover:underline focus:outline-none"
            >
              <Plus className="h-3.5 w-3.5" /> Register Manufacturer
            </button>
          </div>
          <select 
            name="supplierId" 
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-med-green focus:ring-2 focus:ring-med-green/20 outline-none font-semibold text-slate-700 bg-white"
          >
            <option value="">No supplier</option>
            {localSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </div>

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
            type="text" 
            value={mfgDate} 
            onChange={(e) => setMfgDate(e.target.value)} 
            placeholder="MM/YYYY or DD/MM/YYYY"
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold">Expiry date *</span>
          <input 
            name="expiryDate" 
            type="text" 
            required 
            value={expiryDate} 
            onChange={(e) => setExpiryDate(e.target.value)} 
            placeholder="MM/YYYY or DD/MM/YYYY"
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold flex items-center gap-1.5">
            Packs / Strips
            <span className="text-xs font-normal text-slate-400">(e.g. 10 strips)</span>
          </span>
          <input 
            name="packs" 
            type="number" 
            value={packs} 
            onChange={(e) => {
              const val = e.target.value;
              setPacks(val);
              calculateAndSetQuantity(val, unitsPerPack, looseUnits);
            }} 
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
            placeholder="0"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold flex items-center gap-1.5">
            Pack Size (Qty/Pack)
            <span className="text-xs font-normal text-slate-400">(e.g. 10 tabs/strip)</span>
          </span>
          <input 
            name="unitsPerPack" 
            type="number" 
            value={unitsPerPack} 
            onChange={(e) => {
              const val = e.target.value;
              setUnitsPerPack(val);
              calculateAndSetQuantity(packs, val, looseUnits);
            }} 
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
            placeholder="e.g. 10"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold flex items-center gap-1.5">
            Loose Units
            <span className="text-xs font-normal text-slate-400">(Optional loose tablets)</span>
          </span>
          <input 
            name="looseUnits" 
            type="number" 
            value={looseUnits} 
            onChange={(e) => {
              const val = e.target.value;
              setLooseUnits(val);
              calculateAndSetQuantity(packs, unitsPerPack, val);
            }} 
            className="h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm" 
            placeholder="0"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-600 font-semibold flex items-center gap-1">
            Total Qty (Loose Units) *
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Calculated</span>
          </span>
          <input 
            name="quantity" 
            type="number" 
            required 
            value={quantity} 
            onChange={(e) => {
              setQuantity(e.target.value);
              setPacks("");
              setLooseUnits("");
            }} 
            className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 text-sm font-semibold text-slate-700" 
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

      {/* ─── MODAL 0: Barcode Camera Scanner ─── */}
      {showBarcodeScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-5 text-white shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500 animate-pulse" />
                <h3 className="text-base font-bold tracking-tight">Camera Barcode Scanner</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowBarcodeScanner(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="overflow-hidden rounded-xl border border-slate-850 bg-slate-900 shadow-inner">
              <BarcodeScanner
                onScan={(result) => handleBarcodeScan(result.text)}
                continuousMode={false}
                onClose={() => setShowBarcodeScanner(false)}
                fullscreenMobile={false}
              />
            </div>
          </div>
        </div>
      )}

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

      {/* ─── MODAL 2: Interactive Table-Aware Scanned Details Confirmation ─── */}
      {showConfirmModal && scannedItems.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-7xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">Review Scanned Invoice Details</h3>
                  <p className="text-xs text-slate-500 font-medium">Verify or adjust detected stockist values below. We successfully extracted {scannedItems.length} rows.</p>
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
            <div className="flex-1 overflow-y-auto p-6 grid gap-6 lg:grid-cols-12 min-h-0">
              
              {/* Left Side: Captured Invoice Image Preview / Raw Text Info */}
              <div className="lg:col-span-3 flex flex-col space-y-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span>Scanned Document Source</span>
                </span>
                
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden relative flex items-center justify-center min-h-[220px] max-h-[400px]">
                  {imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt="Scanned Invoice Snapshot" 
                      className="max-h-[380px] object-contain rounded-lg shadow-sm" 
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
                    <p className="truncate opacity-75">All {scannedItems.length} rows parsed locally.</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-9 space-y-4 flex flex-col min-h-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Auto-Detected Form Fields</span>
                  </span>
                  <div className="flex items-center gap-3">
                    {/* Bulk Supplier Change */}
                    <div className="flex items-center gap-1.5 border border-purple-100 bg-purple-50/50 rounded px-2 py-0.5">
                      <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">Bulk Supplier:</span>
                      <select
                        onChange={(e) => {
                          const newSupId = e.target.value;
                          if (!newSupId) return;
                          setScannedItems(prev => prev.map(item => {
                            if (selectedRowIds.includes(item.id)) {
                              return { ...item, supplierId: newSupId };
                            }
                            return item;
                          }));
                          toast.success("Updated supplier/manufacturer for all selected rows!");
                        }}
                        className="h-7 rounded border border-purple-200 bg-white px-1.5 text-[10px] font-semibold text-purple-750 outline-none"
                      >
                        <option value="">Set Manufacturer</option>
                        {localSuppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedRowIds.length === scannedItems.length) {
                          setSelectedRowIds([]);
                        } else {
                          setSelectedRowIds(scannedItems.map(x => x.id));
                        }
                      }}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 border border-emerald-250 bg-emerald-50 px-2.5 py-1 rounded transition-colors"
                    >
                      {selectedRowIds.length === scannedItems.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/20 max-h-[50vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 text-slate-650 font-bold w-12 text-center">Import?</th>
                        <th className="py-3 px-3 text-slate-600 font-bold min-w-[200px]">Medicine Match</th>
                        <th className="py-3 px-3 text-slate-600 font-bold w-48">Manufacturer / Supplier</th>
                        <th className="py-3 px-3 text-slate-600 font-bold w-28">Batch No</th>
                        <th className="py-3 px-3 text-slate-600 font-bold w-32">MFG Date</th>
                        <th className="py-3 px-3 text-slate-600 font-bold w-36">Expiry Date <span className="text-red-500">*</span></th>
                        <th className="py-3 px-3 text-slate-600 font-bold w-24">Qty (Loose)</th>
                        <th className="py-3 px-3 text-slate-600 font-bold w-24">Cost Rate (₹)</th>
                        <th className="py-3 px-3 text-slate-600 font-bold w-24">Sale Rate (₹)</th>
                        <th className="py-3 px-3 text-slate-600 font-bold w-24">MRP (₹)</th>
                        <th className="py-3 px-3 text-slate-650 font-bold w-20">GST (%)</th>
                        <th className="py-3 px-3 text-slate-600 font-bold w-28 text-center">Status / Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white">
                      {scannedItems.map((item) => {
                        const status = rowStatuses[item.id] || "idle";
                        const isSelected = selectedRowIds.includes(item.id);
                        
                        return (
                          <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${status === 'success' ? 'bg-emerald-50/20' : ''}`}>
                            <td className="py-2.5 px-3 text-center">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                disabled={status === 'success' || status === 'saving'}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRowIds(prev => [...prev, item.id]);
                                  } else {
                                    setSelectedRowIds(prev => prev.filter(id => id !== item.id));
                                  }
                                }}
                                className="h-4.5 w-4.5 rounded border-slate-350 text-emerald-600 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="space-y-1">
                                <select
                                  value={item.medicineId}
                                  disabled={status === 'success' || status === 'saving'}
                                  onChange={(e) => updateScannedItem(item.id, 'medicineId', e.target.value)}
                                  className="h-8.5 w-full rounded border border-slate-300 bg-white px-2 font-semibold text-slate-800 text-[11px] outline-none focus:ring-1 focus:ring-med-green"
                                >
                                  <option value="new" className="text-amber-650 font-bold">✨ Add as New Medicine</option>
                                  {localMedicines.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} {m.genericName ? "(" + m.genericName + ")" : ""}
                                    </option>
                                  ))}
                                </select>
                                
                                {item.medicineId === "new" && (
                                  <input 
                                    type="text"
                                    value={item.name}
                                    placeholder="Enter Brand name..."
                                    disabled={status === 'success' || status === 'saving'}
                                    onChange={(e) => updateScannedItem(item.id, 'name', e.target.value)}
                                    className="h-8 w-full rounded border border-slate-300 px-2 text-[11px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-med-green"
                                  />
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={item.supplierId || ""}
                                disabled={status === 'success' || status === 'saving'}
                                onChange={(e) => updateScannedItem(item.id, 'supplierId', e.target.value)}
                                className="h-8.5 w-full rounded border border-slate-300 bg-white px-2 font-semibold text-slate-700 text-[11px] outline-none focus:ring-1 focus:ring-med-green"
                              >
                                <option value="">No Supplier</option>
                                {localSuppliers.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-3">
                              <input 
                                type="text"
                                value={item.batchNo}
                                disabled={status === 'success' || status === 'saving'}
                                onChange={(e) => updateScannedItem(item.id, 'batchNo', e.target.value)}
                                className="h-8.5 w-full rounded border border-slate-300 px-2 text-[11px] font-mono uppercase font-bold text-slate-800 outline-none focus:ring-1 focus:ring-med-green"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input 
                                type="text"
                                value={item.mfgDate}
                                disabled={status === 'success' || status === 'saving'}
                                onChange={(e) => updateScannedItem(item.id, 'mfgDate', e.target.value)}
                                placeholder="MM/YYYY"
                                className="h-8.5 w-full rounded border border-slate-300 px-1 text-[11px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-med-green"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input 
                                type="text"
                                value={item.expiryDate}
                                disabled={status === 'success' || status === 'saving'}
                                onChange={(e) => updateScannedItem(item.id, 'expiryDate', e.target.value)}
                                placeholder="MM/YYYY"
                                className={`h-8.5 w-full rounded border px-1 text-[11px] font-bold text-slate-800 outline-none focus:ring-1 ${!item.expiryDate ? 'border-red-300 bg-red-50/50 focus:ring-red-450' : 'border-slate-300 focus:ring-med-green'}`}
                                title="Expiry Date (required)"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input 
                                type="text"
                                value={item.quantity}
                                disabled={status === 'success' || status === 'saving'}
                                onChange={(e) => updateScannedItem(item.id, 'quantity', e.target.value)}
                                className="h-8.5 w-full rounded border border-slate-300 px-2 text-[11px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-med-green"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input 
                                type="text"
                                value={item.purchaseRate}
                                disabled={status === 'success' || status === 'saving'}
                                onChange={(e) => updateScannedItem(item.id, 'purchaseRate', e.target.value)}
                                className="h-8.5 w-full rounded border border-slate-300 px-2 text-[11px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-med-green"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input 
                                type="text"
                                value={item.saleRate}
                                disabled={status === 'success' || status === 'saving'}
                                onChange={(e) => updateScannedItem(item.id, 'saleRate', e.target.value)}
                                className="h-8.5 w-full rounded border border-slate-300 px-2 text-[11px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-med-green"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input 
                                type="text"
                                value={item.mrp}
                                disabled={status === 'success' || status === 'saving'}
                                onChange={(e) => updateScannedItem(item.id, 'mrp', e.target.value)}
                                className="h-8.5 w-full rounded border border-slate-300 px-2 text-[11px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-med-green"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={item.gstRate}
                                disabled={status === 'success' || status === 'saving'}
                                onChange={(e) => updateScannedItem(item.id, 'gstRate', e.target.value)}
                                className="h-8.5 w-full rounded border border-slate-300 px-1 text-[11px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-med-green bg-white"
                              >
                                <option value="">Select GST</option>
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {status === 'idle' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => saveSingleItem(item)}
                                      className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-sm transition-all"
                                    >
                                      Import
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmScannedSingle(item)}
                                      title="Populate in Main Form"
                                      className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 text-[10px] font-bold transition-all"
                                    >
                                      Edit
                                    </button>
                                  </>
                                )}
                                {status === 'saving' && (
                                  <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Saving...</span>
                                  </span>
                                )}
                                {status === 'success' && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    <span>Added ✓</span>
                                  </span>
                                )}
                                {status === 'error' && (
                                  <button
                                    type="button"
                                    onClick={() => saveSingleItem(item)}
                                    className="flex items-center gap-1 text-[10px] font-bold text-red-650 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full hover:bg-red-100 transition-colors"
                                    title="Retry Import"
                                  >
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                    <span>Retry</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Info Tip block */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 text-emerald-850 text-xs border border-emerald-100">
                  <Info className="h-4.5 w-4.5 shrink-0 text-emerald-650 mt-0.5" />
                  <div className="space-y-1">
                    <p className="leading-normal font-semibold">Bulk Medicine Processing Instructions:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] leading-relaxed text-slate-650 font-medium">
                      <li>Use the dropdown inside each row to bind it to an existing medicine in the database or select <strong>Add as New Medicine</strong> to auto-create it.</li>
                      <li>Modify quantities, rates, MRPs, batches, or dates immediately inline. No screen transitions required!</li>
                      <li>Click <strong>Import</strong> on a specific row to save that single item, or click <strong>Edit</strong> to copy details into the main form.</li>
                      <li>Select multiple rows using checkboxes and click <strong>Import Selected to Stock</strong> below to run batch creation!</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-500">
                Selected: {selectedRowIds.length} of {scannedItems.length} items
              </span>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs min-h-10 transition-colors"
                >
                  Discard Scan
                </button>

                <button
                  type="button"
                  disabled={saving || selectedRowIds.length === 0}
                  onClick={saveSelectedItems}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-med-green hover:bg-emerald-600 text-white font-bold text-xs min-h-10 shadow-sm transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Selected ({selectedRowIds.length})...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Import Selected to Stock ({selectedRowIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── INLINE MANUFACTURER REGISTRATION MODAL ─── */}
      {showAddSupplier && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowAddSupplier(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-emerald-600" />
                  <span>Register Manufacturer / CFA</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Add bulk supply channel account inline</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddSupplier(false)} 
                className="rounded-lg p-2 hover:bg-slate-200 transition-colors text-slate-500 outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleAddSupplierSubmit} className="p-6 space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Manufacturer / Supplier Name *</span>
                <input 
                  required 
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold text-slate-700" 
                  placeholder="e.g. Cipla Healthcare Ltd" 
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Phone</span>
                  <input 
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors text-slate-700" 
                    placeholder="Contact number" 
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Email</span>
                  <input 
                    type="email" 
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors text-slate-700" 
                    placeholder="Email address" 
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Depot Address</span>
                <input 
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors text-slate-700" 
                  placeholder="Supply depot address" 
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-500">GSTIN No.</span>
                  <input 
                    value={supplierGstin}
                    onChange={(e) => setSupplierGstin(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-mono text-slate-700" 
                    placeholder="15-digit GSTIN" 
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Credit Days</span>
                  <input 
                    type="number" 
                    min="0"
                    value={supplierCreditDays}
                    onChange={(e) => setSupplierCreditDays(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold text-slate-700 text-center" 
                  />
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-5">
                <button
                  type="button"
                  onClick={() => setShowAddSupplier(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs min-h-10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSupplier}
                  className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-med-green hover:bg-emerald-600 text-white font-bold text-xs min-h-10 shadow-sm transition-all disabled:opacity-50"
                >
                  {addingSupplier ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>Save Manufacturer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
