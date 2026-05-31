import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/**
 * POST /api/stockist/parties/payment
 *
 * Record a partial or full payment against a specific B2BSale invoice.
 * This is different from the generic createReceipt (FIFO) — this endpoint
 * links a payment directly to a single invoice identified by saleId.
 *
 * Body: { partyId, saleId, amountPaisa, paymentMode, referenceNo?, notes? }
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const tid = user.tenantId;
    if (!tid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { partyId, saleId, amountPaisa, paymentMode, referenceNo, notes } = body;

    // --- Validation ---
    if (!partyId || !saleId || !amountPaisa || !paymentMode) {
      return NextResponse.json(
        { error: "partyId, saleId, amountPaisa, and paymentMode are required" },
        { status: 400 }
      );
    }

    const amt = Number(amountPaisa);
    if (!Number.isInteger(amt) || amt <= 0) {
      return NextResponse.json({ error: "amountPaisa must be a positive integer (in paise)" }, { status: 400 });
    }

    const validModes = ["cash", "upi", "cheque", "neft", "rtgs", "bank_transfer"];
    if (!validModes.includes(paymentMode)) {
      return NextResponse.json({ error: `paymentMode must be one of: ${validModes.join(", ")}` }, { status: 400 });
    }

    // --- Fetch & verify the sale belongs to this tenant's party ---
    const sale = await prisma.b2BSale.findFirst({
      where: { id: saleId, tenantId: tid, partyId },
      select: {
        id: true,
        invoiceNo: true,
        totalPaisa: true,
        amountPaidPaisa: true,
        amountDuePaisa: true,
        status: true,
        party: { select: { id: true, outstandingPaisa: true } },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Invoice not found or access denied" }, { status: 404 });
    }

    if (sale.status === "paid") {
      return NextResponse.json({ error: "This invoice is already fully paid" }, { status: 400 });
    }

    // Cap payment at the remaining due amount
    const maxPayable = sale.amountDuePaisa;
    const actualAmt = Math.min(amt, maxPayable);

    if (actualAmt <= 0) {
      return NextResponse.json({ error: "No outstanding balance on this invoice" }, { status: 400 });
    }

    // --- Generate receipt number ---
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    const receiptNo = `REC-${dateStr}-${rand}`;

    // --- Atomic transaction ---
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create receipt (notes includes invoice reference for traceability)
      const receiptNotes = notes
        ? `${notes} | Applied to: ${sale.invoiceNo}`
        : `Applied to Invoice: ${sale.invoiceNo}`;

      const receipt = await tx.receipt.create({
        data: {
          id: `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          tenantId: tid,
          partyId,
          receiptNo,
          amountPaisa: actualAmt,
          paymentMode,
          referenceNo: referenceNo || null,
          notes: receiptNotes,
          receiptDate: today,
        },
      });

      // 2. Update the specific B2BSale
      const newPaid = sale.amountPaidPaisa + actualAmt;
      const newDue = sale.amountDuePaisa - actualAmt;
      const newStatus = newDue <= 0 ? "paid" : "partial";

      const updatedSale = await tx.b2BSale.update({
        where: { id: saleId },
        data: {
          amountPaidPaisa: newPaid,
          amountDuePaisa: Math.max(0, newDue),
          status: newStatus,
        },
        select: {
          id: true,
          invoiceNo: true,
          amountPaidPaisa: true,
          amountDuePaisa: true,
          status: true,
          totalPaisa: true,
        },
      });

      // 3. Decrement party outstanding
      await tx.party.update({
        where: { id: partyId },
        data: { outstandingPaisa: { decrement: actualAmt } },
      });

      return { receipt, updatedSale };
    });

    return NextResponse.json({
      success: true,
      receiptNo: result.receipt.receiptNo,
      amountPaidPaisa: result.updatedSale.amountPaidPaisa,
      amountDuePaisa: result.updatedSale.amountDuePaisa,
      status: result.updatedSale.status,
      invoiceNo: result.updatedSale.invoiceNo,
      message: `Payment of ₹${(actualAmt / 100).toFixed(2)} recorded against ${sale.invoiceNo}`,
    });
  } catch (error) {
    console.error("POST /api/stockist/parties/payment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record payment" },
      { status: 500 }
    );
  }
}
