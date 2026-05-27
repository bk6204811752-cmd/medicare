import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const tenantId = auth.ctx.tenantId;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // 1. Fetch all inventory items in stock (>10 quantity)
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        quantity: { gt: 10 },
        isActive: true,
      },
      include: {
        medicine: true,
        supplier: true,
      },
    });

    if (inventoryItems.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 2. Fetch sales items in the last 90 days
    const recentSales = await prisma.saleItem.findMany({
      where: {
        tenantId,
        sale: {
          createdAt: { gte: ninetyDaysAgo },
        },
      },
      select: {
        inventoryItemId: true,
      },
    });

    const activeInventoryIds = new Set(recentSales.map((item) => item.inventoryItemId));

    // 3. Filter for inventory items that have ZERO sales in the last 90 days
    const deadStockItems = inventoryItems.filter(
      (item) => !activeInventoryIds.has(item.id)
    );

    const data = deadStockItems.map((item) => {
      const riskValuePaisa = item.quantity * item.purchaseRatePaisa;
      const daysSinceCreated = Math.ceil(
        (new Date().getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        inventoryId: item.id,
        medicineName: item.medicine.name,
        genericName: item.medicine.genericName,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate,
        quantity: item.quantity,
        purchaseRatePaisa: item.purchaseRatePaisa,
        riskValuePaisa,
        supplierId: item.supplierId,
        supplierName: item.supplier?.name || "Local Wholesaler",
        daysInStock: Math.max(90, daysSinceCreated), // at least 90 days since it has no sales in 90 days
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Dead Stock GET error:", error);
    return NextResponse.json(
      { error: "Failed to compile dead stock audit report" },
      { status: 500 }
    );
  }
}
