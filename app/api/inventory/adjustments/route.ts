import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { addStockAdjustment, getStockMovements } from "@/lib/local-db";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ data: await getStockMovements(auth.ctx.tenantId) });
  } catch (error) {
    console.error("Stock adjustments GET error:", error);
    return NextResponse.json({ error: "Failed to load stock movements" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const result = await addStockAdjustment(auth.ctx.tenantId, await request.json());
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("Stock adjustment POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save stock adjustment" }, { status: 400 });
  }
}
