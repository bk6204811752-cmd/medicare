import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PrescriptionArchiveClient } from "./PrescriptionArchiveClient";

export default async function PrescriptionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prescription Archive"
        description="Upload and manage doctor prescriptions for Schedule H/H1 medicines. Maintain legal records for compliance."
      />
      <PrescriptionArchiveClient />
    </div>
  );
}
