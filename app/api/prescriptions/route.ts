import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const prescriptions = await prisma.prescriptionImage.findMany({
      where: { tenantId: auth.ctx.tenantId },
      orderBy: { uploadedAt: "desc" },
      include: {
        sale: {
          select: { id: true, invoiceNo: true },
        },
      },
    });

    return NextResponse.json({ data: prescriptions });
  } catch (error) {
    console.error("Prescriptions GET error:", error);
    return NextResponse.json(
      { error: "Failed to load prescriptions." },
      { status: 500 }
    );
  }
}
