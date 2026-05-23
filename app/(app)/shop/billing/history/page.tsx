import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getSalesWithItems, getTenant } from "@/lib/local-db";
import { BillingHistoryClient } from "@/components/billing-history-client";

export default async function BillingHistoryPage() {
  const user = await getCurrentUser();
  const tenantId = user?.tenantId ?? "";
  const [sales, tenant] = await Promise.all([
    getSalesWithItems(tenantId),
    getTenant(tenantId)
  ]);

  return (
    <>
      <PageHeader
        title="Bill & Daily Sales History"
        description="Search, view, analyze and export detailed daily sales transactions and medicine-wise performance."
      />
      <BillingHistoryClient
        initialSales={sales as any}
        tenantName={tenant?.name ?? "Medicare"}
      />
    </>
  );
}
