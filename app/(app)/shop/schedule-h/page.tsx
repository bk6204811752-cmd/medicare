import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getScheduleHRegister } from "@/lib/local-db";
import { formatDate } from "@/lib/utils";

export default async function ScheduleHPage() {
  const user = await getCurrentUser();
  const controlled = await getScheduleHRegister(user?.tenantId ?? "");

  return (
    <>
      <PageHeader title="Schedule H Register" description="Prescription-only medicine register for controlled stock movement and audit readiness." />
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {["Medicine", "Schedule", "Batch", "Expiry", "Prescription fields", "Register status"].map((head) => <th key={head} className="px-4 py-3 font-medium">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {controlled.map((row) => (
              <tr key={String(row.id)} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-med-navy">{String(row.medicine_name)}</td>
                <td className="px-4 py-3">{String(row.schedule ?? "H")}</td>
                <td className="px-4 py-3 font-mono text-xs">{String(row.batchNo ?? "-")}</td>
                <td className="px-4 py-3">{formatDate(String(row.expiryDate ?? row.sale_date))}</td>
                <td className="px-4 py-3">
                  Rx {String(row.prescription_no ?? "-")} | {String(row.doctor_name ?? "Doctor missing")} | {String(row.customer_name ?? "Walk-in")}
                </td>
                <td className="px-4 py-3"><span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">Enforced in POS</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
