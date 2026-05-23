import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCustomer, getCustomerPurchases, getTenant } from "@/lib/local-db";
import { CustomerDashboardClient } from "@/components/customer-dashboard-client";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const tenantId = user?.tenantId ?? "";

  const [customer, purchases, tenant] = await Promise.all([
    getCustomer(tenantId, decodeURIComponent(id)),
    getCustomerPurchases(tenantId, decodeURIComponent(id)),
    getTenant(tenantId)
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <CustomerDashboardClient
      customer={customer}
      purchases={purchases as any}
      tenantName={tenant?.name ?? "Medicare"}
    />
  );
}
