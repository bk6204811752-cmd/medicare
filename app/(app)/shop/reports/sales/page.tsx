import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getSales } from "@/lib/local-db";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function SalesReportPage() {
  const user = await getCurrentUser();
  const sales = await getSales(user?.tenantId ?? "");
  const total = sales.reduce((sum: number, sale: any) => sum + Number((sale as Record<string, unknown>).total_paisa), 0);

  return (
    <>
      <PageHeader title="Sales Report" description="Bill-wise sales report with CSV export." action={<a href="/api/export/sales" className="inline-flex min-h-11 items-center rounded-md bg-med-green px-4 font-semibold text-white">Export CSV</a>} />
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="font-display text-2xl font-semibold text-med-navy">{formatCurrency(total)}</p>
        <p className="text-sm text-slate-500">{sales.length} invoices</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <tbody>
              {sales.map((sale: any) => {
                const row = sale as Record<string, unknown>;
                return (
                  <tr key={String(row.id)} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-mono text-xs">{String(row.invoice_no)}</td>
                    <td className="px-3 py-3">{formatDate(String(row.invoice_date))}</td>
                    <td className="px-3 py-3">{String(row.customer_name ?? "Walk-in")}</td>
                    <td className="px-3 py-3 font-semibold">{formatCurrency(Number(row.total_paisa))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
