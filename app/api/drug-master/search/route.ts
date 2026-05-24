import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { searchMedicineDatabase } from "@/lib/medicine-db";

/**
 * GET /api/drug-master/search?q=<query>
 *
 * Searches the local 246K Indian Medicine Database (loaded from CSV).
 * Returns medicine suggestions with full details for auto-fill.
 * Completely local — no external API calls.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ data: [], source: "none" });
  }

  try {
    const results = searchMedicineDatabase(q);
    return NextResponse.json({
      data: results,
      source: results.length > 0 ? "local" : "none",
    });
  } catch (error) {
    console.error("Medicine database search error:", error);
    return NextResponse.json({ data: [], source: "none" });
  }
}
