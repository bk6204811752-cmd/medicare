import Link from "next/link";
import { History } from "lucide-react";
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
    address: p.address,
  }));

  const uiInventory = inventory.map((i) => ({
    id: i.id,
    batchNo: i.batchNo,
    mfgDate: i.mfgDate ? i.mfgDate.toISOString().slice(0, 10) : null,
    expiryDate: i.expiryDate.toISOString().slice(0, 10),
    quantity: i.quantity,
    ptrPaisa: i.ptrPaisa,
    saleRatePaisa: i.saleRatePaisa,
    mrpPaisa: i.mrpPaisa,
    hsnCode: i.hsnCode || "",
    rackLocation: i.rackLocation,
    medicine: {
      id: i.medicine.id,
      name: i.medicine.name,
      composition: i.medicine.composition,
      gstRate: i.medicine.gstRate,
      manufacturer: i.medicine.manufacturer || "",
      packSize: i.medicine.packSize || "",
      hsnCode: i.medicine.hsnCode || "",
    },
  }));

  const uiSalesmen = salesmen.map((s) => ({
    id: s.id,
    name: s.name,
    routeIds: s.routes.map((r) => r.routeId),
  }));

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="no-print">
        <PageHeader
          title="B2B POS & Invoice Booking"
          description="Fast offline-ready B2B direct billing and drug order booking console"
          action={
            <Link href="/stockist/sales/history" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all">
              <History className="h-4 w-4 text-slate-500" />
              Sales History
            </Link>
          }
        />
      </div>
      <StockistSalesPos
        parties={uiParties}
        inventory={uiInventory}
        salesmen={uiSalesmen}
      />
    </div>
  );
}
