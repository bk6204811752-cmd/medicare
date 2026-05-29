import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getAllStockistInventory } from "@/lib/stockist-integration";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const items = await getAllStockistInventory();
    
    // Map items to a safe format for frontend consumption
    const formatted = items.map((item) => ({
      id: item.id,
      tenantId: item.tenantId,
      medicineId: item.medicineId,
      batchNo: item.batchNo,
      mfgDate: item.mfgDate ? item.mfgDate.toISOString() : null,
      expiryDate: item.expiryDate.toISOString(),
      purchaseRatePaisa: item.purchaseRatePaisa,
      mrpPaisa: item.mrpPaisa,
      saleRatePaisa: item.saleRatePaisa,
      gstRate: item.gstRate,
      hsnCode: item.hsnCode,
      quantity: item.quantity,
      medicine: {
        id: item.medicine.id,
        name: item.medicine.name,
        genericName: item.medicine.genericName,
        manufacturer: item.medicine.manufacturer,
        category: item.medicine.category,
        composition: item.medicine.composition,
        packSize: item.medicine.packSize,
        gstRate: item.medicine.gstRate,
        mrpPaisa: item.medicine.mrpPaisa,
      },
      stockist: {
        id: item.tenant.id,
        name: item.tenant.name,
        city: item.tenant.city,
        phone: item.tenant.phone,
      },
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Stockists inventory GET error:", error);
    return NextResponse.json({ error: "Failed to load stockist inventory" }, { status: 500 });
  }
}
