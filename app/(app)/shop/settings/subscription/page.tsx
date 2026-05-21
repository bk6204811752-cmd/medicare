import { BadgeIndianRupee } from "lucide-react";
import { ModulePage } from "@/components/module-page";
import { requireUser } from "@/lib/auth";
import { getTenant } from "@/lib/local-db";

export default async function SubscriptionSettingsPage() {
  const user = await requireUser();
  const tenant = await getTenant(user.tenantId ?? "");

  return (
    <ModulePage
      title="Subscription"
      description="Free-first subscription controls for the beta build."
      icon={BadgeIndianRupee}
      items={[
        { label: "Current plan", value: tenant.plan.toUpperCase(), hint: "No payment gateway required" },
        { label: "Bills/month", value: "500", hint: "Free plan soft limit" },
        { label: "Upgrade path", value: "Razorpay later", hint: "Paid integration intentionally deferred" }
      ]}
    />
  );
}
