import { Users } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function StaffSettingsPage() {
  return (
    <ModulePage
      title="Staff Management"
      description="Role-based access model for shop admin, staff, and pharmacist users."
      icon={Users}
      hideHeader={true}
      items={[
        { label: "Shop admin", value: "1", hint: "Full permissions" },
        { label: "Staff role", value: "Ready", hint: "Billing-only permission model" },
        { label: "Pharmacist role", value: "Ready", hint: "Prescription and compliance access" }
      ]}
    />
  );
}
