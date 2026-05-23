import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { quickAddMedicineWithStock } from "@/lib/local-db";

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const result = await quickAddMedicineWithStock(auth.ctx.tenantId, body);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("Quick add medicine error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add medicine" },
      { status: 400 }
    );
  }
}
