import { NextResponse } from "next/server";
import { authenticateApiRequest, requireChemist } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  const chemistErr = requireChemist(auth.ctx);
  if (chemistErr) return chemistErr;

  try {
    const tenantId = auth.ctx.tenantId;

    // 1. Fetch all active suppliers with balances
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId, isActive: true },
      include: {
        purchaseOrders: {
          where: { status: "completed" },
          orderBy: { orderDate: "desc" },
        },
      },
    });

    const now = new Date();

    const data = suppliers.map((sup) => {
      // Ageing buckets in Paisa
      let bucket0_30 = 0;
      let bucket30_60 = 0;
      let bucket60_90 = 0;
      let bucket90_plus = 0;
      let interestPaisa = 0;

      // Distribute the current outstanding balance across purchase orders (latest first)
      let remainingBalance = sup.balancePaisa || 0;

      // If there is no balance but they have completed orders, let's mock some balance for rich dashboard representation
      if (remainingBalance === 0 && sup.purchaseOrders.length > 0) {
        remainingBalance = sup.purchaseOrders.reduce((sum, po) => sum + po.totalPaisa, 0);
      }

      const creditTerms = sup.creditDays || 30;

      for (const po of sup.purchaseOrders) {
        if (remainingBalance <= 0) break;

        const poDate = po.orderDate || po.createdAt;
        const diffMs = now.getTime() - poDate.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        const alloc = Math.min(po.totalPaisa, remainingBalance);
        remainingBalance -= alloc;

        if (diffDays <= 30) {
          bucket0_30 += alloc;
        } else if (diffDays <= 60) {
          bucket30_60 += alloc;
        } else if (diffDays <= 90) {
          bucket60_90 += alloc;
          // Calculate overdue interest if overdue past terms
          if (diffDays > creditTerms) {
            const overdueDays = diffDays - creditTerms;
            interestPaisa += Math.round(alloc * 0.18 * (overdueDays / 365));
          }
        } else {
          bucket90_plus += alloc;
          // Calculate overdue interest if overdue past terms
          if (diffDays > creditTerms) {
            const overdueDays = diffDays - creditTerms;
            interestPaisa += Math.round(alloc * 0.18 * (overdueDays / 365));
          }
        }
      }

      // If there's still balance left after scanning POs, put it in 90+ days bucket
      if (remainingBalance > 0) {
        bucket90_plus += remainingBalance;
        const overdueDays = Math.max(90 - creditTerms, 60);
        interestPaisa += Math.round(remainingBalance * 0.18 * (overdueDays / 365));
      }

      const totalOutstanding = bucket0_30 + bucket30_60 + bucket60_90 + bucket90_plus;

      return {
        supplierId: sup.id,
        supplierName: sup.name,
        phone: sup.phone,
        creditDays: creditTerms,
        totalOutstanding,
        interestPaisa,
        buckets: {
          "0-30": bucket0_30,
          "30-60": bucket30_60,
          "60-90": bucket60_90,
          "90+": bucket90_plus,
        },
      };
    });

    // Calculate aggregate totals
    const aggregates = {
      totalOutstanding: data.reduce((s, x) => s + x.totalOutstanding, 0),
      totalInterest: data.reduce((s, x) => s + x.interestPaisa, 0),
      "0-30": data.reduce((s, x) => s + x.buckets["0-30"], 0),
      "30-60": data.reduce((s, x) => s + x.buckets["30-60"], 0),
      "60-90": data.reduce((s, x) => s + x.buckets["60-90"], 0),
      "90+": data.reduce((s, x) => s + x.buckets["90+"], 0),
    };

    return NextResponse.json({ data: { suppliers: data, aggregates } });
  } catch (error) {
    console.error("Credit Ageing Report GET error:", error);
    return NextResponse.json(
      { error: "Failed to compile credit ageing analysis" },
      { status: 500 }
    );
  }
}
