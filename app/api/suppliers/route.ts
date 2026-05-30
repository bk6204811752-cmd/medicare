import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { addSupplier, getSuppliers } from "@/lib/local-db";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ data: await getSuppliers(auth.ctx.tenantId) });
  } catch (error) {
    console.error("Suppliers GET error:", error);
    return NextResponse.json({ error: "Failed to load suppliers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const tenantId = auth.ctx.tenantId;

    // Deduplication: if no ID provided and name matches existing, return existing
    if (!body.id && body.name) {
      const existing = await prisma.supplier.findFirst({
        where: {
          tenantId,
          name: { equals: body.name.trim(), mode: "insensitive" },
          isActive: true,
        },
      });
      if (existing) {
        return NextResponse.json({ data: existing });
      }
    }

    const supplier = await addSupplier(tenantId, body);
    return NextResponse.json({ data: supplier }, { status: 201 });
  } catch (error) {
    console.error("Suppliers POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save supplier" }, { status: 400 });
  }
}
