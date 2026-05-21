import { Pill } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function AddMedicineMasterPage() {
  return (
    <ModulePage
      title="Add Medicine"
      description="Medicine master form shell for name, salt, HSN, GST, schedule, and barcode."
      icon={Pill}
      items={[
        { label: "Validation", value: "Zod-ready", hint: "Can share validators with API routes" },
        { label: "Bulk import", value: "CSV path", hint: "Free alternative to paid medicine APIs" },
        { label: "Search", value: "Local", hint: "LIKE search active; FTS can be added" }
      ]}
    />
  );
}
