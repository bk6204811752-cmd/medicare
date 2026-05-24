import { Boxes } from "lucide-react";
import { notFound } from "next/navigation";
import { ModulePage } from "@/components/module-page";
import { getCurrentUser } from "@/lib/auth";
import { getInventoryRows } from "@/lib/local-db";
import { formatCurrency, formatDate, parseUnitsPerPack } from "@/lib/utils";

export default async function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const item = (await getInventoryRows(user?.tenantId ?? "")).find((row) => row.id === decodeURIComponent(id));
  if (!item) notFound();

  const unitsPerPack = parseUnitsPerPack(item.medicine.packSize);
  const packs = Math.floor(item.quantity / unitsPerPack);
  const loose = item.quantity % unitsPerPack;
  const packsDisplay = loose > 0 
    ? `${packs} pack${packs !== 1 ? "s" : ""} + ${loose} loose unit${loose !== 1 ? "s" : ""}` 
    : `${packs} pack${packs !== 1 ? "s" : ""}`;

  return (
    <ModulePage
      title={item.medicine.name}
      description="Batch-level inventory detail route."
      icon={Boxes}
      items={[
        { label: "Batch", value: item.batchNo, hint: `Expires ${formatDate(item.expiryDate)}` },
        { label: "Packs", value: packsDisplay, hint: item.medicine.packSize ?? "1 unit/pack" },
        { label: "Stock", value: `${item.quantity} units`, hint: `Reorder at ${item.reorderLevel}` },
        { label: "Sale rate", value: formatCurrency(item.saleRatePaisa), hint: item.rackLocation ?? "No rack set" },
        { label: "Supplier", value: item.supplier?.name ?? "Unassigned", hint: item.supplier?.phone ?? "" },
        { label: "GST", value: `${item.gstRate}%`, hint: item.hsnCode ?? item.medicine.hsnCode ?? "" }
      ]}
    />
  );
}
