import { BarChart3, Download, FileSpreadsheet, FileText, IndianRupee, ShieldCheck, Tag } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { getGSTR1B2B, getParties } from "@/lib/stockist-db";

export default async function ReportsPage() {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">No tenant found</div>;

  const today = new Date();
  const fromDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const toDate = today.toISOString().slice(0, 10);

  const [gstr1, parties] = await Promise.all([
    getGSTR1B2B(tid, fromDate, toDate),
    getParties(tid),
  ]);

  let totalTaxableValue = 0;
  let totalTaxValue = 0;
  gstr1.forEach((row) => {
    totalTaxableValue += Number(row.taxableValue);
    totalTaxValue += Number(row.totalTax);
  });

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="Distribution Analytics & GST Reports"
        description="Download GSTR filings, party ageing analyses, and scheme utilization logs"
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <IndianRupee className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">GSTR-1 Taxable B2B</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-slate-800 mt-1 block">₹{totalTaxableValue.toFixed(2)}</span>
          </div>
        </div>
        <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total GST Collected</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-slate-800 mt-1 block">₹{totalTaxValue.toFixed(2)}</span>
          </div>
        </div>
        <div className="glass-card p-4 sm:p-5 flex items-center gap-4 animate-fade-in md:col-span-2 xl:col-span-1">
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">B2B Schemes Utilization</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-slate-800 mt-1 block">18 Schemes applied</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] min-w-0 w-full">
        {/* GSTR-1 Invoices Table */}
        <div className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-med-green" /> GSTR-1 Outward Supplies (B2B)
            </h2>
            <button className="inline-flex items-center gap-1.5 rounded bg-med-navy px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90 active:scale-95 transition-all font-sans">
              <Download className="h-3.5 w-3.5" /> Export Excel (CA Ready)
            </button>
          </div>

          {gstr1.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
              No sales recorded in this period. Generated B2B POS Invoices automatically compile here for CA filings.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
              <table className="w-full text-left text-sm border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-display font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Chemist (Party)</th>
                    <th className="px-4 py-3">GSTIN No.</th>
                    <th className="px-4 py-3">Invoice No / Date</th>
                    <th className="px-4 py-3 text-right">Taxable Amt</th>
                    <th className="px-4 py-3 text-right">CGST / SGST</th>
                    <th className="px-4 py-3 text-right">Total Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {gstr1.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-med-navy">{row.partyName}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600 font-bold">{row.gstin}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-mono text-slate-800 text-xs">{row.invoiceNo}</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{row.invoiceDate}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-700">₹{row.taxableValue}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-500 text-xs">
                        ₹{row.cgst} / ₹{row.sgst}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">₹{row.invoiceValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* GST Reporting guidelines */}
        <div className="glass-card p-4 sm:p-5 h-fit space-y-4">
          <h2 className="font-display text-base font-bold text-med-navy flex items-center gap-2">
            <FileText className="h-5 w-5 text-med-green" /> CA Filing Checklist
          </h2>
          <div className="text-xs text-slate-500 leading-normal space-y-3">
            <p>
              MedCare compiles drug distribution reports into standard formats compatible directly with the Indian government&apos;s GST portal offline tool.
            </p>
            <div className="rounded-lg border border-purple-100 bg-purple-50/30 p-3 text-purple-950 font-medium text-[11px] space-y-2">
              <p className="font-bold text-purple-900 flex items-center gap-1">✦ GSTR-1 Invoicing</p>
              <p>Section 4A, 4B, 4C, 6B, 6C handles all inter-state and intra-state B2B drug deliveries.</p>
              <p className="font-bold text-purple-900 flex items-center gap-1 mt-2">✦ GSTR-3B Taxable Totals</p>
              <p>Section 3.1(a) represents your outward taxable supplies logs.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
