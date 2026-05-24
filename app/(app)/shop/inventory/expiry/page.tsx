import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getExpiringRows } from "@/lib/local-db";
import { daysUntil, formatDate } from "@/lib/utils";

export default async function ExpiryPage() {
  const user = await getCurrentUser();
  const rows = await getExpiringRows(user?.tenantId ?? "", 90);

  return (
    <>
      <PageHeader title="Expiry Tracker" description="Batches expiring within 90 days, including expired stock for supplier return planning." />
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>{["Medicine", "Batch", "Expiry", "Days", "Stock", "Action"].map((head) => <th key={head} className="px-4 py-3 font-medium">{head}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const days = daysUntil(row.expiryDate);
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-med-navy">{row.medicine.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.batchNo}</td>
                    <td className="px-4 py-3">{formatDate(row.expiryDate)}</td>
                    <td className="px-4 py-3">{days}</td>
                    <td className="px-4 py-3">{row.quantity}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${days < 0 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                        <AlertTriangle className="h-3 w-3" /> {days < 0 ? "Remove from shelf" : "Plan return"}
                      </span>
                    </td>
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
