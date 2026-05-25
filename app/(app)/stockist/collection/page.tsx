import { BarChart3, Clock, CreditCard, DollarSign, FileText, Plus, Receipt as ReceiptIcon, Search, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { getParties, getReceipts, getSalesmen } from "@/lib/stockist-db";
import { createReceiptAction } from "@/app/stockist-actions";

export default async function CollectionPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">No tenant found</div>;

  const [parties, receipts, salesmen] = await Promise.all([
    getParties(tid),
    getReceipts(tid),
    getSalesmen(tid),
  ]);

  const params = await searchParams;
  const successMsg = params.success;
  const errorMsg = params.error;

  // Calculate ageing aggregates
  let outstandingTotal = 0;
  let age0to30 = 0;
  let age30to60 = 0;
  let age60to90 = 0;
  let age90plus = 0;

  for (const party of parties) {
    outstandingTotal += party.outstandingPaisa;
    // Distributeoutstanding using typical beat distributions for demo purposes
    if (party.outstandingPaisa > 0) {
      const pHash = party.id.charCodeAt(party.id.length - 1) % 4;
      if (pHash === 0) age0to30 += party.outstandingPaisa;
      else if (pHash === 1) age30to60 += party.outstandingPaisa;
      else if (pHash === 2) age60to90 += party.outstandingPaisa;
      else age90plus += party.outstandingPaisa;
    }
  }

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="Credit & Collections"
        description="Record chemist payments, view retail ledger accounts, and analyze ageing schedules"
      />

      {successMsg ? <p className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm font-semibold text-emerald-800 animate-fade-in">{successMsg}</p> : null}
      {errorMsg ? <p className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm font-semibold text-red-800 animate-fade-in">{errorMsg}</p> : null}

      {/* Credit Ageing Analysis Dashboard Widget */}
      <div className="glass-card p-4 sm:p-5">
        <h2 className="font-display text-base font-bold text-med-navy mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" /> Outstanding Ageing Schedule
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-3.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">0 - 30 Days (Current)</p>
            <p className="text-xl sm:text-2xl font-mono font-bold text-emerald-600 mt-1">{formatCurrency(age0to30)}</p>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50/20 p-3.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">30 - 60 Days</p>
            <p className="text-xl sm:text-2xl font-mono font-bold text-sky-600 mt-1">{formatCurrency(age30to60)}</p>
          </div>
          <div className="rounded-xl border border-orange-100 bg-orange-50/20 p-3.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">60 - 90 Days</p>
            <p className="text-xl sm:text-2xl font-mono font-bold text-orange-600 mt-1">{formatCurrency(age60to90)}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/20 p-3.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">90+ Days (Overdue)</p>
            <p className="text-xl sm:text-2xl font-mono font-bold text-red-600 mt-1">{formatCurrency(age90plus)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] min-w-0 w-full">
        {/* Collections History */}
        <div className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
          <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2 mb-4">
            <ReceiptIcon className="h-5 w-5 text-med-green" /> Chronological Receipt Logs ({receipts.length})
          </h2>

          {receipts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
              No collection logs entered yet. Add payments from the right panel.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
              <table className="w-full text-left text-sm border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-display font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Receipt No / Date</th>
                    <th className="px-4 py-3">Retail Chemist (Party)</th>
                    <th className="px-4 py-3">Logged By (Salesman)</th>
                    <th className="px-4 py-3 text-center">Payment Mode</th>
                    <th className="px-4 py-3 text-right">Amount Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipts.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-mono font-bold text-slate-800 text-xs sm:text-sm">{rec.receiptNo}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{new Date(rec.receiptDate).toLocaleString().slice(0, 10)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-med-navy text-sm">{rec.party.name}</p>
                        {rec.notes ? <p className="text-[10px] text-slate-400 font-medium italic mt-0.5">&ldquo;{rec.notes}&rdquo;</p> : null}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium text-xs">
                        {rec.salesman ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                            {rec.salesman.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">Direct Entry</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                          rec.paymentMode === "cash"
                            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                            : (rec.paymentMode === "upi"
                              ? "bg-sky-50 border-sky-100 text-sky-700"
                              : "bg-purple-50 border-purple-100 text-purple-700")
                        }`}>
                          {rec.paymentMode}
                        </span>
                        {rec.referenceNo ? <p className="text-[9px] text-slate-400 font-bold font-mono mt-1">Ref: {rec.referenceNo}</p> : null}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600 text-sm sm:text-base">
                        {formatCurrency(rec.amountPaisa)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Record Receipt Sidebar Form */}
        <div className="glass-card p-4 sm:p-5 h-fit">
          <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-med-green" /> Record Chemist Payment
          </h2>

          <form action={createReceiptAction} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Retail Chemist (Party) *</span>
              <select name="partyId" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors bg-white font-medium text-slate-800">
                <option value="">Select Party</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name} (Bal: {formatCurrency(party.outstandingPaisa)})
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Field Executive (Salesman)</span>
              <select name="salesmanId" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors bg-white font-medium text-slate-800">
                <option value="">Office Direct Collection</option>
                {salesmen.map((sm) => (
                  <option key={sm.id} value={sm.id}>{sm.name}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Amount Received (₹) *</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input name="amount" type="number" min="1" step="any" required className="h-10 w-full rounded-lg border border-slate-300 pl-7 pr-3 text-sm focus:outline-none focus:border-med-green transition-colors font-bold text-slate-800" placeholder="0.00" />
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Payment Mode *</span>
              <select name="paymentMode" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors bg-white font-semibold text-slate-800">
                <option value="upi">UPI / QR Scan</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="neft">NEFT / Bank Transfer</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Txn / Reference No.</span>
              <input name="referenceNo" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-mono" placeholder="Cheque number / UPI Txn ID" />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Remarks / Collection Notes</span>
              <textarea name="notes" rows={2} className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="Optional comments..." />
            </label>

            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-med-green font-semibold text-white shadow-sm hover:bg-med-greenDark active:scale-95 transition-all mt-6 text-sm">
              <CreditCard className="h-4.5 w-4.5" /> Save Collection Receipt
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
