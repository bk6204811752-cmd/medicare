import Link from "next/link";
import { notFound } from "next/navigation";
import { Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getSaleByIdOrInvoice, getTenant } from "@/lib/local-db";
import { formatCurrency, formatDate } from "@/lib/utils";

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

  return (
    <>
      <PageHeader
        title={`Invoice ${String(sale.invoice_no)}`}
        description="Printable A4 invoice view with GST break-up and WhatsApp sharing."
        action={
          <div className="flex gap-2">
            <Link href="/shop/billing/history" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 font-semibold text-med-navy hover:bg-slate-50">
              History
            </Link>
            <a href={`https://wa.me/?text=${whatsappText}`} target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-med-green px-4 font-semibold text-white hover:bg-med-greenDark">
              <Send className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        }
      />
      <section className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-med-navy">{tenant.name}</h2>
            <p className="text-sm text-slate-500">{tenant.city}, {tenant.state}</p>
            <p className="text-sm text-slate-500">GSTIN {tenant.gstin} | DL {tenant.drugLicenseNo}</p>
          </div>
          <div className="text-sm md:text-right">
            <p className="font-mono font-semibold text-med-navy">{String(sale.invoice_no)}</p>
            <p className="text-slate-500">{formatDate(String(sale.invoice_date))}</p>
            <p className="text-slate-500">Payment: {String(sale.payment_mode).toUpperCase()}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="text-slate-500">Customer</p>
            <p className="font-semibold text-med-navy">{String(sale.customer_name ?? "Walk-in Customer")}</p>
            <p className="text-slate-500">{String(sale.customer_phone ?? "")}</p>
          </div>
          <div className="md:text-right">
            <p className="text-slate-500">Prescription</p>
            <p className="font-semibold text-med-navy">{String(sale.prescription_no ?? "Not required")}</p>
            <p className="text-slate-500">{String(sale.doctor_name ?? "")}</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>{["Medicine", "Batch", "Qty", "Rate", "GST", "Total"].map((head) => <th key={head} className="px-3 py-3 font-medium">{head}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={String(item.id)} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-medium text-med-navy">{String(item.medicine_name)}</td>
                  <td className="px-3 py-3 font-mono text-xs">{String(item.batch_no)}</td>
                  <td className="px-3 py-3">{Number(item.quantity)}</td>
                  <td className="px-3 py-3">{formatCurrency(Number(item.sale_rate_paisa))}</td>
                  <td className="px-3 py-3">{Number(item.gst_rate)}%</td>
                  <td className="px-3 py-3 font-semibold">{formatCurrency(Number(item.total_paisa))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto mt-6 max-w-sm space-y-2 text-sm">
          <InvoiceLine label="Subtotal" value={Number(sale.subtotal_paisa)} />
          <InvoiceLine label="Discount" value={-Number(sale.discount_paisa)} />
          <InvoiceLine label="Taxable" value={Number(sale.taxable_paisa)} />
          <InvoiceLine label="CGST" value={Number(sale.cgst_paisa)} />
          <InvoiceLine label="SGST" value={Number(sale.sgst_paisa)} />
          <InvoiceLine label="Round off" value={Number(sale.round_off_paisa)} />
          <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold text-med-navy">
            <span>Total</span>
            <span>{formatCurrency(Number(sale.total_paisa))}</span>
          </div>
        </div>

        <p className="no-print mt-6 text-right text-sm text-slate-500">Use Ctrl+P to print this invoice.</p>
      </section>
    </>
  );
}

function InvoiceLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-med-navy">{formatCurrency(value)}</span>
    </div>
  );
}
