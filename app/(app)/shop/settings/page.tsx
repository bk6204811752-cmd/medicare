import { getCurrentUser } from "@/lib/auth";
import { getTenant } from "@/lib/local-db";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const tenant = await getTenant(user?.tenantId ?? "");

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-2">
        <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-med-navy">Shop profile</h2>
          <div className="mt-4 grid gap-3">
            <input className="h-11 rounded-md border border-slate-300 px-3" defaultValue={tenant.name} />
            <input className="h-11 rounded-md border border-slate-300 px-3" defaultValue={tenant.ownerName ?? ""} />
            <input className="h-11 rounded-md border border-slate-300 px-3" defaultValue={tenant.gstin ?? ""} />
            <input className="h-11 rounded-md border border-slate-300 px-3" defaultValue={tenant.drugLicenseNo ?? ""} />
            <button className="min-h-11 rounded-md bg-med-green font-semibold text-white">Save settings</button>
          </div>
        </form>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-med-navy">Free resources mode</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Database: Prisma-backed and ready for Azure PostgreSQL.</p>
            <p>WhatsApp: wa.me link instead of paid Business API.</p>
            <p>Email/SMS: disabled until a free quota provider is configured.</p>
            <p>Analytics: app dashboard metrics instead of paid monitoring.</p>
          </div>
        </div>
      </section>
    </>
  );
}
