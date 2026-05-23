"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, Printer, ArrowLeft, ShieldCheck, Heart, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";

type BillDetailClientProps = {
  sale: Record<string, any>;
  items: Record<string, any>[];
  tenant: Record<string, any>;
};

export function BillDetailClient({ sale, items, tenant }: BillDetailClientProps) {
  const [printFormat, setPrintFormat] = useState<"a4" | "thermal">("a4");
  const whatsappText = encodeURIComponent(
    `Medicare invoice ${String(sale.invoice_no)} from ${tenant.name}. Total: ${formatCurrency(Number(sale.total_paisa))}. Thank you.`
  );

  // Calculate GST Tax Slab Breakdown dynamically
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

  const printStyles = printFormat === "thermal"
    ? `
      @media print {
        @page {
          size: 80mm auto;
          margin: 0;
        }
        html, body {
          width: 80mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        .flex.h-screen {
          height: auto !important;
          overflow: visible !important;
          display: block !important;
        }
        .flex-1.flex-col {
          height: auto !important;
          overflow: visible !important;
          display: block !important;
        }
        main {
          height: auto !important;
          overflow: visible !important;
          display: block !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .no-print,
        aside,
        header,
        nav,
        footer,
        button {
          display: none !important;
          visibility: hidden !important;
        }
        .thermal-print-container {
          display: block !important;
          width: 80mm !important;
          max-width: 80mm !important;
          margin: 0 auto !important;
          padding: 2mm !important;
          border: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
        }
        .a4-print-container {
          display: none !important;
        }
      }
    `
    : `
      @media print {
        @page {
          size: A4 portrait;
          margin: 0;
        }
        html, body {
          width: 210mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        .flex.h-screen {
          height: auto !important;
          overflow: visible !important;
          display: block !important;
        }
        .flex-1.flex-col {
          height: auto !important;
          overflow: visible !important;
          display: block !important;
        }
        main {
          height: auto !important;
          overflow: visible !important;
          display: block !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .no-print,
        aside,
        header,
        nav,
        footer,
        button {
          display: none !important;
          visibility: hidden !important;
        }
        .a4-print-container {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 8mm !important;
          border: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .thermal-print-container {
          display: none !important;
        }
        
        /* Make table headers and cells compact on print to fit 1 page and prevent horizontal cutoff */
        .a4-print-container .overflow-x-auto {
          overflow: visible !important;
        }
        .a4-print-container table {
          min-width: 0 !important;
          width: 100% !important;
          table-layout: auto !important;
        }
        .a4-print-container table th {
          padding-top: 4px !important;
          padding-bottom: 4px !important;
          padding-left: 2px !important;
          padding-right: 2px !important;
          font-size: 10px !important;
        }
        .a4-print-container table td {
          padding-top: 4px !important;
          padding-bottom: 4px !important;
          padding-left: 2px !important;
          padding-right: 2px !important;
          font-size: 10px !important;
        }
        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        /* Reduce margins between layout elements */
        .a4-print-container .mt-6 {
          margin-top: 8px !important;
        }
        .a4-print-container .mt-8 {
          margin-top: 10px !important;
        }
        .a4-print-container .mt-10 {
          margin-top: 10px !important;
        }
        .a4-print-container .p-4 {
          padding: 6px !important;
        }
        .a4-print-container .p-6 {
          padding: 8px !important;
        }
        /* Force banner contents to align in a single row without wrapping/stacking in print */
        .a4-print-container .bg-slate-900 {
          margin-left: -8mm !important;
          margin-right: -8mm !important;
          margin-top: -8mm !important;
          padding: 10px !important;
          border-radius: 0 !important;
          display: flex !important;
          flex-direction: row !important;
          justify-content: space-between !important;
          align-items: center !important;
        }
        /* Force Grid layout cells (Customer block, Totals summary, Footer columns) to stay side-by-side */
        .a4-print-container .grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 12px !important;
        }
        /* Reduce signature blank height */
        .a4-print-container .h-10 {
          height: 12px !important;
        }
      }
    `;

  return (
    <div className="space-y-6 print:space-y-0 print:p-0">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      
      {/* Top Action Toolbar (Hidden when printing) */}
      <div className="no-print">
        <PageHeader
          title={`Invoice ${String(sale.invoice_no)}`}
          description="Printable invoice view with A4 format and Thermal slip options."
          action={
            <div className="flex flex-wrap items-center gap-3">
              {/* Back to History */}
              <Link
                href="/shop/billing/history"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ArrowLeft className="h-4 w-4 text-slate-500" /> Back
              </Link>

              {/* Format Toggle Selector */}
              <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                <button
                  onClick={() => setPrintFormat("a4")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold transition-all ${
                    printFormat === "a4"
                      ? "bg-white text-med-navy shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" /> A4 Invoice
                </button>
                <button
                  onClick={() => setPrintFormat("thermal")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold transition-all ${
                    printFormat === "thermal"
                      ? "bg-white text-med-navy shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Printer className="h-3.5 w-3.5" /> Thermal Receipt
                </button>
              </div>

              {/* Print Button */}
              <button
                onClick={() => window.print()}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Printer className="h-4 w-4" /> Print
              </button>

              {/* WhatsApp Share */}
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-med-green px-4 py-2 text-sm font-semibold text-white hover:bg-med-greenDark transition-all shadow-sm"
              >
                <Send className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          }
        />
      </div>

      {/* Render active template */}
      {printFormat === "a4" ? (
        /* ==================== A4 TAX INVOICE FORMAT ==================== */
        <section className="a4-print-container mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:p-0 print:shadow-none font-sans animate-fade-in">
          {/* Header Banner */}
          <div className="bg-slate-900 text-white p-6 rounded-t-xl -mx-6 -mt-6 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 print:bg-slate-900 print:text-white print:rounded-t-none">
            <div>
              <span className="inline-block bg-med-green text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-md">
                TAX INVOICE
              </span>
              <h2 className="font-display text-2xl font-bold mt-2 tracking-tight">{tenant.name}</h2>
              <p className="text-xs text-slate-300 mt-1">{tenant.city}, {tenant.state}</p>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                GSTIN: {tenant.gstin} | Drug License: {tenant.drugLicenseNo}
              </p>
            </div>
            <div className="text-left md:text-right border-l md:border-l-0 md:border-r border-slate-800 pl-4 md:pl-0 md:pr-4">
              <p className="text-xs text-slate-400 font-medium">Invoice Number</p>
              <p className="font-mono font-bold text-lg text-med-green">{String(sale.invoice_no)}</p>
              <p className="text-xs text-slate-300 mt-1">{formatDate(String(sale.invoice_date))}</p>
              <span className="inline-block bg-slate-800 text-[10px] font-semibold tracking-wider text-slate-300 px-2.5 py-0.5 rounded mt-2 uppercase">
                Mode: {String(sale.payment_mode)}
              </span>
            </div>
          </div>

          {/* Customer & Doctor Block */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Billed To (Customer)</p>
              <p className="font-bold text-med-navy text-base">{String(sale.customer_name ?? "Walk-in Customer")}</p>
              {!!sale.customer_phone && (
                <p className="text-xs text-slate-500 mt-1">
                  Phone: <span className="font-semibold text-slate-700">{String(sale.customer_phone)}</span>
                </p>
              )}
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Prescription & Doctor</p>
              <div className="space-y-1">
                <p className="text-xs text-slate-600">
                  Doctor: <span className="font-bold text-slate-900">{String(sale.doctor_name ?? "Self-prescribed")}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Prescription No: <span className="font-mono font-semibold text-slate-700">{String(sale.prescription_no ?? "N/A")}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500 font-semibold">
                  <th className="px-3 py-3 text-center w-12">#</th>
                  <th className="px-3 py-3">Medicine Name</th>
                  <th className="px-3 py-3 text-center">HSN</th>
                  <th className="px-3 py-3 text-center">Batch</th>
                  <th className="px-3 py-3 text-center">Expiry</th>
                  <th className="px-3 py-3 text-center w-16">Qty</th>
                  <th className="px-3 py-3 text-right">MRP</th>
                  <th className="px-3 py-3 text-center">Disc %</th>
                  <th className="px-3 py-3 text-center">GST</th>
                  <th className="px-3 py-3 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const requiresPresc = item.schedule === "H" || item.schedule === "H1" || item.schedule === "X";
                  return (
                    <tr key={String(item.id)} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-med-navy">{String(item.medicine_name)}</span>
                          {requiresPresc && (
                            <span className="inline-flex items-center rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600 border border-red-100 uppercase">
                              Sch {String(item.schedule)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-xs text-slate-500">{String(item.hsn_code ?? "-")}</td>
                      <td className="px-3 py-3 text-center font-mono text-xs text-slate-600 font-medium">{String(item.batch_no)}</td>
                      <td className="px-3 py-3 text-center font-mono text-xs text-slate-600 font-medium">{String(item.expiry_date)}</td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-800">{Number(item.quantity)}</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600">{formatCurrency(Number(item.mrp_paisa))}</td>
                      <td className="px-3 py-3 text-center text-slate-500">{Number(item.discount_percent) > 0 ? `${item.discount_percent}%` : "-"}</td>
                      <td className="px-3 py-3 text-center font-mono text-xs text-slate-600">{Number(item.gst_rate)}%</td>
                      <td className="px-3 py-3 text-right font-semibold font-mono text-slate-900">{formatCurrency(Number(item.total_paisa))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* GST Slabs & Total Summary */}
          <div className="mt-8 grid gap-6 md:grid-cols-2 items-start">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
                <p className="text-xs font-bold text-med-navy uppercase tracking-wider">GST Slab Summary</p>
              </div>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 font-semibold">
                    <th className="px-3 py-2 text-center">GST Rate</th>
                    <th className="px-3 py-2 text-right">Taxable Amt</th>
                    <th className="px-3 py-2 text-right">CGST</th>
                    <th className="px-3 py-2 text-right">SGST</th>
                    <th className="px-3 py-2 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {gstBreakdownList.map(([rate, value]) => (
                    <tr key={rate} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/30">
                      <td className="px-3 py-2 text-center font-semibold text-slate-700">{rate}%</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(value.taxable)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(value.cgst)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(value.sgst)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">{formatCurrency(value.totalTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 rounded-xl bg-slate-50/50 border border-slate-100 p-4 md:ml-auto w-full max-w-sm">
              <InvoiceLine label="Subtotal" value={Number(sale.subtotal_paisa)} />
              <InvoiceLine label="Discount" value={-Number(sale.discount_paisa)} />
              <InvoiceLine label="Taxable Amount" value={Number(sale.taxable_paisa)} />
              <InvoiceLine label="CGST Total" value={Number(sale.cgst_paisa)} />
              <InvoiceLine label="SGST Total" value={Number(sale.sgst_paisa)} />
              <InvoiceLine label="Round Off" value={Number(sale.round_off_paisa)} />
              <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-med-navy">
                <span>Grand Total</span>
                <span className="font-mono text-med-green">{formatCurrency(Number(sale.total_paisa))}</span>
              </div>
            </div>
          </div>

          {/* Footer T&C / Signature */}
          <div className="mt-10 grid gap-6 sm:grid-cols-2 items-end pt-6 border-t border-slate-100 text-xs">
            <div className="space-y-1 text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold mb-1">
                <ShieldCheck className="h-4 w-4 text-med-green shrink-0" />
                <span>Terms & Conditions</span>
              </div>
              <p>1. Medicines once sold cannot be returned or exchanged.</p>
              <p>2. Please check expiry date and dosage instructions before consumption.</p>
              <p>3. Schedule H/H1/X medicines require a valid physician's prescription.</p>
              <p>4. All disputes are subject to local state jurisdiction.</p>
            </div>
            <div className="text-right space-y-4">
              <p className="text-slate-400 font-medium">For {tenant.name}</p>
              <div className="h-10"></div>
              <div className="inline-block border-t border-slate-300 pt-1.5 w-44 text-center">
                <p className="font-semibold text-slate-700">Authorized Signatory</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center items-center gap-1.5 text-xs text-med-green/80 font-bold tracking-wide uppercase no-print animate-pulse">
            <Heart className="h-3.5 w-3.5 fill-med-green" />
            <span>Get well soon!</span>
          </div>

          <p className="no-print mt-6 text-center text-xs text-slate-400">
            Use the print button at the top or press <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 shadow-sm">Ctrl + P</kbd> to print this invoice.
          </p>
        </section>
      ) : (
        /* ==================== THERMAL ROLL INVOICE FORMAT ==================== */
        <section className="thermal-print-container mx-auto w-[80mm] max-w-[80mm] p-4 bg-white text-xs border border-dashed border-slate-300 font-mono tracking-tight text-slate-800 rounded-lg shadow-sm print:border-0 print:p-0 print:shadow-none print:w-[80mm] print:mx-0 animate-fade-in">
          {/* Header Store */}
          <div className="text-center space-y-1 mb-3">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wide">{tenant.name}</h2>
            <p className="text-[10px] text-slate-500">{tenant.city}, {tenant.state}</p>
            <p className="text-[9px] text-slate-500">GSTIN: {tenant.gstin}</p>
            <p className="text-[9px] text-slate-500">DL: {tenant.drugLicenseNo}</p>
          </div>

          <div className="border-t border-dashed border-slate-350 my-2" />

          {/* Metadata Block */}
          <div className="space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span>Bill No: <span className="font-bold text-slate-900">{String(sale.invoice_no)}</span></span>
              <span>Date: {formatDate(String(sale.invoice_date))}</span>
            </div>
            <div className="flex justify-between">
              <span>Mode: {String(sale.payment_mode).toUpperCase()}</span>
              <span>Doc: {String(sale.doctor_name ?? "Self").substring(0, 12)}</span>
            </div>
            <div className="text-slate-700">Cust: <span className="font-semibold">{String(sale.customer_name ?? "Walk-in Customer")}</span></div>
            {!!sale.customer_phone && <div className="text-slate-500">Phone: {String(sale.customer_phone)}</div>}
          </div>

          <div className="border-t border-dashed border-slate-350 my-2" />

          {/* Items list */}
          <div className="space-y-2">
            {items.map((item, idx) => {
              const requiresPresc = item.schedule === "H" || item.schedule === "H1" || item.schedule === "X";
              return (
                <div key={idx} className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between text-slate-900 font-bold">
                    <span>
                      {idx + 1}. {String(item.medicine_name)}
                      {requiresPresc && <span className="text-[8px] bg-red-100 text-red-700 border border-red-200 px-1 rounded ml-1 font-sans">Rx</span>}
                    </span>
                    <span>{formatCurrency(Number(item.total_paisa))}</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 pl-3">
                    <span>Batch: {String(item.batch_no)} | Exp: {String(item.expiry_date)}</span>
                    <span>
                      {item.quantity} x {formatCurrency(Number(item.mrp_paisa))}
                      {Number(item.discount_percent) > 0 && ` (-${item.discount_percent}%)`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-dashed border-slate-350 my-2" />

          {/* Totals Summary */}
          <div className="space-y-1 text-[10px]">
            <ThermalLine label="Subtotal" value={Number(sale.subtotal_paisa)} />
            <ThermalLine label="Discount" value={-Number(sale.discount_paisa)} />
            <ThermalLine label="Taxable Amt" value={Number(sale.taxable_paisa)} />
            <ThermalLine label="CGST" value={Number(sale.cgst_paisa)} />
            <ThermalLine label="SGST" value={Number(sale.sgst_paisa)} />
            <ThermalLine label="Round Off" value={Number(sale.round_off_paisa)} />
            <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 text-xs font-bold text-slate-900">
              <span>NET PAYABLE</span>
              <span className="text-sm">{formatCurrency(Number(sale.total_paisa))}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-350 my-2" />

          {/* Tax Slabs summary */}
          <div className="space-y-0.5 text-[8px] text-slate-500">
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

          <div className="border-t border-dashed border-slate-350 my-2" />

          {/* Footer policies */}
          <div className="text-[8px] text-slate-400 text-center space-y-0.5">
            <p>Medicines once sold cannot be returned.</p>
            <p>Subject to local state jurisdiction.</p>
            <div className="pt-2 flex justify-center items-center gap-1 font-bold text-med-green uppercase text-[9px] tracking-wider animate-pulse">
              <Heart className="h-3 w-3 fill-med-green" />
              <span>GET WELL SOON!</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function InvoiceLine({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div className="flex justify-between text-xs text-slate-600">
      <span>{label}</span>
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
