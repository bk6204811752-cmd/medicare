import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getParties } from "@/lib/stockist-db";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const parties = await getParties(auth.ctx.tenantId);
    return NextResponse.json({ data: parties });
  } catch (error) {
    console.error("Parties GET error:", error);
    return NextResponse.json({ error: "Failed to load parties" }, { status: 500 });
  }
}
