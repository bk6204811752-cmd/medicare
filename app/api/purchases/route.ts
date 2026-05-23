import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getPurchaseOrders, createPurchaseOrder, receivePurchaseOrder } from "@/lib/local-db";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ data: await getPurchaseOrders(auth.ctx.tenantId) });
  } catch (error) {
    console.error("Purchases GET error:", error);
    return NextResponse.json({ error: "Failed to load purchase orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    if (body.action === "receive") {
      const result = await receivePurchaseOrder(auth.ctx.tenantId, body.poId, body.items);
      return NextResponse.json({ data: result });
    }
    const result = await createPurchaseOrder(auth.ctx.tenantId, body);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("Purchases POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process purchase order" }, { status: 400 });
  }
}
