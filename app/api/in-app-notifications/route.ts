import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import {
  getInAppNotifications,
  markInAppNotificationsRead,
} from "@/lib/stockist-integration";

export const dynamic = "force-dynamic";

// GET — fetch in-app notifications for the current tenant
export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const notifs = await getInAppNotifications(auth.ctx.tenantId);
    return NextResponse.json({ data: notifs });
  } catch (error) {
    console.error("InAppNotifications GET error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

// PATCH — mark notifications as read
export async function PATCH(req: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    const { ids } = body; // optional: specific IDs, else mark all read
    await markInAppNotificationsRead(auth.ctx.tenantId, ids);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("InAppNotifications PATCH error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
