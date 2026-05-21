import { Settings } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function AdminSettingsPage() {
  return (
    <ModulePage
      title="Platform Settings"
      description="Global GST slabs, feature flags, security, and free-resource configuration."
      icon={Settings}
      items={[
        { label: "GST slabs", value: "0/5/12/18", hint: "Medicine slabs configured" },
        { label: "Storage", value: "Local", hint: "Free-first development mode" },
        { label: "Auth", value: "Next", hint: "Supabase free tier or local credentials" }
      ]}
    />
  );
}
