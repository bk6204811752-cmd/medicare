import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getRegisteredStockists } from "@/lib/stockist-integration";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const stockists = await getRegisteredStockists();
    return NextResponse.json({ data: stockists });
  } catch (error) {
    console.error("Stockists GET error:", error);
    return NextResponse.json({ error: "Failed to load stockists" }, { status: 500 });
  }
}
