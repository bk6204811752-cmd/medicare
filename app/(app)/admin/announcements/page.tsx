import { Megaphone } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function AdminAnnouncementsPage() {
  return (
    <ModulePage
      title="Announcements"
      description="Platform maintenance and broadcast notifications."
      icon={Megaphone}
      items={[
        { label: "Channels", value: "In-app", hint: "Free now; WhatsApp/SMS later" },
        { label: "Drafts", value: "0", hint: "Ready for persistence" },
        { label: "Audience", value: "All shops", hint: "Tenant broadcast model" }
      ]}
    />
  );
}
