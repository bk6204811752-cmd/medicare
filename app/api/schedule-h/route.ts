import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getScheduleHRegister } from "@/lib/local-db";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  return NextResponse.json({ data: await getScheduleHRegister(auth.ctx.tenantId) });
}
