import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { addInventory, addStockAdjustment, getInventoryRows, getStockMovements, getInventoryByMedicine } from "@/lib/local-db";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const medicineId = searchParams.get("medicineId");

    if (medicineId) {
      const data = await getInventoryByMedicine(auth.ctx.tenantId, medicineId);
      return NextResponse.json({ data });
    }

    const data = await getInventoryRows(auth.ctx.tenantId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Inventory GET error:", error);
    return NextResponse.json({ error: "Failed to load inventory" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    if (body.action === "adjust") {
      const result = await addStockAdjustment(auth.ctx.tenantId, body);
      return NextResponse.json({ data: result }, { status: 201 });
    }
    if (body.action === "movements") {
      const data = await getStockMovements(auth.ctx.tenantId);
      return NextResponse.json({ data });
    }
    const item = await addInventory(auth.ctx.tenantId, body);
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    console.error("Inventory POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add stock" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const inventoryId = searchParams.get("id");
    if (!inventoryId) {
      return NextResponse.json({ error: "Inventory item ID is required" }, { status: 400 });
    }
    const tenantId = auth.ctx.tenantId;

    // Verify ownership before deletion
    const item = await prisma.inventoryItem.findFirst({
      where: { id: inventoryId, tenantId },
      select: { id: true, medicineId: true, batchNo: true, quantity: true }
    });
    if (!item) {
      return NextResponse.json({ error: "Inventory item not found or unauthorized" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Log stock movement before delete
      if (item.quantity > 0) {
        await tx.stockMovement.create({
          data: {
            id: `mov-del-${Date.now().toString(36)}`,
            tenantId,
            inventoryId: item.id,
            adjustmentType: "manual_delete",
            quantityDelta: -item.quantity,
            reason: "Batch deleted by user",
          },
        });
      }
      // Soft delete: mark inactive and zero quantity
      await tx.inventoryItem.update({
        where: { id: inventoryId },
        data: { isActive: false, quantity: 0 }
      });
    });

    return NextResponse.json({ success: true, message: "Inventory batch deleted successfully." });
  } catch (error) {
    console.error("Inventory DELETE error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete inventory item" }, { status: 500 });
  }
}
