import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getScheduleHRegister } from "@/lib/local-db";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ data: await getScheduleHRegister(auth.ctx.tenantId) });
  } catch (error) {
    console.error("Schedule-H GET error:", error);
    return NextResponse.json({ error: "Failed to load Schedule H register" }, { status: 500 });
  }
}
