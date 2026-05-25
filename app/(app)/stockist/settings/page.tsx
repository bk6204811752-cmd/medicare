import { Box, CheckCircle2, MapPin, Plus, Receipt, Settings, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { getRoutes } from "@/lib/stockist-db";
import { createRouteAction } from "@/app/stockist-actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">No tenant found</div>;

  const routes = await getRoutes(tid);

  const params = await searchParams;
  const successMsg = params.success;
  const errorMsg = params.error;

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="Wholesaler Settings"
        description="Configure route beats, invoice templates, and distribution billing settings"
      />

      {successMsg ? <p className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm font-semibold text-emerald-800 animate-fade-in">{successMsg}</p> : null}
      {errorMsg ? <p className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm font-semibold text-red-800 animate-fade-in">{errorMsg}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] min-w-0 w-full">
        {/* Route Beat Configurator */}
        <div className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
          <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-med-green" /> Beat Routes Configuration ({routes.length})
          </h2>

          {routes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
              No routes/beats created yet. Set up your beats on the right sidebar to organize salesman coverage.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {routes.map((route) => (
                <div key={route.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-med-navy text-sm sm:text-base leading-snug">{route.name}</p>
                    {route.code ? <p className="text-[10px] font-bold text-slate-400 font-mono mt-0.5 uppercase tracking-wide">Code: {route.code}</p> : null}
                    {route.description ? <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">{route.description}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Beat Route Form Sidebar */}
        <div className="glass-card p-4 sm:p-5 h-fit space-y-6">
          <div>
            <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2 mb-4">
              <Plus className="h-5 w-5 text-med-green" /> Add Beat Route
            </h2>

            <form action={createRouteAction} className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Route Area Name *</span>
                <input name="name" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="e.g. North Ranchi Beat" />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Route Code</span>
                <input name="code" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-mono uppercase" placeholder="e.g. NT-RCH" />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Beat Coverage Details</span>
                <textarea name="description" rows={2} className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="List key chemist hubs covered..." />
              </label>

              <button type="submit" className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-med-green font-semibold text-white shadow-sm hover:bg-med-greenDark active:scale-95 transition-all text-xs">
                Add Beat Route
              </button>
            </form>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-slate-500" /> B2B Trade Rules
            </h2>
            <div className="space-y-3 text-xs text-slate-500 font-medium">
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span>Default Invoice Prefix</span>
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">INV</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span>Default Delivery Challan Prefix</span>
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">CHL</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Default Trade Credit Cycle</span>
                <span className="font-semibold text-slate-700">30 Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
