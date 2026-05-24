import { notFound } from "next/navigation";
import { SupplierDashboardClient } from "@/components/supplier-dashboard-client";
import { getCurrentUser } from "@/lib/auth";
import { getSuppliers, getSupplierSupplyHistory } from "@/lib/local-db";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const tenantId = user?.tenantId ?? "";

  const [suppliersList, history] = await Promise.all([
    getSuppliers(tenantId),
    getSupplierSupplyHistory(tenantId, decodeURIComponent(id))
  ]);

  const supplier = suppliersList.find((item) => item.id === decodeURIComponent(id));
  if (!supplier) notFound();

  return (
    <SupplierDashboardClient
      supplier={supplier}
      history={history}
    />
  );
}
