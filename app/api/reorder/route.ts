import { NextResponse } from "next/server";
import { authenticateApiRequest, requireChemist } from "@/lib/api-auth";
import { getReorderSuggestions } from "@/lib/smart-reorder";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  const chemistErr = requireChemist(auth.ctx);
  if (chemistErr) return chemistErr;

  try {
    const data = await getReorderSuggestions(auth.ctx.tenantId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Smart Reorder GET error:", error);
    return NextResponse.json(
      { error: "Failed to calculate reorder suggestions" },
      { status: 500 }
    );
  }
}
