import { FileImage } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function PrescriptionsPage() {
  return (
    <ModulePage
      title="Prescription Archive"
      description="Prescription metadata is already enforced in billing for Schedule H/H1. Image upload can be added through free local storage or Supabase Storage later."
      icon={FileImage}
      items={[
        { label: "POS enforcement", value: "Active", hint: "Doctor and Rx number required for controlled medicines" },
        { label: "Image storage", value: "Next", hint: "Local upload first, Supabase Storage later" },
        { label: "Register link", value: "Ready", hint: "Schedule H rows retain prescription numbers" }
      ]}
    />
  );
}
