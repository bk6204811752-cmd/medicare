import { Check, X } from "lucide-react";
import { approveTenantAction, rejectTenantAction } from "@/app/auth-actions";
import { PageHeader } from "@/components/page-header";
import { getAllTenants } from "@/lib/local-db";

export default async function AdminShopsPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  const tenants = await getAllTenants();

  return (
    <>
      <PageHeader title="Shop Management" description="Approve, reject, and monitor registered shopkeepers." />
      {params.success ? <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{params.success}</p> : null}
      <section className="grid gap-3 lg:hidden">
        {tenants.map((tenant) => {
          const status = tenant.approvalStatus;
          return (
            <article key={tenant.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-semibold text-med-navy">{tenant.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{tenant.ownerName || "Owner not set"}</p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${
                    status === "approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {status}
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <p><span className="font-semibold text-med-navy">Email:</span> {tenant.email || "No email"}</p>
                <p><span className="font-semibold text-med-navy">Phone:</span> {tenant.phone}</p>
                <p><span className="font-semibold text-med-navy">City:</span> {tenant.city || "Not set"}, {tenant.state || "Not set"}</p>
                <p><span className="font-semibold text-med-navy">Plan:</span> {tenant.plan.toUpperCase()}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <form action={approveTenantAction}>
                  <input type="hidden" name="tenantId" value={tenant.id} />
                  <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-med-green px-3 font-semibold text-white hover:bg-med-greenDark">
                    <Check className="h-4 w-4" /> Approve
                  </button>
                </form>
                <form action={rejectTenantAction}>
                  <input type="hidden" name="tenantId" value={tenant.id} />
                  <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-red-200 px-3 font-semibold text-red-700 hover:bg-red-50">
                    <X className="h-4 w-4" /> Reject
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </section>
      <section className="hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                {["Shop", "Owner", "Contact", "Plan", "Status", "Actions"].map((head) => (
                  <th key={head} className="px-4 py-3 font-medium">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => {
                const status = tenant.approvalStatus;
                return (
                  <tr key={tenant.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-med-navy">{tenant.name}</p>
                      <p className="text-xs text-slate-500">{tenant.city || "City not set"}, {tenant.state || "State not set"}</p>
                    </td>
                    <td className="px-4 py-3">{tenant.ownerName || "Not set"}</td>
                    <td className="px-4 py-3">
                      <p>{tenant.email || "No email"}</p>
                      <p className="text-xs text-slate-500">{tenant.phone}</p>
                    </td>
                    <td className="px-4 py-3 uppercase">{tenant.plan}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${
                          status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <form action={approveTenantAction}>
                          <input type="hidden" name="tenantId" value={tenant.id} />
                          <button className="inline-flex min-h-9 items-center gap-2 rounded-md bg-med-green px-3 font-semibold text-white hover:bg-med-greenDark">
                            <Check className="h-4 w-4" /> Approve
                          </button>
                        </form>
                        <form action={rejectTenantAction}>
                          <input type="hidden" name="tenantId" value={tenant.id} />
                          <button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-200 px-3 font-semibold text-red-700 hover:bg-red-50">
                            <X className="h-4 w-4" /> Reject
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
