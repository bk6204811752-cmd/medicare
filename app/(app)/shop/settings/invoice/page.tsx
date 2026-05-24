import { ReceiptText } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function InvoiceSettingsPage() {
  return (
    <ModulePage
      title="Invoice Settings"
      description="Invoice prefix, numbering, terms, footer, and print layout controls."
      icon={ReceiptText}
      hideHeader={true}
      items={[
        { label: "Prefix", value: "MED", hint: "MED-[YEAR]-[6DIGIT]" },
        { label: "Print modes", value: "A4 / Thermal", hint: "A4 detail page is active" },
        { label: "WhatsApp", value: "Free link", hint: "Uses wa.me without paid API" }
      ]}
    />
  );
}
