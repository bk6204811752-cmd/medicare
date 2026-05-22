import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getInventoryRows } from "@/lib/local-db";
import { formatCurrency } from "@/lib/utils";

export default async function InventoryReportPage() {
  const user = await getCurrentUser();
  const rows = await getInventoryRows(user?.tenantId ?? "");
  const value = rows.reduce((sum, row) => sum + row.purchaseRatePaisa * row.quantity, 0);

  return (
    <>
      <PageHeader title="Inventory Report" description="Current stock valuation and batch count." action={<a href="/api/export/inventory" className="inline-flex min-h-11 items-center rounded-md bg-med-green px-4 font-semibold text-white">Export CSV</a>} />
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="font-display text-2xl font-semibold text-med-navy">{formatCurrency(value)}</p>
        <p className="text-sm text-slate-500">{rows.length} active batches</p>
      </section>
    </>
  );
}
