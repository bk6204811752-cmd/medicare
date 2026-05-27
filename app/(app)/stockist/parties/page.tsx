import { AlertCircle, CheckCircle2, MapPin, Plus, ShieldCheck, UserCheck, Users, Search, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { getParties, getRoutes } from "@/lib/stockist-db";
import { createPartyAction } from "@/app/stockist-actions";
import { PartiesClientDashboard } from "@/components/parties-client-dashboard";

export default async function PartiesPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">No tenant found</div>;

  const [parties, routes] = await Promise.all([
    getParties(tid),
    getRoutes(tid),
  ]);

  const params = await searchParams;
  const successMsg = params.success;
  const errorMsg = params.error;

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="Parties Master"
        description="Manage your retail chemist customer database, credit limits, and routes"
      />

      {successMsg ? <p className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm font-semibold text-emerald-800 animate-fade-in">{successMsg}</p> : null}
      {errorMsg ? <p className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm font-semibold text-red-800 animate-fade-in">{errorMsg}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] min-w-0 w-full">
        {/* Parties List Client Component */}
        <div className="min-w-0 w-full overflow-hidden">
          <PartiesClientDashboard initialParties={parties} routes={routes} />
        </div>

        {/* Add Party Form Sidebar */}
        <div className="glass-card p-4 sm:p-5 h-fit">
          <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-med-green" /> Register New Chemist
          </h2>

          <form action={createPartyAction} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Party / Chemist Name *</span>
              <input name="name" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="e.g. Sharma Medical Hall" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Phone *</span>
                <input name="phone" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="Contact number" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Email</span>
                <input name="email" type="email" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="Email address" />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Shop Address</span>
              <input name="address" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="Shop location address" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">GSTIN No.</span>
                <input name="gstin" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="15-digit GSTIN" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Drug License (DL) No.</span>
                <input name="drugLicenseNo" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="DL Number" />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Credit Limit (₹)</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input name="creditLimit" type="number" min="0" defaultValue="" className="h-10 w-full rounded-lg border border-slate-300 pl-7 pr-3 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold" placeholder="e.g. 50000" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Blocks B2B billing if outstanding exceeds this limit. Set 0 or leave empty for unlimited.</p>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Beat / Route Assignment</span>
              <select name="routeId" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors bg-white">
                <option value="">Select a Beat/Route</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>{route.name}</option>
                ))}
              </select>
            </label>

            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-med-green font-semibold text-white shadow-sm hover:bg-med-greenDark active:scale-95 transition-all mt-6 text-sm">
              <UserCheck className="h-4.5 w-4.5" /> Save Retailer Party
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
