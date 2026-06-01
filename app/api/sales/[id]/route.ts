import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getSaleByIdOrInvoice } from "@/lib/local-db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const sale = await getSaleByIdOrInvoice(auth.ctx.tenantId, decodeURIComponent(id));

    if (!sale || !sale.sale) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }


    return NextResponse.json({ data: sale });
  } catch (error) {
    console.error("Sale detail GET error:", error);
    return NextResponse.json({ error: "Failed to load invoice details" }, { status: 500 });
  }
}
