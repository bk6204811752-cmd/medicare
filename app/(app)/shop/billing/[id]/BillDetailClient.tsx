"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, Printer, ArrowLeft, ShieldCheck, Heart, FileText, Share2, Loader2, Eye, X, Download, CheckCircle2, Building2, Phone, MapPin, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";

type BillDetailClientProps = {
  sale: Record<string, any>;
  items: Record<string, any>[];
  tenant: Record<string, any>;
  initialFormat?: "a4" | "thermal";
  autoSharePDF?: boolean;
};

// ── Convert number to Indian currency words ──
function numberToWords(amount: number): string {
  if (isNaN(amount) || amount < 0) return "Zero Rupees Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + " " + convert(n % 10);
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred " + convert(n % 100);
    if (n < 100000) return convert(Math.floor(n / 1000)) + "Thousand " + convert(n % 1000);
    if (n < 10000000) return convert(Math.floor(n / 100000)) + "Lakh " + convert(n % 100000);
    return convert(Math.floor(n / 10000000)) + "Crore " + convert(n % 10000000);
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = convert(rupees).trim();
  if (paise > 0) result += ` and ${convert(paise).trim()} Paise`;
  return (result || "Zero") + " Only";
}

export function BillDetailClient({ sale: initialSale, items: initialItems, tenant, initialFormat, autoSharePDF }: BillDetailClientProps) {
  const [printFormat, setPrintFormat] = useState<"a4" | "thermal">(initialFormat || "a4");
  const [lastInitial, setLastInitial] = useState(initialFormat);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pdfReady, setPdfReady] = useState(false);

  // Support both snake_case (online) and camelCase (offline/prisma mapped) formats safely
  const sale = {
    id: initialSale?.id,
    invoice_no: initialSale?.invoice_no ?? initialSale?.invoiceNo ?? "Draft",
    invoice_date: initialSale?.invoice_date ?? initialSale?.invoiceDate ?? initialSale?.created_at ?? initialSale?.createdAt ?? new Date().toISOString(),
    customer_name: initialSale?.customer_name ?? initialSale?.customerName ?? "Walk-in Customer",
    customer_phone: initialSale?.customer_phone ?? initialSale?.customerPhone ?? "",
    doctor_name: initialSale?.doctor_name ?? initialSale?.doctorName ?? "Self / OTC",
    prescription_no: initialSale?.prescription_no ?? initialSale?.prescriptionNo ?? "N/A",
    payment_mode: initialSale?.payment_mode ?? initialSale?.paymentMode ?? "Cash",
    total_paisa: initialSale?.total_paisa ?? initialSale?.totalPaisa ?? initialSale?.netPaisa ?? 0,
    subtotal_paisa: initialSale?.subtotal_paisa ?? initialSale?.subtotalPaisa ?? 0,
    discount_paisa: initialSale?.discount_paisa ?? initialSale?.discountPaisa ?? 0,
    taxable_paisa: initialSale?.taxable_paisa ?? initialSale?.taxablePaisa ?? 0,
    cgst_paisa: initialSale?.cgst_paisa ?? initialSale?.cgstPaisa ?? 0,
    sgst_paisa: initialSale?.sgst_paisa ?? initialSale?.sgstPaisa ?? 0,
    round_off_paisa: initialSale?.round_off_paisa ?? initialSale?.roundOffPaisa ?? 0,
    created_at: initialSale?.created_at ?? initialSale?.createdAt ?? new Date().toISOString(),
    prescriptionImages: initialSale?.prescriptionImages ?? []
  };

  const items = (initialItems || []).map((item) => ({
    id: item.id,
    medicine_name: item.medicine_name ?? item.medicineName,
    hsn_code: item.hsn_code ?? item.hsnCode,
    batch_no: item.batch_no ?? item.batchNo,
    expiry_date: item.expiry_date ?? item.expiryDate,
    quantity: item.quantity,
    mrp_paisa: item.mrp_paisa ?? item.mrpPaisa,
    discount_percent: item.discount_percent ?? item.discountPercent,
    gst_rate: item.gst_rate ?? item.gstRate,
    total_paisa: item.total_paisa ?? item.totalPaisa,
    schedule: item.schedule,
    taxable_paisa: item.taxable_paisa ?? item.taxablePaisa,
    cgst_paisa: item.cgst_paisa ?? item.cgstPaisa,
    sgst_paisa: item.sgst_paisa ?? item.sgstPaisa,
    gst_paisa: item.gst_paisa ?? item.gstPaisa
  }));

  if (initialFormat !== lastInitial) {
    setPrintFormat(initialFormat || "a4");
    setLastInitial(initialFormat);
  }

  useEffect(() => {
    if (autoSharePDF) {
      const timer = setTimeout(() => {
        handleShareAndWhatsApp();
      }, 1100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSharePDF]);

  const invoiceUrl = typeof window !== "undefined" ? `${window.location.origin}/shop/billing/${sale.id}` : "";
  const totalRupees = Number(sale.total_paisa) / 100;
  const amountInWords = numberToWords(totalRupees);
  const customerPhone = sale.customer_phone ? String(sale.customer_phone).replace(/\D/g, "").slice(-10) : "";

  // ── Core PDF Generation function ──
  const generatePdfBlob = async (): Promise<Blob | null> => {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const element = document.querySelector(
      printFormat === "a4" ? ".a4-print-container" : ".thermal-print-container"
    );
    if (!element) {
      toast.error("Invoice layout not found. Please try again.");
      return null;
    }

    const isA4 = printFormat === "a4";
    if (isA4) element.classList.add("force-desktop-A4");

    const canvas = await html2canvas(element as HTMLElement, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: isA4 ? 1120 : undefined,
    });

    if (isA4) element.classList.remove("force-desktop-A4");

    const imgData = canvas.toDataURL("image/jpeg", 0.97);
    let pdf: any;

    if (printFormat === "a4") {
      pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    } else {
      const rollWidth = 80;
      const rollHeight = (canvas.height * rollWidth) / canvas.width;
      pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [rollWidth, rollHeight] });
      pdf.addImage(imgData, "JPEG", 0, 0, rollWidth, rollHeight);
    }

    return pdf.output("blob");
  };

  // ── Download PDF directly ──
  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const blob = await generatePdfBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_${sale.invoice_no}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setPdfReady(true);
      toast.success("✅ PDF downloaded! You can now attach it to WhatsApp.");
    } catch (err) {
      console.error("PDF download failed:", err);
      toast.error("Failed to generate PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ── Share PDF: generate → try native share → fallback: download + open WhatsApp ──
  const handleShareAndWhatsApp = async () => {
    try {
      setSharingPdf(true);
      const blob = await generatePdfBlob();
      if (!blob) return;

      const pdfFile = new File([blob], `Invoice_${sale.invoice_no}.pdf`, { type: "application/pdf" });
      const whatsappMsg = encodeURIComponent(
        `📋 *Invoice ${String(sale.invoice_no)}* from *${tenant.name}*\n` +
        `💰 Total: *${formatCurrency(Number(sale.total_paisa))}*\n` +
        `🔗 View Online: ${invoiceUrl}\n\n` +
        `_A PDF copy of this invoice has been shared with you._`
      );
      const whatsappUrl = customerPhone
        ? `https://wa.me/91${customerPhone}?text=${whatsappMsg}`
        : `https://wa.me/?text=${whatsappMsg}`;

      // Try native File Share (works on mobile Chrome/Safari/Android)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Invoice ${sale.invoice_no} — ${tenant.name}`,
          text: `Please find attached your invoice PDF from ${tenant.name}.`,
        });
        toast.success("✅ PDF shared successfully via share sheet!");
      } else {
        // Fallback for desktop: download PDF + open WhatsApp simultaneously
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `Invoice_${sale.invoice_no}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 3000);

        // Open WhatsApp in new tab after short delay
        setTimeout(() => {
          window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        }, 500);

        setPdfReady(true);
        toast.success("✅ PDF downloaded! WhatsApp is opening — attach the PDF file from your Downloads folder.", {
          duration: 7000,
        });
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Share failed:", err);
        toast.error("Failed to generate PDF. Try Print instead.");
      }
    } finally {
      setSharingPdf(false);
    }
  };

  const upiId = tenant.upiId || "";
  const upiUrl = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(tenant.name)}&am=${totalRupees.toFixed(2)}&cu=INR&tn=Invoice_${sale.invoice_no}`
    : "";

  // Calculate GST Tax Slab Breakdown
  const gstBreakdownMap = new Map<number, { taxable: number; cgst: number; sgst: number; totalTax: number }>();
  items.forEach((item) => {
    const rate = Number(item.gst_rate) || 0;
    const current = gstBreakdownMap.get(rate) ?? { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 };
    current.taxable += Number(item.taxable_paisa) || 0;
    current.cgst += Number(item.cgst_paisa) || 0;
    current.sgst += Number(item.sgst_paisa) || 0;
    current.totalTax += Number(item.gst_paisa) || 0;
    gstBreakdownMap.set(rate, current);
  });
  const gstBreakdownList = Array.from(gstBreakdownMap.entries()).sort((a, b) => a[0] - b[0]);

  const printStyles = `
    html, body, .a4-print-container, .thermal-print-container, .force-desktop-A4 {
      color-scheme: light !important;
      background-color: #ffffff !important;
      -webkit-print-color-adjust: economy !important;
      print-color-adjust: economy !important;
    }
    .a4-print-container, .thermal-print-container, .force-desktop-A4 {
      color: #090d16 !important;
      opacity: 1 !important;
      filter: none !important;
      animation: none !important;
    }
    .a4-print-container *, .thermal-print-container *, .force-desktop-A4 * {
      opacity: 1 !important;
      filter: none !important;
      animation: none !important;
    }
    .a4-print-container .no-print, .thermal-print-container .no-print, .force-desktop-A4 .no-print {
      display: none !important;
    }
    ${
      printFormat === "thermal"
        ? `@media print {
            @page { size: 80mm auto; margin: 0; }
            html, body { width: 80mm !important; margin: 0 !important; padding: 0 !important; }
            .no-print, aside, header, nav, footer, button { display: none !important; }
            .thermal-print-container { display: block !important; width: 80mm !important; max-width: 80mm !important; margin: 0 auto !important; padding: 2mm !important; border: none !important; background: #ffffff !important; }
            .a4-print-container { display: none !important; }
          }`
        : `@media print {
            @page { size: A4 portrait; margin: 10mm; }
            html, body { width: 1120px !important; min-width: 1120px !important; margin: 0 !important; padding: 0 !important; }
            .flex.h-screen, .flex-1.flex-col, main { height: auto !important; overflow: visible !important; display: block !important; padding: 0 !important; margin: 0 !important; }
            .fixed.inset-0, .relative.w-full { position: absolute !important; left: 0 !important; top: 0 !important; width: 1120px !important; max-width: 1120px !important; height: auto !important; max-height: none !important; overflow: visible !important; border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
            .no-print, aside, header, nav, footer, button { display: none !important; }
            .a4-print-container { display: block !important; width: 1120px !important; min-width: 1120px !important; max-width: 1120px !important; margin: 0 auto !important; padding: 0 !important; border: none !important; box-shadow: none !important; background: #ffffff !important; }
            .thermal-print-container { display: none !important; }
            tr { page-break-inside: avoid !important; break-inside: avoid !important; }

            /* ECO INK-SAVER OVERRIDES */
            .a4-header-banner {
              background: #ffffff !important;
              background-image: none !important;
              color: #090d16 !important;
              border: 1px dashed #64748b !important;
              border-radius: 12px !important;
              padding: 16px !important;
            }
            .a4-header-banner * {
              color: #090d16 !important;
            }
            .a4-header-banner h2 {
              color: #047857 !important; /* Premium brand accent, light on ink */
            }
            .a4-header-banner .bg-white\\/20,
            .a4-header-banner .bg-white\\/15,
            .a4-header-banner .border-white\\/30,
            .a4-header-banner .border-white\\/25 {
              background: #f8fafc !important;
              border: 1px solid #cbd5e1 !important;
              color: #090d16 !important;
            }
            
            /* Remove solid background columns for tables and cards */
            table thead tr.bg-slate-800 {
              background: #f1f5f9 !important;
              color: #090d16 !important;
              border-bottom: 2px solid #334155 !important;
            }
            table thead tr.bg-slate-800 th {
              color: #090d16 !important;
              font-weight: 800 !important;
              border-bottom: 2px solid #334155 !important;
            }
            
            /* Box styling resets */
            .bg-slate-50\\/60 {
              background: #ffffff !important;
              border: 1px solid #e2e8f0 !important;
            }
            
            /* Slab & Summary Headers */
            .bg-slate-800 {
              background: #f1f5f9 !important;
              color: #090d16 !important;
              border-bottom: 1.5px solid #cbd5e1 !important;
            }
            .bg-slate-800 p {
              color: #090d16 !important;
              font-weight: 800 !important;
            }
            
            /* Red schedule tags */
            .bg-red-50 {
              background: #ffffff !important;
              border: 1px solid #ef4444 !important;
            }
          }`
    }
    .force-desktop-A4 {
      width: 1120px !important;
      min-width: 1120px !important;
      max-width: 1120px !important;
      padding: 0 !important;
      border: 1px solid #e2e8f0 !important;
      box-shadow: none !important;
      background: #ffffff !important;
    }
    .force-desktop-A4 .overflow-x-auto { overflow: visible !important; }
    .force-desktop-A4 table { width: 100% !important; table-layout: auto !important; }
  `;

  return (
    <div className="space-y-6 print:space-y-0 print:p-0">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      {/* ── Top Action Toolbar ── */}
      <div className="no-print">
        <PageHeader
          title={`Invoice ${String(sale.invoice_no)}`}
          description="Printable tax invoice with A4 and Thermal format options."
          action={
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/shop/billing/history"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ArrowLeft className="h-4 w-4 text-slate-500" /> Back
              </Link>

              {/* Format Toggle */}
              <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                <button
                  onClick={() => setPrintFormat("a4")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold transition-all ${
                    printFormat === "a4" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" /> A4 Invoice
                </button>
                <button
                  onClick={() => setPrintFormat("thermal")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold transition-all ${
                    printFormat === "thermal" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Printer className="h-3.5 w-3.5" /> Thermal
                </button>
              </div>

              {/* Print */}
              <button
                onClick={() => window.print()}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Printer className="h-4 w-4 text-slate-500" /> Print
              </button>

              {/* Download PDF */}
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-all shadow-sm disabled:opacity-70"
              >
                {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {downloadingPdf ? "Generating..." : "Download PDF"}
              </button>

              {/* Share PDF + WhatsApp */}
              <button
                onClick={handleShareAndWhatsApp}
                disabled={sharingPdf}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition-all shadow-sm disabled:opacity-75 active:scale-[0.97]"
              >
                {sharingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : pdfReady ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                {sharingPdf ? "Generating PDF..." : "Share on WhatsApp"}
              </button>
            </div>
          }
        />

        {/* Info Banner */}
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs flex items-start gap-3">
          <span className="text-base mt-0.5">💡</span>
          <div className="space-y-1 text-slate-700">
            <p className="font-bold text-slate-900">How to share this invoice as a PDF on WhatsApp:</p>
            <p>• Click <strong>"Share on WhatsApp"</strong> — PDF will auto-download AND WhatsApp will open.</p>
            <p>• In WhatsApp, click the attachment (📎) icon → select the downloaded PDF from your Downloads folder.</p>
            <p>• Or use <strong>"Download PDF"</strong> to save first, then manually attach on WhatsApp.</p>
            <div className="mt-2 rounded-lg border border-emerald-100 bg-white px-3 py-1.5 font-mono text-[10px] text-emerald-800 flex items-center justify-between gap-2">
              <span className="truncate">{invoiceUrl}</span>
              <span className="shrink-0 text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-sans font-bold">Direct Link</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== A4 TAX INVOICE ==================== */}
      {printFormat === "a4" ? (
        <>
          <section className="a4-print-container mx-auto max-w-4xl bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-md print:border-0 print:shadow-none print:rounded-none font-sans animate-fade-in">

            {/* ── Header Green Stripe Banner ── */}
            <div className="a4-header-banner bg-gradient-to-r from-emerald-700 to-emerald-600 text-white px-7 py-5 print:bg-emerald-700 print:text-white" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Left: Pharmacy Info */}
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-white/20 border border-white/30 text-white text-[9px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-md mb-2">
                    <BadgeCheck className="h-3 w-3" />
                    GST TAX INVOICE
                  </div>
                  <h2 className="font-display text-2xl font-black text-white tracking-tight">{tenant.name}</h2>
                  <div className="mt-1.5 space-y-0.5">
                    {tenant.address && (
                      <p className="text-emerald-100 text-[11px] font-medium flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0 text-emerald-200" />
                        {tenant.address}{tenant.city ? `, ${tenant.city}` : ""}{tenant.state ? `, ${tenant.state}` : ""}
                      </p>
                    )}
                    {!tenant.address && (tenant.city || tenant.state) && (
                      <p className="text-emerald-100 text-[11px] font-medium flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0 text-emerald-200" />
                        {[tenant.city, tenant.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {tenant.phone && (
                      <p className="text-emerald-100 text-[11px] font-medium flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0 text-emerald-200" />
                        {tenant.phone}
                      </p>
                    )}
                    <p className="text-emerald-200 text-[10px] font-mono mt-0.5">
                      GSTIN: {tenant.gstin || "N/A"} | DL No: {tenant.drugLicenseNo || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Right: Invoice Meta */}
                <div className="bg-white/15 border border-white/25 rounded-xl px-5 py-3.5 text-right min-w-[200px] backdrop-blur-sm">
                  <p className="text-emerald-200 text-[9px] font-bold uppercase tracking-widest mb-1">Invoice Number</p>
                  <p className="font-mono font-black text-2xl text-white tracking-wide">{String(sale.invoice_no)}</p>
                  <p className="text-emerald-100 text-xs font-semibold mt-1">{formatDate(String(sale.invoice_date || sale.created_at || ""))}</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-white/20 border border-white/30 px-3 py-1 rounded-full">
                    <span className="text-[9px] text-emerald-100 font-bold uppercase tracking-wider">Payment:</span>
                    <span className="text-[10px] text-white font-extrabold uppercase">{String(sale.payment_mode || "Cash")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bill Body ── */}
            <div className="px-7 pt-6 pb-7">

              {/* ── Customer & Doctor Block ── */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" /> Billed To (Customer)
                  </p>
                  <p className="font-extrabold text-slate-900 text-base leading-tight">{String(sale.customer_name ?? "Walk-in Customer")}</p>
                  {!!sale.customer_phone && (
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {String(sale.customer_phone)}
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Prescription Details</p>
                  <p className="text-xs text-slate-600">
                    Doctor: <span className="font-extrabold text-slate-900">{String(sale.doctor_name ?? "Self / OTC")}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Rx No: <span className="font-mono font-semibold text-slate-800">{String(sale.prescription_no ?? "N/A")}</span>
                  </p>
                  {sale.prescriptionImages && sale.prescriptionImages.length > 0 && (
                    <div className="mt-2 flex gap-1.5 no-print">
                      {sale.prescriptionImages.slice(0, 3).map((img: any) => (
                        <div
                          key={img.id}
                          onClick={() => setPreviewImage(img.imageUrl)}
                          className="relative group rounded-lg overflow-hidden border border-slate-200 h-12 w-12 cursor-pointer"
                        >
                          <img src={img.imageUrl} alt="Rx" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="h-3.5 w-3.5 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Items Table ── */}
              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[760px] text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white text-left">
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider w-10">#</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider">Medicine Name</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider">HSN</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider">Batch</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider">Expiry</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider w-16">Qty</th>
                      <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider">MRP</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider">Disc%</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider">GST</th>
                      <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const requiresPresc = item.schedule === "H" || item.schedule === "H1" || item.schedule === "X";
                      const isEven = idx % 2 === 0;
                      return (
                        <tr
                          key={String(item.id)}
                          className={`border-b border-slate-100 transition-colors ${isEven ? "bg-white" : "bg-slate-50/50"}`}
                        >
                          <td className="px-3 py-3 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900">{String(item.medicine_name)}</span>
                              {requiresPresc && (
                                <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[8px] font-black text-red-600 uppercase shrink-0">
                                  Sch {String(item.schedule)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-[11px] text-slate-500">{String(item.hsn_code ?? "-")}</td>
                          <td className="px-3 py-3 text-center font-mono text-[11px] text-slate-700 font-semibold">{String(item.batch_no)}</td>
                          <td className="px-3 py-3 text-center font-mono text-[11px] text-slate-700 font-semibold">{String(item.expiry_date)}</td>
                          <td className="px-3 py-3 text-center font-black text-slate-900">{Number(item.quantity)}</td>
                          <td className="px-3 py-3 text-right font-mono text-slate-600 text-xs">{formatCurrency(Number(item.mrp_paisa))}</td>
                          <td className="px-3 py-3 text-center text-slate-600 text-xs">{Number(item.discount_percent) > 0 ? `${item.discount_percent}%` : "—"}</td>
                          <td className="px-3 py-3 text-center font-mono text-[11px] text-slate-600">{Number(item.gst_rate)}%</td>
                          <td className="px-3 py-3 text-right font-black font-mono text-slate-900">{formatCurrency(Number(item.total_paisa))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── GST Summary + Grand Total ── */}
              <div className="mt-6 grid gap-5 md:grid-cols-2 items-start">

                {/* GST Slab Table */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-800 text-white px-4 py-2.5">
                    <p className="text-[9px] font-black uppercase tracking-widest">GST Slab Breakup</p>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="px-3 py-2 text-center">Rate</th>
                        <th className="px-3 py-2 text-right">Taxable</th>
                        <th className="px-3 py-2 text-right">CGST</th>
                        <th className="px-3 py-2 text-right">SGST</th>
                        <th className="px-3 py-2 text-right">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstBreakdownList.map(([rate, value]) => (
                        <tr key={rate} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-3 py-2 text-center font-bold text-slate-700">{rate}%</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">{formatCurrency(value.taxable)}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">{formatCurrency(value.cgst)}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">{formatCurrency(value.sgst)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{formatCurrency(value.totalTax)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Summary */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-800 text-white px-4 py-2.5">
                    <p className="text-[9px] font-black uppercase tracking-widest">Bill Summary</p>
                  </div>
                  <div className="p-4 space-y-2">
                    <InvoiceLine label="Subtotal" value={Number(sale.subtotal_paisa)} />
                    <InvoiceLine label="Discount" value={-Number(sale.discount_paisa)} />
                    <InvoiceLine label="Taxable Amount" value={Number(sale.taxable_paisa)} />
                    <InvoiceLine label="CGST Total" value={Number(sale.cgst_paisa)} />
                    <InvoiceLine label="SGST Total" value={Number(sale.sgst_paisa)} />
                    <InvoiceLine label="Round Off" value={Number(sale.round_off_paisa)} />
                    <div className="flex justify-between border-t-2 border-slate-200 pt-3 mt-3">
                      <span className="text-base font-black text-slate-900">Grand Total</span>
                      <span className="font-mono text-xl font-black text-emerald-700">{formatCurrency(Number(sale.total_paisa))}</span>
                    </div>
                  </div>
                  {/* Amount in Words */}
                  <div className="border-t border-dashed border-slate-200 px-4 py-2.5 bg-emerald-50/60">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Amount in Words</p>
                    <p className="text-[10px] font-semibold text-slate-800 mt-0.5 leading-snug italic">
                      ₹ {amountInWords}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Footer: T&C + Signature + UPI QR ── */}
              <div className="mt-8 grid gap-6 sm:grid-cols-2 items-end pt-6 border-t-2 border-slate-100 text-xs">
                <div className="flex gap-4 items-start">
                  {/* UPI QR */}
                  {upiId && (
                    <div className="flex flex-col items-center text-center p-2 bg-white rounded-xl border border-slate-200 shrink-0 shadow-sm">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`}
                        alt="UPI QR"
                        className="h-20 w-20 bg-white"
                        crossOrigin="anonymous"
                      />
                      <span className="text-[8px] font-bold text-slate-500 mt-1 font-mono tracking-tight">SCAN TO PAY</span>
                      <span className="text-[7px] text-slate-400 font-mono">{upiId}</span>
                    </div>
                  )}
                  <div className="space-y-1.5 text-slate-500">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Terms & Conditions</span>
                    </div>
                    <p>1. Medicines once sold cannot be returned or exchanged.</p>
                    <p>2. Check expiry date and dosage before consumption.</p>
                    <p>3. Schedule H/H1/X items require a valid doctor's prescription.</p>
                    <p>4. All disputes subject to local state jurisdiction.</p>
                  </div>
                </div>

                {/* Authorized Signatory */}
                <div className="text-right space-y-6">
                  <div>
                    <p className="text-slate-500 text-xs">For <span className="font-bold text-slate-800">{tenant.name}</span></p>
                  </div>
                  <div className="inline-block border-t-2 border-slate-300 pt-2 w-48 text-center">
                    <p className="font-bold text-slate-700 text-xs">Authorized Signatory</p>
                  </div>
                </div>
              </div>

              {/* Footer Branding */}
              <div className="mt-6 flex flex-col items-center justify-center gap-1.5 text-xs text-emerald-600 font-bold tracking-wide uppercase">
                <Heart className="h-4 w-4 fill-emerald-600 animate-bounce shrink-0" />
                <span>Thank You — Get Well Soon!</span>
                <p className="text-[9px] text-slate-400 font-normal normal-case tracking-normal mt-0.5">
                  Powered by Medicare POS
                </p>
              </div>
            </div>
          </section>

          <p className="no-print mt-4 text-center text-xs text-slate-400">
            Press <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-600 shadow-sm">Ctrl + P</kbd> to print this invoice.
          </p>
        </>
      ) : (

        /* ==================== THERMAL RECEIPT ==================== */
        <section className="thermal-print-container mx-auto w-[80mm] max-w-[80mm] p-3.5 bg-white text-xs border border-dashed border-slate-300 font-mono tracking-tight text-slate-800 rounded-xl shadow-sm print:border-0 print:p-0 print:shadow-none print:w-[80mm] print:mx-0 animate-fade-in">

          {/* Store Header */}
          <div className="text-center space-y-0.5 mb-3 pb-3 border-b-2 border-slate-800">
            <h2 className="font-black text-sm text-slate-900 uppercase tracking-wide">{tenant.name}</h2>
            {(tenant.address || tenant.city) && (
              <p className="text-[9px] text-slate-600 leading-tight">
                {[tenant.address, tenant.city, tenant.state].filter(Boolean).join(", ")}
              </p>
            )}
            {tenant.phone && <p className="text-[9px] text-slate-600">Ph: {tenant.phone}</p>}
            <p className="text-[8px] text-slate-500 font-mono">GSTIN: {tenant.gstin} | DL: {tenant.drugLicenseNo}</p>
          </div>

          {/* Bill Meta */}
          <div className="space-y-0.5 text-[10px] mb-3">
            <div className="flex justify-between font-bold">
              <span>Bill No: <span className="text-slate-900">{String(sale.invoice_no)}</span></span>
              <span>{formatDate(String(sale.invoice_date || sale.created_at || ""))}</span>
            </div>
            <div className="flex justify-between">
              <span>Mode: {String(sale.payment_mode || "Cash").toUpperCase()}</span>
              <span>Doc: {String(sale.doctor_name ?? "Self").substring(0, 14)}</span>
            </div>
            <div>Cust: <span className="font-bold">{String(sale.customer_name ?? "Walk-in Customer")}</span></div>
            {!!sale.customer_phone && <div className="text-slate-500">Ph: {String(sale.customer_phone)}</div>}
          </div>

          <div className="border-t border-dashed border-slate-400 my-2" />

          {/* Items */}
          <div className="space-y-2.5">
            {items.map((item, idx) => {
              const rx = item.schedule === "H" || item.schedule === "H1" || item.schedule === "X";
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between text-slate-900 font-bold text-[11px]">
                    <span className="flex-1 pr-2 leading-tight">
                      {idx + 1}. {String(item.medicine_name)}
                      {rx && <span className="text-[7px] bg-red-100 text-red-700 border border-red-200 px-1 rounded ml-1 font-sans">Rx</span>}
                    </span>
                    <span className="shrink-0">{formatCurrency(Number(item.total_paisa))}</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 pl-3">
                    <span>Batch: {String(item.batch_no)} | Exp: {String(item.expiry_date)}</span>
                    <span>
                      {item.quantity} × {formatCurrency(Number(item.mrp_paisa))}
                      {Number(item.discount_percent) > 0 && ` -${item.discount_percent}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-dashed border-slate-400 my-2" />

          {/* Totals */}
          <div className="space-y-1 text-[10px]">
            <ThermalLine label="Subtotal" value={Number(sale.subtotal_paisa)} />
            <ThermalLine label="Discount" value={-Number(sale.discount_paisa)} />
            <ThermalLine label="Taxable Amt" value={Number(sale.taxable_paisa)} />
            <ThermalLine label="CGST" value={Number(sale.cgst_paisa)} />
            <ThermalLine label="SGST" value={Number(sale.sgst_paisa)} />
            <ThermalLine label="Round Off" value={Number(sale.round_off_paisa)} />
            <div className="flex justify-between border-t-2 border-slate-800 pt-1.5 text-xs font-black text-slate-900 mt-1">
              <span>NET PAYABLE</span>
              <span className="text-sm">{formatCurrency(Number(sale.total_paisa))}</span>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="mt-1.5 text-[8px] text-slate-500 italic leading-tight">
            Amt: {amountInWords}
          </div>

          <div className="border-t border-dashed border-slate-400 my-2" />

          {/* GST Summary mini */}
          <div className="space-y-0.5 text-[8px] text-slate-500 mb-2">
            <div className="grid grid-cols-[1fr_2fr_2fr_2fr] font-bold border-b border-dashed border-slate-200 pb-0.5">
              <span>GST%</span>
              <span className="text-right">Taxable</span>
              <span className="text-right">CGST</span>
              <span className="text-right">SGST</span>
            </div>
            {gstBreakdownList.map(([rate, value]) => (
              <div key={rate} className="grid grid-cols-[1fr_2fr_2fr_2fr]">
                <span>{rate}%</span>
                <span className="text-right">{formatCurrency(value.taxable)}</span>
                <span className="text-right">{formatCurrency(value.cgst)}</span>
                <span className="text-right">{formatCurrency(value.sgst)}</span>
              </div>
            ))}
          </div>

          {/* UPI QR */}
          {upiId && (
            <div className="flex flex-col items-center my-3 gap-1">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`}
                alt="UPI QR"
                className="h-20 w-20 bg-white p-1 border border-slate-200"
                crossOrigin="anonymous"
              />
              <span className="text-[8px] font-bold text-slate-600 tracking-tighter">SCAN TO PAY — {upiId}</span>
            </div>
          )}

          {/* Footer */}
          <div className="text-[8px] text-slate-400 text-center space-y-0.5 border-t border-dashed border-slate-300 pt-2">
            <p>Medicines once sold cannot be returned.</p>
            <p>Subject to local state jurisdiction.</p>
            <div className="pt-1.5 flex flex-col items-center gap-0.5 font-black text-emerald-700 uppercase text-[9px] tracking-wider">
              <Heart className="h-4 w-4 fill-emerald-600 shrink-0" />
              <span>THANK YOU — GET WELL SOON!</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Image Preview Modal ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in no-print"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 z-10 rounded-full bg-white p-2 shadow-lg hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5 text-slate-700" />
            </button>
            <img src={previewImage} alt="Prescription" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceLine({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold font-mono text-slate-900">{formatCurrency(value)}</span>
    </div>
  );
}

function ThermalLine({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span className="font-semibold text-slate-900">{formatCurrency(value)}</span>
    </div>
  );
}
