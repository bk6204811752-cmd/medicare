import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { addInventory, addStockAdjustment, getInventoryRows, getStockMovements, getInventoryByMedicine } from "@/lib/local-db";

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
