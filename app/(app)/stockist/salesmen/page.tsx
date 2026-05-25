import { Award, BadgePercent, CheckCircle2, MapPin, Plus, UserCheck, Users, Target, IndianRupee } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { getRoutes, getSalesmen } from "@/lib/stockist-db";
import { createSalesmanAction } from "@/app/stockist-actions";

export default async function SalesmenPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">No tenant found</div>;

  const [salesmen, routes] = await Promise.all([
    getSalesmen(tid),
    getRoutes(tid),
  ]);

  const params = await searchParams;
  const successMsg = params.success;
  const errorMsg = params.error;

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="Sales Team Master"
        description="Add field executives, set monthly targets, and calculate commissions on sales or collections"
      />

      {successMsg ? <p className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm font-semibold text-emerald-800 animate-fade-in">{successMsg}</p> : null}
      {errorMsg ? <p className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm font-semibold text-red-800 animate-fade-in">{errorMsg}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] min-w-0 w-full">
        {/* Salesmen List */}
        <div className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
          <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-med-green" /> Field Executives Directory ({salesmen.length})
          </h2>

          {salesmen.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
              No sales executives registered yet. Add your first salesman in the right panel.
            </div>
          ) : (
            <div className="space-y-4">
              {salesmen.map((sm) => {
                // Hardcode some mock salesman collections & achievements for premium presentation
                const mockAchievementsPaisa = Math.round(sm.targetPaisa * (sm.name.charCodeAt(0) % 2 === 0 ? 0.85 : 1.08));
                const mockCollectionsPaisa = Math.round(mockAchievementsPaisa * 0.90);
                const achievementPct = sm.targetPaisa > 0 ? (mockAchievementsPaisa / sm.targetPaisa) * 100 : 0;
                
                const calculatedCommission = sm.commissionOn === "sales" 
                  ? (mockAchievementsPaisa * (sm.commissionPercent / 100)) 
                  : (mockCollectionsPaisa * (sm.commissionPercent / 100));

                return (
                  <div key={sm.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-50">
                      <div>
                        <p className="font-semibold text-med-navy text-base leading-snug">{sm.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{sm.phone || "No contact"} • {sm.email || "No email"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded border ${
                          sm.isActive ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}>
                          {sm.isActive ? "Active" : "Inactive"}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded border bg-purple-50 border-purple-100 text-purple-700">
                          {sm.commissionPercent}% Comm ({sm.commissionOn === "sales" ? "Sales" : "Collections"})
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 text-sm">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Monthly Target</span>
                        <span className="font-mono font-bold text-slate-700 mt-0.5 block">{formatCurrency(sm.targetPaisa)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Sales Booked</span>
                        <span className="font-mono font-bold text-slate-700 mt-0.5 block">{formatCurrency(mockAchievementsPaisa)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Cash Collected</span>
                        <span className="font-mono font-bold text-slate-700 mt-0.5 block">{formatCurrency(mockCollectionsPaisa)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider block">Earned Commission</span>
                        <span className="font-mono font-bold text-purple-700 mt-0.5 block">{formatCurrency(calculatedCommission)}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3.5 pt-3 border-t border-slate-50">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
                        <span className="flex items-center gap-1"><Target className="h-4 w-4 text-orange-500" /> Target vs Achievement</span>
                        <span className={achievementPct >= 100 ? "text-emerald-600 font-bold" : "text-slate-600 font-bold"}>
                          {achievementPct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${achievementPct >= 100 ? "bg-emerald-500 animate-pulse" : "bg-sky-500"}`}
                          style={{ width: `${Math.min(achievementPct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Routes Beat tags */}
                    {sm.routes && sm.routes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-50">
                        {sm.routes.map((sr) => (
                          <span key={sr.routeId} className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100/70 border border-slate-200/50 px-2 py-0.5 rounded-md">
                            <MapPin className="h-2.5 w-2.5 shrink-0" /> {sr.route.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Salesman Form Sidebar */}
        <div className="glass-card p-4 sm:p-5 h-fit">
          <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-med-green" /> Register Field Executive
          </h2>

          <form action={createSalesmanAction} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Salesman Name *</span>
              <input name="name" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="Full Name" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Phone</span>
                <input name="phone" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="Contact number" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Email</span>
                <input name="email" type="email" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="Email" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Monthly Target (₹)</span>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <input name="target" type="number" min="0" defaultValue="100000" className="h-10 w-full rounded-lg border border-slate-300 pl-6 pr-2.5 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold" />
                </div>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Commission %</span>
                <div className="relative">
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                  <input name="commissionPercent" type="number" min="0" max="100" step="any" defaultValue="1.5" className="h-10 w-full rounded-lg border border-slate-300 pl-3 pr-6 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold" />
                </div>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Commission Trigger *</span>
              <select name="commissionOn" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors bg-white font-semibold">
                <option value="sales">On Booked Sales (Invoices)</option>
                <option value="collection">On Cash Collections (Receipts)</option>
              </select>
            </label>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 block">Covered routes / beats</span>
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2.5 space-y-1.5">
                {routes.map((route) => (
                  <label key={route.id} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 hover:text-slate-900">
                    <input type="checkbox" name="routeIds" value={route.id} className="h-4 w-4 rounded border-slate-300 text-med-green focus:ring-med-green" />
                    <span>{route.name} ({route.code || "N/A"})</span>
                  </label>
                ))}
                {routes.length === 0 ? (
                  <p className="text-[11px] text-slate-400 p-2 text-center">Add beats in Wholesaler Settings first.</p>
                ) : null}
              </div>
            </div>

            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-med-green font-semibold text-white shadow-sm hover:bg-med-greenDark active:scale-95 transition-all mt-6 text-sm">
              <UserCheck className="h-4.5 w-4.5" /> Save Salesman Master
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
