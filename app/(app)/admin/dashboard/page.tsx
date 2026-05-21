import { Building2, IndianRupee, Megaphone, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getAllTenants, getPlatformSummary } from "@/lib/local-db";
import { formatCurrency } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const [summary, allTenants] = await Promise.all([getPlatformSummary(), getAllTenants()]);
  const tenants = allTenants.slice(0, 6);

  return (
    <>
      <PageHeader title="Super Admin" description="Platform-owner control room for shops, subscriptions, medicine master, and announcements." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Registered shops" value={String(summary.totalShops)} hint={`${summary.pendingShops} pending approval`} icon={Building2} tone="green" />
        <StatCard title="Platform GMV" value={formatCurrency(summary.gmvPaisa)} hint={`${summary.bills} bills generated`} icon={IndianRupee} tone="blue" />
        <StatCard title="Users" value={String(summary.users)} hint={`${summary.activeShops} active shops`} icon={Users} tone="orange" />
        <StatCard title="Announcements" value="0" hint="Broadcast workspace ready" icon={Megaphone} tone="red" />
      </div>
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-med-navy">Beta shops</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>{["Shop", "City", "Plan", "Owner", "Status"].map((head) => <th key={head} className="px-4 py-3 font-medium">{head}</th>)}</tr>
            </thead>
            <tbody>
              {tenants.map((shop) => (
                <tr key={shop.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-med-navy">{shop.name}</td>
                  <td className="px-4 py-3">{shop.city || "Not set"}</td>
                  <td className="px-4 py-3 uppercase">{shop.plan}</td>
                  <td className="px-4 py-3">{shop.ownerName || "Not set"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-1 text-xs ${shop.approvalStatus === "approved" ? "bg-emerald-100 text-emerald-700" : shop.approvalStatus === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {shop.approvalStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
