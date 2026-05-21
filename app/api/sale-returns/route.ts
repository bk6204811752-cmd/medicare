import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getSaleReturns, createSaleReturn } from "@/lib/local-db";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  return NextResponse.json({ data: await getSaleReturns(auth.ctx.tenantId) });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const result = await createSaleReturn(auth.ctx.tenantId, await request.json());
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
