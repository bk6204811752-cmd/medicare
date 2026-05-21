import { Boxes } from "lucide-react";
import { notFound } from "next/navigation";
import { ModulePage } from "@/components/module-page";
import { requireUser } from "@/lib/auth";
import { getInventoryRows } from "@/lib/local-db";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const item = (await getInventoryRows(user.tenantId ?? "")).find((row) => row.id === decodeURIComponent(id));
  if (!item) notFound();

  return (
    <ModulePage
      title={item.medicine.name}
      description="Batch-level inventory detail route."
      icon={Boxes}
      items={[
        { label: "Batch", value: item.batchNo, hint: `Expires ${formatDate(item.expiryDate)}` },
        { label: "Stock", value: String(item.quantity), hint: `Reorder at ${item.reorderLevel}` },
        { label: "Sale rate", value: formatCurrency(item.saleRatePaisa), hint: item.rackLocation ?? "No rack set" },
        { label: "Supplier", value: item.supplier?.name ?? "Unassigned", hint: item.supplier?.phone ?? "" },
        { label: "GST", value: `${item.gstRate}%`, hint: item.hsnCode ?? item.medicine.hsnCode ?? "" }
      ]}
    />
  );
}
