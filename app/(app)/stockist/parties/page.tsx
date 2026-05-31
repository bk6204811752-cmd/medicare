import { AlertCircle, CheckCircle2, MapPin, Plus, ShieldCheck, UserCheck, Users, Search, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { getParties, getRoutes } from "@/lib/stockist-db";
import { createPartyAction } from "@/app/stockist-actions";
import { PartiesClientDashboard } from "@/components/parties-client-dashboard";
import { getTenant } from "@/lib/local-db";

export default async function PartiesPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">No tenant found</div>;

  const [parties, routes, tenant] = await Promise.all([
    getParties(tid),
    getRoutes(tid),
    getTenant(tid).catch(() => null)
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

      <div className="min-w-0 w-full">
        <PartiesClientDashboard initialParties={parties} routes={routes} tenant={tenant} />
      </div>
    </div>
  );
}
