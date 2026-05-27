import { AlertCircle, CheckCircle2, Box, Plus, ShieldCheck, UserCheck, Users, Search, CreditCard, Truck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStockistSupplierAction } from "@/app/stockist-actions";

export default async function StockistSuppliersPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">No tenant found</div>;

  // Fetch all suppliers (manufacturers) for this stockist tenant
  const suppliers = await prisma.supplier.findMany({
    where: { tenantId: tid, isActive: true },
    orderBy: { name: "asc" },
  });

  const params = await searchParams;
  const successMsg = params.success;
  const errorMsg = params.error;

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden animate-fade-in">
      <PageHeader
        title="Manufacturers & CFA Master"
        description="Manage bulk medicine manufacturing accounts, CFA distributorship agents, purchase terms, and balances"
      />

      {successMsg ? <p className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm font-semibold text-emerald-800 animate-fade-in">{successMsg}</p> : null}
      {errorMsg ? <p className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm font-semibold text-red-800 animate-fade-in">{errorMsg}</p> : null}

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-4 bg-emerald-50/10 border border-emerald-100/50">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Manufacturers / CFA</h3>
            <p className="text-2xl font-extrabold text-slate-800">{suppliers.length} accounts</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Active bulk supply chains</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4 bg-blue-50/10 border border-blue-100/50">
          <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Credit Terms</h3>
            <p className="text-2xl font-extrabold text-slate-800">30 days avg</p>
            <p className="text-[10px] text-blue-600 font-semibold mt-0.5">Manufacturers payment terms</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4 bg-slate-55 bg-slate-50/10 border border-slate-200/50">
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Box className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Supply Balance</h3>
            <p className="text-2xl font-extrabold text-slate-800">
              {formatCurrency(suppliers.reduce((sum, s) => sum + s.balancePaisa, 0))}
            </p>
            <p className="text-[10px] text-slate-450 font-semibold mt-0.5">Total outstanding B2B ledgers</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] min-w-0 w-full">
        {/* Suppliers List Table */}
        <div className="glass-card p-4 sm:p-5 min-w-0 w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2">
              <Box className="h-5 w-5 text-med-green" /> Registered Drug Manufacturers ({suppliers.length})
            </h2>
          </div>

          {suppliers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
              No drug manufacturers added yet. Register your first CFA / Manufacturer in the right panel.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-xs">
              <table className="w-full text-left text-sm border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-display font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3">Manufacturer Name</th>
                    <th className="px-4 py-3">GSTIN No.</th>
                    <th className="px-4 py-3 text-center">Credit Days</th>
                    <th className="px-4 py-3 text-right">Balance Due</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-med-navy text-sm sm:text-base leading-snug">{sup.name}</p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{sup.phone || "No contact"} • {sup.email || "No email"}</p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-700 font-bold">
                        {sup.gstin || "N/A"}
                      </td>
                      <td className="px-4 py-3.5 text-center font-semibold text-slate-600">
                        {sup.creditDays} days
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                        {formatCurrency(sup.balancePaisa)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Manufacturer Form Sidebar */}
        <div className="glass-card p-4 sm:p-5 h-fit">
          <h2 className="font-display text-base sm:text-lg font-semibold text-med-navy flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-med-green" /> Register Manufacturer
          </h2>

          <form action={createStockistSupplierAction} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">Manufacturer / Supplier Name *</span>
              <input name="name" required className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold" placeholder="e.g. Cipla Healthcare Ltd" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Phone</span>
                <input name="phone" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="Contact number" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Email</span>
                <input name="email" type="email" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="Email address" />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500">CFA / Distribution Address</span>
              <input name="address" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="Supply depot address" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">GSTIN No.</span>
                <input name="gstin" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors" placeholder="GSTIN Number" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Credit Days</span>
                <input name="creditDays" type="number" min="0" defaultValue="30" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:border-med-green transition-colors font-semibold text-center" placeholder="30" />
              </label>
            </div>

            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-med-green font-semibold text-white shadow-sm hover:bg-med-greenDark active:scale-95 transition-all mt-6 text-sm">
              <UserCheck className="h-4.5 w-4.5" /> Save Manufacturer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
