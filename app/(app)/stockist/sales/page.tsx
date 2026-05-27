import { requireUser } from "@/lib/auth";
import { getParties, getSalesmen, getWholesaleInventory } from "@/lib/stockist-db";
import { StockistSalesPos } from "@/components/stockist-sales-pos";
import { PageHeader } from "@/components/page-header";

export default async function SalesPage() {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">No tenant found</div>;

  const [parties, inventory, salesmen] = await Promise.all([
    getParties(tid),
    getWholesaleInventory(tid),
    getSalesmen(tid),
  ]);

  // Map backend types to strict UI models
  const uiParties = parties.map((p) => ({
    id: p.id,
    name: p.name,
    phone: p.phone,
    gstin: p.gstin,
    drugLicenseNo: p.drugLicenseNo,
    creditLimitPaisa: p.creditLimitPaisa,
    outstandingPaisa: p.outstandingPaisa,
    routeId: p.routeId,
  }));

  const uiInventory = inventory.map((i) => ({
    id: i.id,
    batchNo: i.batchNo,
    expiryDate: i.expiryDate.toISOString().slice(0, 10),
    quantity: i.quantity,
    ptrPaisa: i.ptrPaisa,
    saleRatePaisa: i.saleRatePaisa,
    mrpPaisa: i.mrpPaisa,
    rackLocation: i.rackLocation,
    medicine: {
      id: i.medicine.id,
      name: i.medicine.name,
      composition: i.medicine.composition,
      gstRate: i.medicine.gstRate,
    },
  }));

  const uiSalesmen = salesmen.map((s) => ({
    id: s.id,
    name: s.name,
    routeIds: s.routes.map((r) => r.routeId),
  }));

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="B2B POS & Invoice Booking"
        description="Fast offline-ready B2B direct billing and drug order booking console"
      />
      <StockistSalesPos
        parties={uiParties}
        inventory={uiInventory}
        salesmen={uiSalesmen}
      />
    </div>
  );
}
