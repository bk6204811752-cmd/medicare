import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  try {
    const user = await requireUser();
    const tid = user.tenantId;
    if (!tid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const receipts = await prisma.receipt.findMany({
      where: { tenantId: tid, paymentMode: "return" },
      include: { party: true },
      orderBy: { receiptDate: "desc" }
    });

    const returns = receipts.map((r) => {
      let reason = "Sales Return";
      let items: any[] = [];
      try {
        const parsed = JSON.parse(r.notes || "{}");
        reason = parsed.reason || reason;
        items = parsed.items || [];
      } catch (e) {
        // Fallback
      }

      return {
        id: r.id,
        returnNo: r.receiptNo,
        partyName: r.party.name,
        partyId: r.partyId,
        reason,
        totalPaisa: r.amountPaisa,
        createdAt: r.receiptDate.toISOString(),
        items
      };
    });

    return NextResponse.json({ data: returns });
  } catch (error) {
    console.error("Sales returns GET error:", error);
    return NextResponse.json({ error: "Failed to load B2B sales returns" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const tid = user.tenantId;
    if (!tid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { partyId, reason, items } = body;

    if (!partyId || !reason || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required return parameters" }, { status: 400 });
    }

    const totalReturnValue = items.reduce((sum: number, item: any) => sum + item.quantity * item.ratePaisa, 0);

    const count = await prisma.receipt.count({ where: { tenantId: tid, paymentMode: "return" } });
    const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
    const returnNo = `SRN-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}-${suffix}`;

    const receiptId = `rect-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Receipt mapping to Sales Return Credit Note
      const receipt = await tx.receipt.create({
        data: {
          id: receiptId,
          tenantId: tid,
          partyId,
          receiptNo: returnNo,
          amountPaisa: totalReturnValue,
          paymentMode: "return",
          referenceNo: returnNo,
          notes: JSON.stringify({ reason, items }),
          receiptDate: new Date()
        },
        include: { party: true }
      });

      // 2. Adjust Chemist Party ledger outstanding balance downwards
      await tx.party.update({
        where: { id: partyId },
        data: { outstandingPaisa: { decrement: totalReturnValue } }
      });

      // 3. Adjust Warehouse Stock count upwards (returned items back to inventory)
      for (const item of items) {
        await tx.inventoryItem.update({
          where: { id: item.inventoryId },
          data: { quantity: { increment: item.quantity } }
        });
      }

      return receipt;
    });

    return NextResponse.json({
      data: {
        id: result.id,
        returnNo: result.receiptNo,
        partyName: result.party.name,
        reason,
        totalPaisa: result.amountPaisa,
        createdAt: result.receiptDate.toISOString(),
        items
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Sales return POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to record Sales Return" }, { status: 500 });
  }
}
