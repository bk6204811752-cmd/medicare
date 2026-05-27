import { AlertTriangle, Box, ChevronRight, HelpCircle, MapPin, Package, ShieldAlert, ShieldCheck, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { getWholesaleInventory } from "@/lib/stockist-db";
import { VirtualTransferForm } from "@/components/virtual-transfer-form";
import { StockistInventoryTable } from "@/components/stockist-inventory-table";
import Link from "next/link";

export default async function InventoryPage() {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">No tenant found</div>;

  const inventory = await getWholesaleInventory(tid);

  const uiInventory = inventory.map((i) => ({
    id: i.id,
    batchNo: i.batchNo,
    expiryDate: i.expiryDate,
    purchaseRatePaisa: i.purchaseRatePaisa,
    ptrPaisa: i.ptrPaisa,
    ptsPaisa: i.ptsPaisa,
    mrpPaisa: i.mrpPaisa,
    quantity: i.quantity,
    reorderLevel: i.reorderLevel,
    rackLocation: i.rackLocation,
    medicine: {
      id: i.medicine.id,
      name: i.medicine.name,
      composition: i.medicine.composition,
      category: i.medicine.category,
      manufacturer: i.medicine.manufacturer,
      barcode: i.medicine.barcode,
      packSize: i.medicine.packSize,
      gstRate: i.medicine.gstRate,
    },
    supplier: i.supplier ? {
      id: i.supplier.id,
      name: i.supplier.name,
    } : null,
  }));

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="Distribution Inventory"
        description="Monitor wholesale drug stocks, edit PTR/PTS pricing matrices, and inspect FEFO picking sequences"
        action={
          <Link
            href="/stockist/inventory/add"
            className="inline-flex items-center gap-2 rounded-lg bg-med-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-med-greenDark transition-colors"
          >
            <Plus className="h-4 w-4" /> Purchase Entry / Add Stock
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] min-w-0 w-full">
        {/* Dynamic client-side searchable distribution inventory */}
        <div className="min-w-0 w-full">
          <StockistInventoryTable rows={uiInventory} />
        </div>

        {/* virtual stock transfer & help sidebar */}
        <div className="space-y-6">
          
          {/* Stock Transfer */}
          <VirtualTransferForm inventory={inventory} />

          {/* Pricing matrix guide */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-4 space-y-2.5">
            <h3 className="font-display font-bold text-sky-950 text-sm flex items-center gap-1.5">
              <HelpCircle className="h-4.5 w-4.5 text-sky-600" /> B2B Price Matrix Dictionary
            </h3>
            <p className="text-xs text-sky-900 leading-normal">
              Wholesaler operations utilize specialized pricing. Here is the layout:
            </p>
            <div className="text-[11px] space-y-1.5 text-sky-800">
              <p>• <strong className="font-bold text-sky-950">PTS (Price to Stockist):</strong> Your purchase cost from manufacturers/CFAs.</p>
              <p>• <strong className="font-bold text-sky-950">PTR (Price to Retailer):</strong> The standard sale rate you charge chemist shops (defaults to B2B Billing rate).</p>
              <p>• <strong className="font-bold text-sky-950">Special Rate:</strong> Customizable discount rates assigned to key distributor accounts.</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
