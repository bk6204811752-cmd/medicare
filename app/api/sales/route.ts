import { NextResponse } from "next/server";
import { authenticateApiRequest, requireChemist } from "@/lib/api-auth";
import { createSale, getSales, getSaleByIdOrInvoice } from "@/lib/local-db";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  const chemistErr = requireChemist(auth.ctx);
  if (chemistErr) return chemistErr;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) {
      const data = await getSaleByIdOrInvoice(auth.ctx.tenantId, id);
      return NextResponse.json({ data });
    }
    const data = await getSales(auth.ctx.tenantId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Sales GET error:", error);
    return NextResponse.json({ error: "Failed to load sales" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  const chemistErr = requireChemist(auth.ctx);
  if (chemistErr) return chemistErr;
  try {
    const sale = await createSale(auth.ctx.tenantId, await request.json());
    return NextResponse.json({ data: sale }, { status: 201 });
  } catch (error) {
    console.error("Sales POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save bill" }, { status: 400 });
  }
}
