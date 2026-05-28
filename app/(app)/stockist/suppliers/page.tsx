import { Box, CreditCard, Truck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StockistSuppliersClient } from "@/components/stockist-suppliers-client";

export default async function StockistSuppliersPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">No tenant found</div>;

  // Fetch all active suppliers (manufacturers) for this stockist tenant
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

        <div className="glass-card p-4 flex items-center gap-4 bg-slate-50/10 border border-slate-200/50">
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

      {/* Main Interactive Suppliers Section */}
      <StockistSuppliersClient initialSuppliers={suppliers} />
    </div>
  );
}
