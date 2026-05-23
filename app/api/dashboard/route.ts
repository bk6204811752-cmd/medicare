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
    const [summary, trend, notifications] = await Promise.all([
      getSalesSummary(tid),
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
