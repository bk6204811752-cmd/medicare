import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getCustomerPurchases } from "@/lib/local-db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const data = await getCustomerPurchases(auth.ctx.tenantId, id);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Customer purchases GET error:", error);
    return NextResponse.json({ error: "Failed to load purchase history" }, { status: 500 });
  }
}
