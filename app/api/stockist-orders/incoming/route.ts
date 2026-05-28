import { NextResponse } from "next/server";
import { authenticateApiRequest, requireStockist } from "@/lib/api-auth";
import { getIncomingOrdersForStockist } from "@/lib/stockist-integration";

export const dynamic = "force-dynamic";

// GET — Stockist sees all incoming chemist orders
export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  const stockistErr = requireStockist(auth.ctx);
  if (stockistErr) return stockistErr;

  try {
    const orders = await getIncomingOrdersForStockist(auth.ctx.tenantId);
    const safe = (orders as any[]).map((o) => ({
      ...o,
      otp: undefined, // never send OTP to front end via list
      orderDate: o.orderDate.toISOString(),
      otpExpiresAt: o.otpExpiresAt?.toISOString() ?? null,
      otpVerifiedAt: o.otpVerifiedAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));
    return NextResponse.json({ data: safe });
  } catch (error) {
    console.error("IncomingOrders GET error:", error);
    return NextResponse.json({ error: "Failed to load incoming orders" }, { status: 500 });
  }
}
