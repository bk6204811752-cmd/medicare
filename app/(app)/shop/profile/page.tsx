import { getCurrentUser } from "@/lib/auth";
import { getTenant } from "@/lib/local-db";
import { redirect } from "next/navigation";
import { ProfileDashboardClient } from "./ProfileDashboardClient";
import { PageHeader } from "@/components/page-header";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tenant = await getTenant(user.tenantId ?? "");

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="View your account details, manage personal contact info, and keep your shop credentials secure."
      />
      <ProfileDashboardClient user={user} tenant={tenant || {}} />
    </div>
  );
}
