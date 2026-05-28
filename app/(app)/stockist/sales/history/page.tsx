import { requireUser } from "@/lib/auth";
import { getB2BSalesWithItems, getSalesmen } from "@/lib/stockist-db";
import { getTenant } from "@/lib/local-db";
import { PageHeader } from "@/components/page-header";
import { B2BBillingHistoryClient } from "@/components/b2b-billing-history-client";

export default async function B2BBillingHistoryPage() {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) return <div className="p-8 text-center text-red-600 font-semibold">No tenant found</div>;

  // Fetch B2B Invoices, Tenant settings, and Salesmen in parallel
  const [sales, tenant, salesmen] = await Promise.all([
    getB2BSalesWithItems(tid),
    getTenant(tid),
    getSalesmen(tid),
  ]);

  // Map database models to clean UI-friendly properties (converting Dates to ISO strings)
  const uiSales = sales.map((sale) => ({
    id: sale.id,
    invoiceNo: sale.invoiceNo,
    invoiceDate: sale.invoiceDate.toISOString(),
    partyId: sale.partyId,
    party: {
      id: sale.party.id,
      name: sale.party.name,
      phone: sale.party.phone,
      email: sale.party.email,
      address: sale.party.address,
      gstin: sale.party.gstin,
      drugLicenseNo: sale.party.drugLicenseNo,
    },
    salesmanId: sale.salesmanId,
    paymentMode: sale.paymentMode,
    subtotalPaisa: sale.subtotalPaisa,
    discountPaisa: sale.discountPaisa,
    taxablePaisa: sale.taxablePaisa,
    gstPaisa: sale.gstPaisa,
    roundOffPaisa: sale.roundOffPaisa,
    totalPaisa: sale.totalPaisa,
    amountPaidPaisa: sale.amountPaidPaisa,
    amountDuePaisa: sale.amountDuePaisa,
    status: sale.status,
    invoiceType: sale.invoiceType,
    notes: sale.notes,
    createdAt: sale.createdAt.toISOString(),
    items: sale.items.map((item) => ({
      id: item.id,
      medicineName: item.medicineName,
      batchNo: item.batchNo,
      expiryDate: item.expiryDate.toISOString().slice(0, 10),
      quantity: item.quantity,
      freeQuantity: item.freeQuantity,
      mrpPaisa: item.mrpPaisa,
      saleRatePaisa: item.saleRatePaisa,
      discountPercent: item.discountPercent,
      gstRate: item.gstRate,
      gstPaisa: item.gstPaisa,
      taxablePaisa: item.taxablePaisa,
      totalPaisa: item.totalPaisa,
      schemeDetails: item.schemeDetails,
    })),
  }));

  const uiSalesmen = salesmen.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  const uiTenant = tenant ? {
    id: tenant.id,
    name: tenant.name,
    phone: tenant.phone,
    email: tenant.email,
    address: tenant.address ?? null,
    gstin: tenant.gstin,
    drugLicenseNo: tenant.drugLicenseNo,
  } : null;

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="B2B Invoice & Challan History"
          description="Track, search, expand, analyze, and print detailed wholesale B2B billing transactions."
        />
      </div>
      <B2BBillingHistoryClient
        initialSales={uiSales as any}
        tenant={uiTenant}
        salesmen={uiSalesmen}
      />
    </>
  );
}
