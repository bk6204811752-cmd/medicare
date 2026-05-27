import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const tid = user.tenantId;
    if (!tid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const partyId = searchParams.get("partyId");

    if (!partyId) {
      return NextResponse.json({ error: "Party ID is required" }, { status: 400 });
    }

    // 1. Verify that the requested party belongs to the active stockist tenant (isolation audit)
    const party = await prisma.party.findFirst({
      where: { id: partyId, tenantId: tid }
    });

    if (!party) {
      return NextResponse.json({ error: "Retail Chemist account not found or access denied" }, { status: 404 });
    }

    // 2. Fetch all B2B Sales (Invoices) and Receipts (Payments)
    const [sales, receipts] = await Promise.all([
      prisma.b2BSale.findMany({
        where: { tenantId: tid, partyId },
        include: { items: true },
        orderBy: { invoiceDate: "asc" }
      }),
      prisma.receipt.findMany({
        where: { tenantId: tid, partyId },
        orderBy: { receiptDate: "asc" }
      })
    ]);

    // 3. Map to a unified chronological transaction structure
    const transactions: any[] = [];

    sales.forEach((s) => {
      transactions.push({
        id: s.id,
        date: s.invoiceDate,
        type: "invoice",
        refNo: s.invoiceNo,
        description: `Wholesale B2B ${s.invoiceType === "challan" ? "Challan" : "Invoice"} (${s.paymentMode.toUpperCase()})`,
        debitPaisa: s.paymentMode === "credit" ? s.totalPaisa : 0,
        creditPaisa: 0,
        paidPaisa: s.amountPaidPaisa,
        paymentMode: s.paymentMode,
        items: s.items.map((item) => ({
          name: item.medicineName,
          qty: item.quantity,
          free: item.freeQuantity,
          rate: item.saleRatePaisa,
          total: item.totalPaisa
        }))
      });
    });

    receipts.forEach((r) => {
      transactions.push({
        id: r.id,
        date: r.receiptDate,
        type: "receipt",
        refNo: r.receiptNo,
        description: `Payment Collection Receipt (${r.paymentMode.toUpperCase()})${r.referenceNo ? ` - Ref: ${r.referenceNo}` : ""}`,
        debitPaisa: 0,
        creditPaisa: r.amountPaisa,
        paidPaisa: r.amountPaisa,
        paymentMode: r.paymentMode,
        notes: r.notes || "",
        items: []
      });
    });

    // 4. Sort transactions chronologically by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 5. Walk through chronological logs to calculate running outstanding balance
    let runningOutstanding = 0;
    const ledgerRows = transactions.map((t) => {
      if (t.type === "invoice") {
        runningOutstanding += t.debitPaisa;
      } else if (t.type === "receipt") {
        runningOutstanding -= t.creditPaisa;
      }
      return {
        ...t,
        runningOutstanding
      };
    });

    return NextResponse.json({
      party: {
        id: party.id,
        name: party.name,
        gstin: party.gstin,
        drugLicenseNo: party.drugLicenseNo,
        creditLimitPaisa: party.creditLimitPaisa,
        outstandingPaisa: party.outstandingPaisa
      },
      ledger: ledgerRows
    });
  } catch (error) {
    console.error("Party Ledger GET error:", error);
    return NextResponse.json({ error: "Failed to compile chemist account ledger statement" }, { status: 500 });
  }
}
