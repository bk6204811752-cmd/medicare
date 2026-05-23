import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSaleByIdOrInvoice, getTenant } from "@/lib/local-db";
import { BillDetailClient } from "./BillDetailClient";

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const tenantId = user?.tenantId ?? "";
  const [record, tenant] = await Promise.all([
    getSaleByIdOrInvoice(tenantId, decodeURIComponent(id)),
    getTenant(tenantId)
  ]);

  if (!record?.sale) {
    notFound();
  }

  const sale = record.sale as Record<string, unknown>;
  const items = record.items as Record<string, unknown>[];

  return <BillDetailClient sale={sale} items={items} tenant={tenant} />;
}
