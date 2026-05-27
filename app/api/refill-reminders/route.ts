import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getRefillReminders } from "@/lib/refill-reminders";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const data = await getRefillReminders(auth.ctx.tenantId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Refill Reminders GET error:", error);
    return NextResponse.json(
      { error: "Failed to query refill reminders" },
      { status: 500 }
    );
  }
}
