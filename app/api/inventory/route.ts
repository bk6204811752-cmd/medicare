import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { addInventory, addStockAdjustment, getInventoryRows, getStockMovements } from "@/lib/local-db";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  const data = await getInventoryRows(auth.ctx.tenantId);
  return NextResponse.json({ data });
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add stock" }, { status: 400 });
  }
}
