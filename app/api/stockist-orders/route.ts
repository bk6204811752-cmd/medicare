import { NextResponse } from "next/server";
import { authenticateApiRequest, requireChemist } from "@/lib/api-auth";
import {
  createStockistOrder,
  getStockistOrdersForChemist,
} from "@/lib/stockist-integration";

export const dynamic = "force-dynamic";

// GET — Chemist fetches their own orders
export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  const chemistErr = requireChemist(auth.ctx);
  if (chemistErr) return chemistErr;
  try {
    const orders = await getStockistOrdersForChemist(auth.ctx.tenantId);
    // Sanitize OTP from chemist-side list (only show via notification)
    const safe = (orders as any[]).map((o) => ({
      ...o,
      otp: undefined,
      orderDate: o.orderDate.toISOString(),
      otpExpiresAt: o.otpExpiresAt?.toISOString() ?? null,
      otpVerifiedAt: o.otpVerifiedAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));
    return NextResponse.json({ data: safe });
  } catch (error) {
    console.error("StockistOrders GET error:", error);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}

// POST — Chemist places a new order
export async function POST(req: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  const chemistErr = requireChemist(auth.ctx);
  if (chemistErr) return chemistErr;

  try {
    const body = await req.json();
    const { stockistTenantId, notes, items } = body;

    if (!stockistTenantId) {
      return NextResponse.json({ error: "Stockist is required" }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }
    for (const item of items) {
      if (!item.medicineName || !item.quantity || Number(item.quantity) < 1) {
        return NextResponse.json({ error: "All items must have a medicine name and valid quantity" }, { status: 400 });
      }
    }

    const order = await createStockistOrder(auth.ctx.tenantId, {
      stockistTenantId,
      notes,
      items: items.map((i: any) => ({
        medicineName: String(i.medicineName),
        quantity: Number(i.quantity),
        ratePaisa: i.ratePaisa ? Math.round(Number(i.ratePaisa) * 100) : 0,
      })),
    });

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    console.error("StockistOrders POST error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create order";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
