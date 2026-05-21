import { BadgeIndianRupee } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function AdminSubscriptionsPage() {
  return (
    <ModulePage
      title="Subscriptions"
      description="Platform subscription configuration for Free, Basic, Pro, and Enterprise plans."
      icon={BadgeIndianRupee}
      items={[
        { label: "Free", value: "₹0", hint: "500 bills/month" },
        { label: "Basic", value: "₹299", hint: "Razorpay can be added later" },
        { label: "Pro", value: "₹599", hint: "Unlimited billing" }
      ]}
    />
  );
}
