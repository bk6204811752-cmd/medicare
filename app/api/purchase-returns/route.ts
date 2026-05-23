import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getPurchaseReturns, createPurchaseReturn } from "@/lib/local-db";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ data: await getPurchaseReturns(auth.ctx.tenantId) });
  } catch (error) {
    console.error("Purchase returns GET error:", error);
    return NextResponse.json({ error: "Failed to load purchase returns" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const result = await createPurchaseReturn(auth.ctx.tenantId, await request.json());
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("Purchase return POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create purchase return" }, { status: 400 });
  }
}
