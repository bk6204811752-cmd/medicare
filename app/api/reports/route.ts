import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getSalesSummary, getSalesTrend, getProfitReport, getExpiryReport, getSlowMovingReport } from "@/lib/local-db";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "summary";
  const tid = auth.ctx.tenantId;

  try {
    switch (type) {
      case "summary":
        return NextResponse.json({ data: await getSalesSummary(tid) });
      case "trend":
        return NextResponse.json({ data: await getSalesTrend(tid) });
      case "profit":
        return NextResponse.json({ data: await getProfitReport(tid) });
      case "expiry":
        return NextResponse.json({ data: await getExpiryReport(tid) });
      case "slow-moving":
        return NextResponse.json({ data: await getSlowMovingReport(tid) });
      default:
        return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
