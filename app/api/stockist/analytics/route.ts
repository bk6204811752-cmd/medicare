import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getStockistAnalytics } from "@/lib/stockist-db";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const tid = user.tenantId;
    if (!tid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "from and to date parameters are required" }, { status: 400 });
    }

    const data = await getStockistAnalytics(tid, from, to);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("Analytics API error:", err);
    return NextResponse.json({ error: "Failed to compute analytics" }, { status: 500 });
  }
}
