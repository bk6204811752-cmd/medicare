import { NextResponse } from "next/server";
import { authenticateApiRequest, requireStockist } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  const stockistErr = requireStockist(auth.ctx);
  if (stockistErr) return stockistErr;

  const tenantId = auth.ctx.tenantId;
  const saleId = params.id;

  if (!saleId) {
    return NextResponse.json({ error: "Sale ID is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { paymentMode, notes } = body;

    // Verify this sale belongs to the current tenant
    const existingSale = await prisma.b2BSale.findFirst({
      where: { id: saleId, tenantId },
      select: { id: true, paymentMode: true, status: true, amountDuePaisa: true, totalPaisa: true },
    });

    if (!existingSale) {
      return NextResponse.json({ error: "Sale not found or unauthorized" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, any> = {};
    if (paymentMode && ["cash", "credit", "upi", "cheque"].includes(paymentMode)) {
      updateData.paymentMode = paymentMode;

      // If payment mode changes to cash/upi/cheque, mark as paid
      if (paymentMode !== "credit" && existingSale.status === "unpaid") {
        updateData.status = "paid";
        updateData.amountPaidPaisa = existingSale.totalPaisa;
        updateData.amountDuePaisa = 0;
      }
      // If changing back to credit, mark as unpaid
      if (paymentMode === "credit" && existingSale.status === "paid") {
        updateData.status = "unpaid";
        updateData.amountPaidPaisa = 0;
        updateData.amountDuePaisa = existingSale.totalPaisa;
      }
    }
    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.b2BSale.update({
      where: { id: saleId },
      data: updateData,
      select: {
        id: true,
        invoiceNo: true,
        paymentMode: true,
        status: true,
        notes: true,
        amountDuePaisa: true,
        amountPaidPaisa: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("B2B Sale PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update sale" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  const stockistErr = requireStockist(auth.ctx);
  if (stockistErr) return stockistErr;

  const tenantId = auth.ctx.tenantId;
  const saleId = params.id;

  try {
    const sale = await prisma.b2BSale.findFirst({
      where: { id: saleId, tenantId },
      include: {
        party: true,
        items: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json({ data: sale });
  } catch (error) {
    console.error("B2B Sale GET error:", error);
    return NextResponse.json({ error: "Failed to fetch sale" }, { status: 500 });
  }
}
