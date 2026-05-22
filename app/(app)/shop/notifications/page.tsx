import { BellRing } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications } from "@/lib/local-db";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const notifications = await getNotifications(user?.tenantId ?? "");

  return (
    <>
      <PageHeader title="Notifications" description="In-app alerts for expiry, low stock, dues, and operational events." />
      <section className="space-y-3">
        {notifications.map((notification) => (
          <article key={notification.id} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${notification.severity === "danger" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-med-navy">{notification.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{notification.message}</p>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
