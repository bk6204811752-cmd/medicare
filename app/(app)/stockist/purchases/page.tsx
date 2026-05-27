import { Box, CheckCircle2, ClipboardList, Download, FileText, ArrowRight, Package, Plus, Receipt, Truck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, t } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { getB2BIndents } from "@/lib/stockist-db";
import Link from "next/link";

export default async function PurchasesPage() {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">{t("No tenant found")}</div>;

  const indents = await getB2BIndents(tid);

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="Purchases & Retailer Indents"
        description="Book bulk purchases from manufacturers and process digital indents booked by chemists"
      />

      <div className="grid gap-6 lg:grid-cols-2 min-w-0 w-full">
        {/* Bulk CFA Purchases */}
        <div className="glass-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2">
              <Truck className="h-5 w-5 text-med-green" /> Purchases from Manufacturers / CFA
            </h2>
            <Link
              href="/stockist/inventory/add"
              className="inline-flex items-center gap-1 rounded bg-med-green px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-med-greenDark active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5" /> Purchase Entry
            </Link>
          </div>

          <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
            {t("No bulk purchase orders recorded. Book your incoming inventory batches from manufacturing units.")}
          </div>
        </div>

        {/* Chemist Retailer Indents */}
        <div className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-med-green" /> Retailer Indent Orders ({indents.length})
            </h2>
            <button className="inline-flex items-center gap-1 text-xs text-slate-400 font-bold bg-slate-100/70 border border-slate-200/50 px-2 py-1 rounded">
              <Download className="h-3.5 w-3.5" /> Import Indent File
            </button>
          </div>

          {indents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
              {t("No indents received. Retailers can sync their stock shortages to send indents automatically.")}
            </div>
          ) : (
            <div className="space-y-4">
              {indents.map((indent) => (
                <div key={indent.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                    <div>
                      <p className="font-mono font-bold text-slate-800 text-sm">{indent.indentNo}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{t("Date: ")}{new Date(indent.indentDate).toLocaleString().slice(0, 10)}</p>
                    </div>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                      {t("Pending")}
                    </span>
                  </div>

                  <div className="py-3">
                    <p className="text-xs font-semibold text-slate-500">{t("Retailer / Chemist: ")}<strong className="text-med-navy">{indent.chemistName}</strong></p>
                    <div className="mt-2 space-y-1 bg-slate-50/50 rounded-lg p-2.5">
                      {indent.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs text-slate-700 font-medium">
                          <span>{item.medicineName}</span>
                          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-100">{t("Qty: ")}{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-50 flex items-center justify-end">
                    <Link
                      href={`/stockist/sales?indentId=${indent.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-med-green hover:underline"
                    >
                      {t("Process to B2B POS Invoice ")}<ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
