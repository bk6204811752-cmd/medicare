import { NextResponse } from "next/server";
import { authenticateApiRequest, requireStockist } from "@/lib/api-auth";
import { createB2BSale } from "@/lib/stockist-db";

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  const stockistErr = requireStockist(auth.ctx);
  if (stockistErr) return stockistErr;

  try {
    const payload = await request.json();
    const sale = await createB2BSale(auth.ctx.tenantId, payload);
    return NextResponse.json({ success: true, data: sale }, { status: 201 });
  } catch (error) {
    console.error("Stockist Sales POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save wholesale bill" }, { status: 400 });
  }
}
