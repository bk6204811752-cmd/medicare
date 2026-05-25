import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getSalesSummary, getSalesTrend, getNotifications } from "@/lib/local-db";

export const dynamic = "force-dynamic";

/**
 * Combined dashboard endpoint — returns summary + trend + notifications in ONE request.
 * Replaces 3 separate API calls from the dashboard page.
 */
export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  const tid = auth.ctx.tenantId;

  try {
    // Await sales summary sequentially first to let the seeder write and commit,
    // preventing SQLite database lockups during parallel queries.
    const summary = await getSalesSummary(tid);

    const [trend, notifications] = await Promise.all([
      getSalesTrend(tid),
      getNotifications(tid),
    ]);

    return NextResponse.json({ data: { summary, trend, notifications } });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data. Please try again." },
      { status: 500 }
    );
  }
}
