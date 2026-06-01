import { NextResponse } from "next/server";
import { authenticateApiRequest, requireChemist } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  const chemistErr = requireChemist(auth.ctx);
  if (chemistErr) return chemistErr;

  try {
    const tenantId = auth.ctx.tenantId;
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    // 1. Fetch all inventory items expiring in the next 60 days or already expired
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        quantity: { gt: 0 },
        expiryDate: { lte: sixtyDaysFromNow },
        isActive: true,
      },
      include: {
        medicine: true,
        supplier: true,
      },
      orderBy: {
        expiryDate: "asc",
      },
    });

    const data = inventoryItems.map((item) => {
      const riskValuePaisa = item.quantity * item.purchaseRatePaisa;
      const diffMs = item.expiryDate.getTime() - new Date().getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return {
        inventoryId: item.id,
        medicineName: item.medicine.name,
        genericName: item.medicine.genericName,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate.toISOString(),
        quantity: item.quantity,
        purchaseRatePaisa: item.purchaseRatePaisa,
        riskValuePaisa,
        supplierId: item.supplierId,
        supplierName: item.supplier?.name || "Local Wholesaler",
        daysRemaining,
        isExpired: daysRemaining <= 0,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Expiry Returns GET error:", error);
    return NextResponse.json(
      { error: "Failed to compile expiry auto-returns report" },
      { status: 500 }
    );
  }
}
