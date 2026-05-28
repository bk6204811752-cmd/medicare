import { BarChart3, Download, FileSpreadsheet, FileText, IndianRupee, ShieldCheck, Tag, TrendingUp, Package, Users, Award, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { getGSTR1B2B, getParties, getStockistAnalytics } from "@/lib/stockist-db";
import { StockistAnalyticsClient } from "@/components/stockist-analytics-client";

export default async function ReportsPage() {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">No tenant found</div>;

  const today = new Date();
  const fromDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const toDate = today.toISOString().slice(0, 10);

  // Default: current month + current year (last 12 months for analytics)
  const yearFrom = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);

  const [gstr1, parties, analytics] = await Promise.all([
    getGSTR1B2B(tid, fromDate, toDate),
    getParties(tid),
    getStockistAnalytics(tid, yearFrom, toDate),
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
        description="Monthly profit, top chemists, top medicines, and GSTR filing data"
      />

      {/* ─── Summary KPI Cards ─── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Net Profit (YTD)</span>
            <span className={`font-mono text-xl sm:text-2xl font-bold mt-1 block ${analytics.totalProfitPaisa >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {formatCurrency(analytics.totalProfitPaisa)}
            </span>
          </div>
        </div>
        <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <IndianRupee className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total B2B Revenue (YTD)</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-slate-800 mt-1 block">
              {formatCurrency(analytics.totalRevenuePaisa)}
            </span>
          </div>
        </div>
        <div className="glass-card p-4 sm:p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">GSTR-1 Taxable (Month)</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-slate-800 mt-1 block">₹{totalTaxableValue.toFixed(2)}</span>
          </div>
        </div>
        <div className="glass-card p-4 sm:p-5 flex items-center gap-4 animate-fade-in">
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Invoices (YTD)</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-slate-800 mt-1 block">{analytics.totalInvoices}</span>
          </div>
        </div>
      </div>

      {/* ─── Analytics Client Component (with charts + custom search) ─── */}
      <StockistAnalyticsClient
        initialAnalytics={analytics}
        gstr1={gstr1}
        initialFrom={yearFrom}
        initialTo={toDate}
        totalTaxableValue={totalTaxableValue}
        totalTaxValue={totalTaxValue}
      />
    </div>
  );
}
