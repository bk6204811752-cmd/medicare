import { NextResponse } from "next/server";
import { authenticateApiRequest, requireChemist } from "@/lib/api-auth";
import { getSaleReturns, createSaleReturn } from "@/lib/local-db";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  const chemistErr = requireChemist(auth.ctx);
  if (chemistErr) return chemistErr;
  try {
    return NextResponse.json({ data: await getSaleReturns(auth.ctx.tenantId) });
  } catch (error) {
    console.error("Sale returns GET error:", error);
    return NextResponse.json({ error: "Failed to load sale returns" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  const chemistErr = requireChemist(auth.ctx);
  if (chemistErr) return chemistErr;
  try {
    const result = await createSaleReturn(auth.ctx.tenantId, await request.json());
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("Sale return POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create sale return" }, { status: 400 });
  }
}
