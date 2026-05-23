import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getNotifications } from "@/lib/local-db";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ data: await getNotifications(auth.ctx.tenantId) });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
