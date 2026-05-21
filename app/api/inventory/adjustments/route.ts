import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { addStockAdjustment, getStockMovements } from "@/lib/local-db";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  return NextResponse.json({ data: await getStockMovements(auth.ctx.tenantId) });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const result = await addStockAdjustment(auth.ctx.tenantId, await request.json());
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save stock adjustment" }, { status: 400 });
  }
}
