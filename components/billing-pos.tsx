"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import { Camera, Loader2, Minus, Plus, Printer, Save, Search, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { calculateBillTotals } from "@/lib/gst";
import type { SaleLine } from "@/lib/types";
import { daysUntil, formatCurrency } from "@/lib/utils";

// ─── Lazy-loaded barcode reader singleton ───
// @zxing/browser (~300KB) is only imported when user actually clicks "Camera scan"
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
    schedule: SaleLine["schedule"];
  };
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

export function BillingPos() {
  const [rows, setRows] = useState<InventorySearchRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [query, setQuery] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [doctorName, setDoctorName] = useState("");
  const [prescriptionNo, setPrescriptionNo] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [lines, setLines] = useState<BillingLine[]>([]);
  const [lastInvoice, setLastInvoice] = useState<{ id: string; invoiceNo: string; totalPaisa: number; phone: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const totals = useMemo(() => calculateBillTotals(lines), [lines]);

  // Fetch recent customers (limited)
  useEffect(() => {
    fetch("/api/customers")
      .then((response) => response.json())
      .then((result) => setCustomers((result.data ?? []).slice(0, 50)))
      .catch(() => setCustomers([]));
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setRows([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/medicines/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((result) => setRows(result.data ?? []))
        .catch(() => undefined);
    }, 300);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const matches = query.length < 2 ? [] : rows;

  function addItemToBill(item: InventorySearchRow) {
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
  }

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

  // ─── Camera barcode scanner with proper lifecycle management ───
  function stopCameraStream() {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  }

  async function scanBarcode() {
    if (!videoRef.current || scanning) return;
    setScanning(true);
    try {
      const reader = await getReader();
      const result = await reader.decodeOnceFromVideoDevice(undefined, videoRef.current);
      stopCameraStream(); // Stop camera immediately after successful scan
      const code = result.getText();
      const response = await fetch(`/api/medicines/search?q=${encodeURIComponent(code)}`);
      const resultJson = await response.json();
      const item = resultJson.data?.[0] as InventorySearchRow | undefined;
      if (item) {
        setRows([item]);
        addItemToBill(item);
        toast.success(`Added ${item.medicine.name}`);
      } else {
        setQuery(code);
        toast.warning("Barcode not in stock. Search filled for manual review.");
      }
    } catch {
      stopCameraStream(); // Stop camera on error too
      toast.error("Camera scan was cancelled or unavailable.");
    } finally {
      setScanning(false);
    }
  }

  async function saveBill() {
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
          customerName,
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
      setLines([]);
      setQuery("");
      setCustomerName("Walk-in Customer");
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

  const shareTarget = lastInvoice
    ? {
        invoiceNo: lastInvoice.invoiceNo,
        totalPaisa: lastInvoice.totalPaisa,
        phone: lastInvoice.phone
      }
    : {
        invoiceNo: "",
        totalPaisa: totals.totalPaisa,
        phone: customerPhone
      };
  const whatsappText = encodeURIComponent(
    `Medicare invoice${shareTarget.invoiceNo ? ` ${shareTarget.invoiceNo}` : ""}. Total: ${formatCurrency(shareTarget.totalPaisa)}. Thank you.`
  );
  const whatsappHref = shareTarget.phone ? `https://wa.me/91${shareTarget.phone.replace(/\D/g, "").slice(-10)}?text=${whatsappText}` : `https://wa.me/?text=${whatsappText}`;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_160px]">
          <label className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input
              className="h-12 w-full rounded-md border border-slate-300 pl-10 pr-3 outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20"
              placeholder="Type 2-3 letters or scan barcode"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button onClick={scanBarcode} disabled={scanning} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-slate-300 font-semibold text-med-navy hover:bg-slate-50 disabled:opacity-60">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {scanning ? "Scanning..." : "Camera scan"}
          </button>
          <select className="h-12 rounded-md border border-slate-300 px-3" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="credit">Credit</option>
          </select>
        </div>

        <video ref={videoRef} className={`mt-3 h-48 w-full rounded-md bg-slate-900 object-cover ${scanning ? "block" : "hidden"}`} muted />

        {matches.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
            {matches.slice(0, 6).map((row) => (
              <button key={row.id} onClick={() => addLine(row.id)} className="grid w-full gap-2 border-b border-slate-100 p-3 text-left hover:bg-med-greenSoft md:grid-cols-[1fr_90px_90px_90px]">
                <span>
                  <span className="block font-semibold text-med-navy">{row.medicine.name}</span>
                  <span className="text-sm text-slate-500">Batch {row.batchNo} | {row.medicine.manufacturer}</span>
                </span>
                <span className="text-sm">Stock {row.quantity}</span>
                <span className="text-sm">Exp {daysUntil(row.expiryDate)}d</span>
                <span className="text-sm font-semibold">{formatCurrency(row.saleRatePaisa)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-500">
                {["Medicine", "Batch", "Qty", "Rate", "Disc%", "GST", "Amt", ""].map((head) => (
                  <th key={head} className={`border-b border-slate-200 px-2 py-2.5 font-medium text-xs ${head === "Batch" ? "hidden md:table-cell" : ""}`}>{head}</th>
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
                    <td className="hidden md:table-cell px-2 py-2 font-mono text-[10px]">{line.batchNo}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-0.5">
                        <button className="rounded border p-0.5" onClick={() => updateLine(line.inventoryId, { quantity: Math.max(1, line.quantity - 1) })}><Minus className="h-3 w-3" /></button>
                        <input className="h-7 w-10 rounded border text-center text-xs" type="number" min={1} max={line.maxQuantity} value={line.quantity} onChange={(event) => updateLine(line.inventoryId, { quantity: Number(event.target.value) || 1 })} />
                        <button className="rounded border p-0.5" onClick={() => updateLine(line.inventoryId, { quantity: line.quantity + 1 })}><Plus className="h-3 w-3" /></button>
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
          {!lines.length && <div className="py-16 text-center text-slate-500">Search a medicine to begin the bill.</div>}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-med-navy">Customer</h2>
          <input className="mt-3 h-11 w-full rounded-md border border-slate-300 px-3" placeholder="Customer name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
          <input className="mt-3 h-11 w-full rounded-md border border-slate-300 px-3" placeholder="Phone" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
          <div className="mt-2 flex flex-wrap gap-2">
            {customers.slice(0, 2).map((customer) => (
              <button key={customer.id} className="rounded-md bg-slate-100 px-3 py-2 text-xs" onClick={() => { setCustomerName(customer.name); setCustomerPhone(customer.phone ?? ""); setDoctorName(customer.doctorName ?? ""); }}>
                {customer.name}
              </button>
            ))}
          </div>
          <input className="mt-3 h-11 w-full rounded-md border border-slate-300 px-3" placeholder="Doctor name" value={doctorName} onChange={(event) => setDoctorName(event.target.value)} />
          <input className="mt-3 h-11 w-full rounded-md border border-slate-300 px-3" placeholder="Prescription number" value={prescriptionNo} onChange={(event) => setPrescriptionNo(event.target.value)} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-med-navy">Bill Summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <Summary label="Subtotal" value={totals.subtotalPaisa} />
            <Summary label="Discount" value={-totals.discountPaisa} />
            <Summary label="Taxable" value={totals.taxablePaisa} />
            <Summary label="CGST" value={totals.cgstPaisa} />
            <Summary label="SGST" value={totals.sgstPaisa} />
            <Summary label="Round off" value={totals.roundOffPaisa} />
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-lg font-bold text-med-navy">
              <span>Total</span>
              <span>{formatCurrency(totals.totalPaisa)}</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={saveBill} disabled={saving || !lines.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-med-green font-semibold text-white hover:bg-med-greenDark disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? "Saving" : "Save"}
            </button>
            <button onClick={() => window.print()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 font-semibold">
              <Printer className="h-4 w-4" /> Print
            </button>
            <a href={whatsappHref} target="_blank" className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700">
              <Send className="h-4 w-4" /> Share on WhatsApp
            </a>
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
