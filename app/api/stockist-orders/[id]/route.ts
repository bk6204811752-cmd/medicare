import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import {
  acceptOrder,
  rejectOrder,
  confirmDelivery,
} from "@/lib/stockist-integration";

export const dynamic = "force-dynamic";

// PATCH — Stockist actions: accept | reject | confirm_delivery
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  const orderId = params.id;
  const tenantId = auth.ctx.tenantId;

  try {
    const body = await req.json();
    const { action, otp, reason } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    switch (action) {
      case "accept": {
        const result = await acceptOrder(orderId, tenantId);
        return NextResponse.json({ data: result });
      }
      case "reject": {
        const result = await rejectOrder(orderId, tenantId, reason);
        return NextResponse.json({ data: result });
      }
      case "confirm_delivery": {
        if (!otp) {
          return NextResponse.json({ error: "OTP is required to confirm delivery" }, { status: 400 });
        }
        const result = await confirmDelivery(orderId, String(otp), tenantId);
        return NextResponse.json({ data: result });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("StockistOrder PATCH error:", error);
    const msg = error instanceof Error ? error.message : "Action failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
