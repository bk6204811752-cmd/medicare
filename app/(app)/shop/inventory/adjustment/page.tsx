import { PageHeader } from "@/components/page-header";
import { StockAdjustmentForm } from "@/components/stock-adjustment-form";
import { getCurrentUser } from "@/lib/auth";
import { getInventoryRows, getStockMovements } from "@/lib/local-db";
import { formatDate } from "@/lib/utils";

export default async function AdjustmentPage() {
  const user = await getCurrentUser();
  const tid = user?.tenantId ?? "";
  const [rows, movements] = await Promise.all([getInventoryRows(tid), getStockMovements(tid, 20)]);

  return (
    <>
      <PageHeader title="Stock Adjustment" description="Correct stock safely with a movement ledger for damage, returns, physical count, and opening balances." />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <StockAdjustmentForm rows={rows} />
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-display text-lg font-semibold text-med-navy">Movement ledger</h2>
            <p className="mt-1 text-sm text-slate-500">Latest stock corrections and returns.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>{["Date", "Medicine", "Batch", "Type", "Qty", "Reason"].map((head) => <th key={head} className="px-4 py-3 font-medium">{head}</th>)}</tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{formatDate(movement.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-med-navy">{movement.medicineName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{movement.batchNo}</td>
                    <td className="px-4 py-3 capitalize">{movement.adjustmentType.replace("_", " ")}</td>
                    <td className={`px-4 py-3 font-semibold ${movement.quantityDelta < 0 ? "text-red-700" : "text-emerald-700"}`}>
                      {movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta}
                    </td>
                    <td className="px-4 py-3">{movement.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!movements.length ? <div className="p-10 text-center text-slate-500">No stock movements recorded yet.</div> : null}
        </section>
      </div>
    </>
  );
}
