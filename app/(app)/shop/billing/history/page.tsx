import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { getSales } from "@/lib/local-db";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function BillingHistoryPage() {
  const user = await requireUser();
  const sales = await getSales(user.tenantId ?? "");

  return (
    <>
      <PageHeader
        title="Bill History"
        description="Saved invoices from the database with payment and credit status."
        action={
          <a href="/api/export/sales" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 font-semibold text-med-navy hover:bg-slate-50">
            Export CSV
          </a>
        }
      />
      <section className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                {["Invoice", "Date", "Customer", "Payment", "Total", "Due", "Status"].map((head) => (
                  <th key={head} className="px-4 py-3 font-medium">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={String(sale.id)} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-med-navy">
                    <Link href={`/shop/billing/${encodeURIComponent(String(sale.id))}`} className="font-semibold text-med-greenDark hover:underline">
                      {String(sale.invoice_no)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatDate(String(sale.invoice_date))}</td>
                  <td className="px-4 py-3 font-medium text-med-navy">{String(sale.customer_name ?? "Walk-in Customer")}</td>
                  <td className="px-4 py-3 uppercase">{String(sale.payment_mode)}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(Number(sale.total_paisa))}</td>
                  <td className="px-4 py-3">{formatCurrency(Number(sale.amount_due_paisa))}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{String(sale.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!sales.length ? <div className="p-10 text-center text-slate-500">No bills saved yet. Create one from Smart Billing POS.</div> : null}
      </section>
    </>
  );
}
