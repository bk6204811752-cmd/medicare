import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { searchDrugMaster, searchFallbackDatabase } from "@/lib/drug-master";

/**
 * GET /api/drug-master/search?q=<query>
 *
 * Server-side proxy to Drug Master API + fallback database.
 * Returns unified medicine suggestions with source badges.
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
    const results = await searchDrugMaster(q);
    const source = results.length > 0
      ? results.some(r => r.source === "api")
        ? results.some(r => r.source === "fallback") ? "mixed" : "api"
        : "fallback"
      : "none";

    return NextResponse.json(
      { data: results, source },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      }
    );
  } catch (error) {
    console.error("Drug Master search error:", error);
    // Graceful fallback: return offline results
    const fallback = searchFallbackDatabase(q);
    return NextResponse.json({ data: fallback, source: "fallback" });
  }
}
