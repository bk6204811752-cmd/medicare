import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { searchInventory } from "@/lib/local-db";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const rows = q.length >= 2 ? await searchInventory(auth.ctx.tenantId, q) : [];
  return NextResponse.json({ data: rows });
}
