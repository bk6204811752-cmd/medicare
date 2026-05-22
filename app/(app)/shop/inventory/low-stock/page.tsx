import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getLowStockRows } from "@/lib/local-db";
import { formatCurrency } from "@/lib/utils";

export default async function LowStockPage() {
  const user = await getCurrentUser();
  const rows = await getLowStockRows(user?.tenantId ?? "");

  return (
    <>
      <PageHeader
        title="Low Stock"
        description="Items below reorder level. Use this list to prepare purchase orders."
        action={<Link href="/shop/purchases" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-med-green px-4 font-semibold text-white"><ShoppingCart className="h-4 w-4" /> Purchase</Link>}
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-lg border border-orange-200 bg-white p-4 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-med-navy">{row.medicine.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Batch {row.batchNo} | Rack {row.rackLocation}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <Metric label="Stock" value={String(row.quantity)} />
              <Metric label="Reorder" value={String(row.reorderLevel)} />
              <Metric label="Rate" value={formatCurrency(row.purchaseRatePaisa)} />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-slate-500">{label}</p>
      <p className="font-semibold text-med-navy">{value}</p>
    </div>
  );
}
