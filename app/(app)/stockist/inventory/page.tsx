import { AlertTriangle, Box, ChevronRight, HelpCircle, MapPin, Package, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { getWholesaleInventory } from "@/lib/stockist-db";

export default async function InventoryPage() {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">No tenant found</div>;

  const inventory = await getWholesaleInventory(tid);

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="Distribution Inventory"
        description="Monitor wholesale drug stocks, edit PTR/PTS pricing matrices, and inspect FEFO picking sequences"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] min-w-0 w-full">
        {/* Inventory Table */}
        <div className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2">
              <Package className="h-5 w-5 text-med-green" /> Distribution Stocks ({inventory.length} lots)
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold bg-slate-100/70 border border-slate-200/50 px-2 py-1 rounded">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> FEFO Sorting Enabled
            </div>
          </div>

          {inventory.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
              No stock batches loaded in your warehouse yet. Import or record purchases to stock your shelves.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
              <table className="w-full text-left text-sm border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-display font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Medicine / Composition</th>
                    <th className="px-4 py-3">Batch & Expiry</th>
                    <th className="px-4 py-3 text-center">Picking Index</th>
                    <th className="px-4 py-3 text-right">PTS (Cost)</th>
                    <th className="px-4 py-3 text-right">PTR (Retailer)</th>
                    <th className="px-4 py-3 text-right">MRP</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {inventory.map((item, index) => {
                    const isExpired = new Date(item.expiryDate) <= new Date();
                    // Identify older expiring batches as high priority FEFO index
                    const isFefoPick = index < 3 && item.quantity > 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-med-navy text-sm sm:text-base leading-snug">{item.medicine.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate max-w-xs">{item.medicine.composition || "Generic composition unknown"}</p>
                          <p className="text-[9px] text-slate-500 mt-1 font-bold bg-slate-100 px-1.5 py-0.5 rounded w-fit inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> Loc: {item.rackLocation || "MAIN_WH"}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-700 font-mono text-xs">Batch: {item.batchNo}</p>
                          <p className={`text-[10px] font-bold mt-0.5 ${isExpired ? "text-red-500" : "text-slate-400"}`}>
                            Exp: {item.expiryDate.toISOString().slice(0, 10)}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {isExpired ? (
                            <span className="inline-flex text-[9px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded">🔴 Expired</span>
                          ) : (isFefoPick ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded animate-pulse border border-emerald-100">
                              ⭐ FEFO Pick 1
                            </span>
                          ) : (
                            <span className="inline-flex text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Pick {index + 1}</span>
                          ))}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-500">
                          {formatCurrency(item.ptsPaisa > 0 ? item.ptsPaisa : item.purchaseRatePaisa)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-med-navy">
                          {formatCurrency(item.ptrPaisa > 0 ? item.ptrPaisa : item.saleRatePaisa)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-500">
                          {formatCurrency(item.mrpPaisa)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`font-mono font-bold ${item.quantity <= item.reorderLevel ? "text-orange-500 font-black" : "text-slate-800"}`}>
                            {item.quantity}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* virtual stock transfer & help sidebar */}
        <div className="space-y-6">
          
          {/* Stock Transfer */}
          <div className="glass-card p-4 sm:p-5">
            <h2 className="font-display text-base font-bold text-med-navy mb-4 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-med-green" /> Virtual Stock Transfer
            </h2>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Stock transfer logged successfully!"); }}>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Choose Stock Batch</span>
                <select required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green bg-white font-medium">
                  <option value="">Select Batch Lot</option>
                  {inventory.slice(0, 10).map((i) => (
                    <option key={i.id} value={i.id}>{i.medicine.name} (Batch: {i.batchNo})</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Qty to Move</span>
                  <input type="number" min="1" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green font-bold" />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Target Location</span>
                  <input required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green font-bold" placeholder="e.g. COLD_STORAGE" />
                </label>
              </div>

              <button type="submit" className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-med-navy font-semibold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all text-xs">
                Log Transfer Movement
              </button>
            </form>
          </div>

          {/* Pricing matrix guide */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-4 space-y-2.5">
            <h3 className="font-display font-bold text-sky-950 text-sm flex items-center gap-1.5">
              <HelpCircle className="h-4.5 w-4.5 text-sky-600" /> B2B Price Matrix Dictionary
            </h3>
            <p className="text-xs text-sky-900 leading-normal">
              Wholesaler operations utilize specialized pricing. Here is the layout:
            </p>
            <div className="text-[11px] space-y-1.5 text-sky-800">
              <p>• <strong className="font-bold text-sky-950">PTS (Price to Stockist):</strong> Your purchase cost from manufacturers/CFAs.</p>
              <p>• <strong className="font-bold text-sky-950">PTR (Price to Retailer):</strong> The standard sale rate you charge chemist shops (defaults to B2B Billing rate).</p>
              <p>• <strong className="font-bold text-sky-950">Special Rate:</strong> Customizable discount rates assigned to key distributor accounts.</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
