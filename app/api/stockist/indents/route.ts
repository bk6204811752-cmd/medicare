import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/stockist/indents?indentId=<id>
 * 
 * Fetches chemist indent details and items for B2B POS invoice mapping.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const indentId = searchParams.get("indentId")?.trim() ?? "";

  if (!indentId) {
    return NextResponse.json({ error: "Missing indentId parameter" }, { status: 400 });
  }

  try {
    const tid = auth.ctx.tenantId;

    const indent = await prisma.b2BIndent.findFirst({
      where: {
        id: indentId,
        tenantId: tid,
      },
      include: {
        items: true,
      },
    });

    if (!indent) {
      return NextResponse.json({ error: "Indent not found" }, { status: 404 });
    }

    return NextResponse.json({ data: indent });
  } catch (error) {
    console.error("Fetch indent details error:", error);
    return NextResponse.json({ error: "Failed to load indent details" }, { status: 500 });
  }
}
