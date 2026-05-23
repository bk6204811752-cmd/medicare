import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { searchInventory } from "@/lib/local-db";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.toLowerCase() ?? "";
    const rows = q.length >= 2 ? await searchInventory(auth.ctx.tenantId, q) : [];
    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("Medicine search API error:", error);
    return NextResponse.json(
      { error: "Medicine search failed. Please try again." },
      { status: 500 }
    );
  }
}
