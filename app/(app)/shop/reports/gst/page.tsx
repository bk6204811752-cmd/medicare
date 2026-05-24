import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getGstReport } from "@/lib/local-db";
import { formatCurrency } from "@/lib/utils";

export default async function GstReportPage() {
  const user = await getCurrentUser();
  const rows = (await getGstReport(user?.tenantId ?? "")) as Record<string, unknown>[];

  return (
    <>
      <PageHeader title="GST Report" description="HSN and GST slab summary from saved bills." action={<a href="/api/export/gst" className="inline-flex min-h-11 items-center rounded-md bg-med-green px-4 font-semibold text-white">Export CSV</a>} />
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500"><tr>{["HSN", "GST", "Taxable", "GST Amount"].map((head) => <th key={head} className="px-4 py-3 font-medium">{head}</th>)}</tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.hsnCode}-${row.gstRate}`} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{String(row.hsnCode ?? "")}</td>
                  <td className="px-4 py-3">{Number(row.gstRate)}%</td>
                  <td className="px-4 py-3">{formatCurrency(Number(row.taxablePaisa ?? 0))}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(Number(row.gstPaisa ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
