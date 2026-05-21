import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { ModulePage } from "@/components/module-page";
import { getTenant, getAllTenants } from "@/lib/local-db";

export default async function AdminShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let tenant;
  try {
    tenant = await getTenant(decodeURIComponent(id));
  } catch {
    notFound();
  }

  return (
    <ModulePage
      title={tenant.name}
      description="Super admin tenant detail and override page."
      icon={Building2}
      items={[
        { label: "Owner", value: tenant.ownerName ?? "Not set", hint: tenant.phone },
        { label: "GSTIN", value: tenant.gstin ?? "Not set", hint: `DL ${tenant.drugLicenseNo}` },
        { label: "Status", value: tenant.approvalStatus, hint: tenant.isActive ? "Active" : "Inactive" },
        { label: "Plan", value: tenant.plan, hint: `${tenant.city ?? ""} ${tenant.state ?? ""}` }
      ]}
    />
  );
}
