import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getSupplierSupplyHistory } from "@/lib/local-db";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  
  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get("supplierId");
  if (!supplierId) {
    return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
  }

  try {
    const history = await getSupplierSupplyHistory(auth.ctx.tenantId, supplierId);
    return NextResponse.json({ data: history });
  } catch (error) {
    console.error("Supplier history GET error:", error);
    return NextResponse.json({ error: "Failed to load supplier history" }, { status: 500 });
  }
}
