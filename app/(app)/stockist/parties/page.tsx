import { AlertCircle, CheckCircle2, MapPin, Plus, ShieldCheck, UserCheck, Users, Search, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { getParties, getRoutes } from "@/lib/stockist-db";
import { createPartyAction } from "@/app/stockist-actions";

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
        {/* Parties List Table */}
        <div className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2">
              <Users className="h-5 w-5 text-med-green" /> Registered Chemists ({parties.length})
            </h2>
          </div>

          {parties.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
              No retail chemists added yet. Register your first party in the right sidebar.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
              <table className="w-full text-left text-sm border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-display font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Party Name</th>
                    <th className="px-4 py-3">Beat / Route</th>
                    <th className="px-4 py-3">GSTIN / DL No.</th>
                    <th className="px-4 py-3 text-right">Credit Limit</th>
                    <th className="px-4 py-3 text-right">Outstanding</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parties.map((party) => {
                    const outstandingPct = party.creditLimitPaisa > 0 ? (party.outstandingPaisa / party.creditLimitPaisa) * 100 : 0;
                    const limitBlocked = party.creditLimitPaisa > 0 && party.outstandingPaisa >= party.creditLimitPaisa;
                    const nearLimit = outstandingPct >= 80;

                    return (
                      <tr key={party.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-med-navy text-sm sm:text-base leading-snug">{party.name}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">{party.phone || "No contact"} • {party.email || "No email"}</p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                          {party.route ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded-md">
                              <MapPin className="h-3 w-3 shrink-0" /> {party.route.name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Not Assigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-bold text-slate-700 font-mono">GST: {party.gstin || "URP"}</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-0.5">DL: {party.drugLicenseNo || "N/A"}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-700">
                          {party.creditLimitPaisa > 0 ? formatCurrency(party.creditLimitPaisa) : "No Limit"}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <p className={`font-mono font-bold ${party.outstandingPaisa > 0 ? (limitBlocked ? "text-red-600" : (nearLimit ? "text-orange-600" : "text-med-navy")) : "text-slate-400"}`}>
                            {formatCurrency(party.outstandingPaisa)}
                          </p>
                          {party.creditLimitPaisa > 0 && (
                            <div className="w-20 ml-auto mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${limitBlocked ? "bg-red-500" : (nearLimit ? "bg-orange-400" : "bg-emerald-500")}`}
                                style={{ width: `${Math.min(outstandingPct, 100)}%` }}
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {limitBlocked ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                              <AlertCircle className="h-3 w-3" /> Blocked
                            </span>
                          ) : (nearLimit ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                              <AlertCircle className="h-3 w-3" /> Near Limit
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </span>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
                <input name="creditLimit" type="number" min="0" defaultValue="50000" className="h-10 w-full rounded-lg border border-slate-300 pl-7 pr-3 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold" placeholder="e.g. 50000" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Blocks B2B billing if outstanding exceeds this limit. Set 0 for unlimited.</p>
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
