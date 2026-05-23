import { notFound } from "next/navigation";
import { ShieldCheck, Heart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getSaleByIdOrInvoice, getTenant } from "@/lib/local-db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { InvoiceActions } from "./InvoiceActions";

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const tenantId = user?.tenantId ?? "";
  const [record, tenant] = await Promise.all([
    getSaleByIdOrInvoice(tenantId, decodeURIComponent(id)),
    getTenant(tenantId)
  ]);

  if (!record?.sale) {
    notFound();
  }

  const sale = record.sale as Record<string, unknown>;
  const items = record.items as Record<string, unknown>[];
  const whatsappText = encodeURIComponent(
    `Medicare invoice ${String(sale.invoice_no)} from ${tenant.name}. Total: ${formatCurrency(Number(sale.total_paisa))}. Thank you.`
  );

  // Calculate GST Tax Slab Breakdown dynamically from the items
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

  return (
    <div className="space-y-6 print:space-y-0 print:p-0">
      {/* Page Header (Hidden when printing) */}
      <div className="no-print">
        <PageHeader
          title={`Invoice ${String(sale.invoice_no)}`}
          description="Printable A4 invoice view with GST break-up and WhatsApp sharing."
          action={<InvoiceActions whatsappText={whatsappText} />}
        />
      </div>

      {/* Printable Bill Section */}
      <section className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:p-0 print:shadow-none font-sans">
        
        {/* Invoice Top Branded Header */}
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

        {/* Customer & Doctor Meta Grid */}
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

        {/* Main Items Table */}
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

        {/* GST Slab & Invoice Summary Block */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 items-start">
          {/* GST Slab Tax Summary Table */}
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

          {/* Line Summary */}
          <div className="space-y-2 rounded-xl bg-slate-50/55 border border-slate-150 p-4 md:ml-auto w-full max-w-sm">
            <InvoiceLine label="Subtotal" value={Number(sale.subtotal_paisa)} />
            <InvoiceLine label="Discount" value={-Number(sale.discount_paisa)} />
            <InvoiceLine label="Taxable Amount" value={Number(sale.taxable_paisa)} />
            <InvoiceLine label="CGST Total" value={Number(sale.cgst_paisa)} />
            <InvoiceLine label="SGST Total" value={Number(sale.sgst_paisa)} />
            <InvoiceLine label="Round Off" value={Number(sale.round_off_paisa)} />
            
            <div className="flex justify-between border-t border-slate-250 pt-3 text-lg font-black text-med-navy">
              <span>Grand Total</span>
              <span className="font-mono text-med-green">{formatCurrency(Number(sale.total_paisa))}</span>
            </div>
          </div>
        </div>

        {/* Footer Terms & Sign Block */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 items-end pt-6 border-t border-slate-100 text-xs">
          {/* Pharmacy Policies */}
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

          {/* Stamp/Signature block */}
          <div className="text-right space-y-4 font-sans">
            <p className="text-slate-400 font-medium">For {tenant.name}</p>
            <div className="h-10"></div> {/* Space for stamp / signature */}
            <div className="inline-block border-t border-slate-300 pt-1.5 w-44 text-center">
              <p className="font-semibold text-slate-700">Authorized Signatory</p>
            </div>
          </div>
        </div>

        {/* Get Well Soon Banner */}
        <div className="mt-8 flex justify-center items-center gap-1.5 text-xs text-med-green/80 font-bold tracking-wide uppercase no-print animate-pulse">
          <Heart className="h-3.5 w-3.5 fill-med-green" />
          <span>Get well soon!</span>
        </div>

        <p className="no-print mt-6 text-center text-xs text-slate-400">
          Use the print button at the top or press <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 shadow-sm">Ctrl + P</kbd> to print this invoice.
        </p>
      </section>
    </div>
  );
}

function InvoiceLine({ label, value }: { label: string; value: number }) {
  if (value === 0) return null; // Hide empty tax lines
  return (
    <div className="flex justify-between text-xs text-slate-600">
      <span>{label}</span>
      <span className="font-semibold font-mono text-slate-900">{formatCurrency(value)}</span>
    </div>
  );
}
