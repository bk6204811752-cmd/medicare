import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getGstReport } from "@/lib/local-db";
import { formatCurrency } from "@/lib/utils";
import { GstReportFilter } from "@/components/gst-report-filter";
import { AlertCircle, Landmark, Percent } from "lucide-react";

export default async function GstReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const activeMonth = month || new Date().toISOString().slice(0, 7); // Default to current month (e.g., "2026-05")

  const user = await getCurrentUser();
  const rows = (await getGstReport(user?.tenantId ?? "", activeMonth)) as {
    hsnCode: string | null;
    gstRate: number;
    taxablePaisa: number;
    gstPaisa: number;
  }[];

  // Calculate aggregated totals
  const totalTaxablePaisa = rows.reduce((sum, r) => sum + r.taxablePaisa, 0);
  const totalGstPaisa = rows.reduce((sum, r) => sum + r.gstPaisa, 0);
  const totalCgstPaisa = Math.round(totalGstPaisa / 2);
  const totalSgstPaisa = totalGstPaisa - totalCgstPaisa; // Distribute any rounding offsets

  return (
    <>
      <PageHeader
        title="GSTR-1 Tax Summary"
        description="HSN-wise tax records and GST slabs for commercial accounting and CA filing."
      />

      <div className="space-y-6">
        {/* Month Selector & CSV Export */}
        <GstReportFilter currentMonth={activeMonth} />

        {/* GST KPI Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Taxable Value</span>
              <Landmark className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-800">{formatCurrency(totalTaxablePaisa)}</p>
            <p className="mt-1 text-[10px] text-slate-400 font-semibold uppercase">Base amount before tax</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Central GST (CGST)</span>
              <Percent className="h-5 w-5 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-black text-blue-700">{formatCurrency(totalCgstPaisa)}</p>
            <p className="mt-1 text-[10px] text-blue-400 font-semibold uppercase">50% Central tax share</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total State GST (SGST)</span>
              <Percent className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="mt-2 text-2xl font-black text-indigo-700">{formatCurrency(totalSgstPaisa)}</p>
            <p className="mt-1 text-[10px] text-indigo-400 font-semibold uppercase">50% State tax share</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tax Liability</span>
              <Landmark className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-700">{formatCurrency(totalGstPaisa)}</p>
            <p className="mt-1 text-[10px] text-emerald-400 font-semibold uppercase">CGST + SGST combined</p>
          </div>
        </div>

        {/* HSN Slab Grid Table */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-4 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="font-display font-bold text-slate-800 text-base">HSN-wise GST Slab Summary</h3>
              <p className="text-xs text-slate-400 mt-0.5">Aggregated tax details for {activeMonth}</p>
            </div>
            {rows.length > 0 && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                {rows.length} HSN records
              </span>
            )}
          </div>
          
          <div className="overflow-x-auto">
            {rows.length > 0 ? (
              <table className="w-full min-w-[850px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-400 border-b border-slate-200">
                    {["HSN Code", "GST Rate", "CGST Rate", "SGST Rate", "Taxable Value (Base)", "CGST Amount", "SGST Amount", "Total Tax"].map((head) => (
                      <th key={head} className="px-4 py-3.5 font-bold text-left text-xs uppercase tracking-wider">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => {
                    const cgstRate = row.gstRate / 2;
                    const sgstRate = row.gstRate - cgstRate;
                    const cgstAmt = Math.round(row.gstPaisa / 2);
                    const sgstAmt = row.gstPaisa - cgstAmt;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600 font-bold">{String(row.hsnCode ?? "N/A")}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-700">{row.gstRate}%</td>
                        <td className="px-4 py-3.5 text-slate-500">{cgstRate}%</td>
                        <td className="px-4 py-3.5 text-slate-500">{sgstRate}%</td>
                        <td className="px-4 py-3.5 font-medium text-slate-800">{formatCurrency(row.taxablePaisa)}</td>
                        <td className="px-4 py-3.5 text-blue-700 font-medium">{formatCurrency(cgstAmt)}</td>
                        <td className="px-4 py-3.5 text-indigo-700 font-medium">{formatCurrency(sgstAmt)}</td>
                        <td className="px-4 py-3.5 font-black text-emerald-800">{formatCurrency(row.gstPaisa)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <AlertCircle className="h-10 w-10 text-slate-350 mb-3" />
                <p className="text-sm font-semibold">No tax records found for the selected month</p>
                <p className="text-xs text-slate-400 mt-1">Checkouts processed during this month will appear here.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
