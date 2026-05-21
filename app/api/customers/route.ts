import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { addCustomer, getCustomers } from "@/lib/local-db";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  return NextResponse.json({ data: await getCustomers(auth.ctx.tenantId) });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const customer = await addCustomer(auth.ctx.tenantId, await request.json());
    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save customer" }, { status: 400 });
  }
}
