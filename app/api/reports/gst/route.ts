import { NextResponse } from "next/server";
import { authenticateApiRequest, requireChemist } from "@/lib/api-auth";
import { getGstReport } from "@/lib/local-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  const chemistErr = requireChemist(auth.ctx);
  if (chemistErr) return chemistErr;
  try {
    return NextResponse.json({ data: await getGstReport(auth.ctx.tenantId) });
  } catch (error) {
    console.error("GST report GET error:", error);
    return NextResponse.json({ error: "Failed to generate GST report" }, { status: 500 });
  }
}
