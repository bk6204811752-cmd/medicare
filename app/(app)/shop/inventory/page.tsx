import Link from "next/link";
import { Plus } from "lucide-react";
import { InventoryTable } from "@/components/inventory-table";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getInventoryRows } from "@/lib/local-db";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  const rows = await getInventoryRows(user?.tenantId ?? "");

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Batch-wise stock list with expiry, GST, rack, supplier, and reorder signals."
        action={
          <Link href="/shop/inventory/add" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-med-green px-4 font-semibold text-white hover:bg-med-greenDark">
            <Plus className="h-4 w-4" /> Add stock
          </Link>
        }
      />
      <InventoryTable rows={rows} />
    </>
  );
}
