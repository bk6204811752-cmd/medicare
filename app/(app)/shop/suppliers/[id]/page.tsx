import { Building2 } from "lucide-react";
import { notFound } from "next/navigation";
import { ModulePage } from "@/components/module-page";
import { getCurrentUser } from "@/lib/auth";
import { getSuppliers } from "@/lib/local-db";
import { formatCurrency } from "@/lib/utils";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const supplier = (await getSuppliers(user?.tenantId ?? "")).find((item) => item.id === decodeURIComponent(id));
  if (!supplier) notFound();

  return (
    <ModulePage
      title={supplier.name}
      description="Supplier profile and ledger route."
      icon={Building2}
      items={[
        { label: "Phone", value: supplier.phone || "Not set", hint: "Distributor contact" },
        { label: "GSTIN", value: supplier.gstin || "Not set", hint: "Purchase invoices" },
        { label: "Payable", value: formatCurrency(supplier.balancePaisa), hint: `${supplier.creditDays} credit days` },
        { label: "Email", value: supplier.email || "Not set", hint: supplier.address || "No address saved" }
      ]}
    />
  );
}
