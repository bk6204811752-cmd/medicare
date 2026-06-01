import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/prisma";

// Helper for generating unique UIDs
function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Beat / Route Management ───────────────────────────────────

export async function getRoutes(tenantId: string) {
  return await withRetry(() =>
    prisma.route.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    })
  );
}

export async function createRoute(tenantId: string, input: { name: string; code?: string; description?: string }) {
  return await withRetry(() =>
    prisma.route.create({
      data: {
        id: uid("route"),
        tenantId,
        name: input.name,
        code: input.code || null,
        description: input.description || null,
      },
    })
  );
}

// ─── Sales Team Management ────────────────────────────────────

export async function getSalesmen(tenantId: string) {
  return await withRetry(() =>
    prisma.salesman.findMany({
      where: { tenantId },
      include: {
        routes: {
          include: {
            route: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })
  );
}

export async function createSalesman(tenantId: string, input: {
  name: string; phone?: string; email?: string; targetPaisa?: number; commissionPercent?: number; commissionOn?: string; routeIds?: string[];
}) {
  const salesmanId = uid("salesman");
  return await prisma.$transaction(async (tx) => {
    const sm = await tx.salesman.create({
      data: {
        id: salesmanId,
        tenantId,
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        targetPaisa: input.targetPaisa || 0,
        commissionPercent: input.commissionPercent || 0.0,
        commissionOn: input.commissionOn || "sales",
      },
    });

    if (input.routeIds && input.routeIds.length > 0) {
      for (const routeId of input.routeIds) {
        await tx.salesmanRoute.create({
          data: {
            salesmanId,
            routeId,
          },
        });
      }
    }

    return sm;
  });
}

// ─── Party (Retail Chemist) Management ──────────────────────────

export async function getParties(tenantId: string) {
  return await withRetry(() =>
    prisma.party.findMany({
      where: { tenantId },
      include: {
        route: true,
      },
      orderBy: { name: "asc" },
    })
  );
}

export async function getPartyById(tenantId: string, partyId: string) {
  return await withRetry(() =>
    prisma.party.findFirst({
      where: { tenantId, id: partyId },
      include: {
        route: true,
      },
    })
  );
}

export async function createParty(tenantId: string, input: {
  name: string; phone?: string; email?: string; address?: string; gstin?: string; drugLicenseNo?: string; creditLimitPaisa?: number; routeId?: string;
}) {
  return await withRetry(() =>
    prisma.party.create({
      data: {
        id: uid("party"),
        tenantId,
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        gstin: input.gstin || null,
        drugLicenseNo: input.drugLicenseNo || null,
        creditLimitPaisa: input.creditLimitPaisa || 0,
        outstandingPaisa: 0,
        routeId: input.routeId || null,
      },
    })
  );
}

export async function updateParty(tenantId: string, partyId: string, input: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  drugLicenseNo?: string;
  creditLimitPaisa?: number;
  routeId?: string;
  outstandingPaisa?: number;
}) {
  return await withRetry(() =>
    prisma.party.update({
      where: { id: partyId, tenantId },
      data: {
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        gstin: input.gstin || null,
        drugLicenseNo: input.drugLicenseNo || null,
        creditLimitPaisa: input.creditLimitPaisa !== undefined ? input.creditLimitPaisa : undefined,
        outstandingPaisa: input.outstandingPaisa !== undefined ? input.outstandingPaisa : undefined,
        routeId: input.routeId || null,
      },
    })
  );
}

// ─── B2B Sales & Order Management ──────────────────────────────

export async function getB2BSalesOrders(tenantId: string) {
  return await withRetry(() =>
    prisma.b2BSalesOrder.findMany({
      where: { tenantId },
      include: {
        party: true,
        salesman: true,
        items: true,
      },
      orderBy: { orderDate: "desc" },
    })
  );
}

export async function createB2BSalesOrder(tenantId: string, input: {
  partyId: string;
  salesmanId?: string;
  notes?: string;
  items: { medicineId: string; medicineName: string; quantity: number; freeQuantity?: number; ratePaisa: number }[];
}) {
  const orderId = uid("order");
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const orderNo = `ORD-${dateStr}-${rand}`;

  let subtotal = 0;
  let gst = 0;

  const orderItemsData = input.items.map((item) => {
    const total = item.quantity * item.ratePaisa;
    subtotal += total;
    const itemGst = Math.round(total * 0.12);
    gst += itemGst;

    return {
      id: uid("oi"),
      orderId,
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      quantity: item.quantity,
      freeQuantity: item.freeQuantity || 0,
      ratePaisa: item.ratePaisa,
      totalPaisa: total,
    };
  });

  const total = subtotal + gst;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.b2BSalesOrder.create({
      data: {
        id: orderId,
        tenantId,
        orderNo,
        partyId: input.partyId,
        salesmanId: input.salesmanId || null,
        subtotalPaisa: subtotal,
        discountPaisa: 0,
        taxablePaisa: subtotal,
        gstPaisa: gst,
        totalPaisa: total,
        status: "pending",
        notes: input.notes || null,
      },
    });

    for (const data of orderItemsData) {
      await tx.b2BSalesOrderItem.create({ data });
    }

    return order;
  });
}

export async function createB2BSale(tenantId: string, input: {
  partyId: string;
  salesmanId?: string;
  orderId?: string;
  paymentMode?: string;
  invoiceType?: string;
  discountPaisa?: number;
  notes?: string;
  items: {
    inventoryId: string;
    quantity: number;
    freeQuantity?: number;
    saleRatePaisa: number;
    discountPercent?: number;
    schemeDetails?: string;
  }[];
}) {
  const saleId = uid("b2bsale");
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const prefix = input.invoiceType === "challan" ? "CHL" : "INV";
  const invoiceNo = `${prefix}-${dateStr}-${rand}`;

  let subtotal = 0;
  let totalDiscount = input.discountPaisa || 0;
  let totalGst = 0;

  const party = await prisma.party.findFirst({ where: { tenantId, id: input.partyId } });
  if (!party) throw new Error("Invalid party");

  return await prisma.$transaction(async (tx) => {
    const saleItemsData: any[] = [];

    for (const item of input.items) {
      const inv = await tx.inventoryItem.findFirst({
        where: { tenantId, id: item.inventoryId },
        include: { medicine: true },
      });
      if (!inv) throw new Error("Inventory item not found");
      if (inv.quantity < (item.quantity + (item.freeQuantity || 0))) {
        throw new Error(`Insufficient stock for ${inv.medicine.name}. Required: ${item.quantity + (item.freeQuantity || 0)}, Available: ${inv.quantity}`);
      }

      const rowSubtotal = item.quantity * item.saleRatePaisa;
      const rowDiscount = Math.round(rowSubtotal * ((item.discountPercent || 0) / 100));
      const rowTaxable = rowSubtotal - rowDiscount;
      const rowGst = Math.round(rowTaxable * (inv.gstRate / 100));

      subtotal += rowSubtotal;
      totalDiscount += rowDiscount;
      totalGst += rowGst;

      saleItemsData.push({
        id: uid("bsi"),
        saleId,
        inventoryId: item.inventoryId,
        medicineName: inv.medicine.name,
        batchNo: inv.batchNo,
        expiryDate: inv.expiryDate,
        quantity: item.quantity,
        freeQuantity: item.freeQuantity || 0,
        mrpPaisa: inv.mrpPaisa,
        saleRatePaisa: item.saleRatePaisa,
        discountPercent: item.discountPercent || 0,
        gstRate: inv.gstRate,
        gstPaisa: rowGst,
        taxablePaisa: rowTaxable,
        totalPaisa: rowTaxable + rowGst,
        schemeDetails: item.schemeDetails || null,
      });

      const totalDeduction = item.quantity + (item.freeQuantity || 0);
      await tx.inventoryItem.update({
        where: { id: item.inventoryId },
        data: {
          quantity: { decrement: totalDeduction },
        },
      });

      await tx.stockMovement.create({
        data: {
          id: uid("mv"),
          tenantId,
          inventoryId: item.inventoryId,
          adjustmentType: "sale",
          quantityDelta: -totalDeduction,
          reason: `B2B Sale Invoice ${invoiceNo}`,
          referenceNo: invoiceNo,
        },
      });
    }

    const taxablePaisa = subtotal - totalDiscount;
    const totalPaisa = taxablePaisa + totalGst;
    const amountDue = input.paymentMode === "credit" ? totalPaisa : 0;
    const amountPaid = input.paymentMode !== "credit" ? totalPaisa : 0;

    if (input.paymentMode === "credit" && party.creditLimitPaisa > 0) {
      const nextOutstanding = party.outstandingPaisa + amountDue;
      if (nextOutstanding > party.creditLimitPaisa) {
        throw new Error(`Credit Limit Exceeded! Party: ${party.name}. Current Outstanding: ₹${(party.outstandingPaisa / 100).toFixed(2)}, Order Value: ₹${(totalPaisa / 100).toFixed(2)}, Limit: ₹${(party.creditLimitPaisa / 100).toFixed(2)}`);
      }
    }

    const sale = await tx.b2BSale.create({
      data: {
        id: saleId,
        tenantId,
        invoiceNo,
        partyId: input.partyId,
        salesmanId: input.salesmanId || null,
        orderId: input.orderId || null,
        paymentMode: input.paymentMode || "credit",
        subtotalPaisa: subtotal,
        discountPaisa: totalDiscount,
        taxablePaisa,
        gstPaisa: totalGst,
        roundOffPaisa: 0,
        totalPaisa,
        amountPaidPaisa: amountPaid,
        amountDuePaisa: amountDue,
        status: amountDue > 0 ? "unpaid" : "paid",
        invoiceType: input.invoiceType || "invoice",
        notes: input.notes || null,
      },
    });

    for (const itemData of saleItemsData) {
      await tx.b2BSaleItem.create({ data: itemData });
    }

    if (amountDue > 0) {
      await tx.party.update({
        where: { id: input.partyId },
        data: {
          outstandingPaisa: { increment: amountDue },
        },
      });
    }

    if (input.orderId) {
      await tx.b2BSalesOrder.update({
        where: { id: input.orderId },
        data: { status: "billed" },
      });
    }

    return sale;
  });
}

export async function getB2BSalesWithItems(tenantId: string) {
  return await withRetry(() =>
    prisma.b2BSale.findMany({
      where: { tenantId },
      include: {
        party: true,
        items: {
          include: {
            inventory: {
              include: {
                medicine: true,
              },
            },
          },
        },
      },
      orderBy: { invoiceDate: "desc" },
    })
  );
}

// ─── Credit Ledger & receipts ──────────────────────────────────

export async function getReceipts(tenantId: string) {
  return await withRetry(() =>
    prisma.receipt.findMany({
      where: { tenantId },
      include: {
        party: true,
        salesman: true,
      },
      orderBy: { receiptDate: "desc" },
    })
  );
}

export async function createReceipt(tenantId: string, input: {
  partyId: string;
  salesmanId?: string;
  amountPaisa: number;
  paymentMode: string;
  referenceNo?: string;
  notes?: string;
}) {
  const receiptId = uid("rec");
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const receiptNo = `REC-${dateStr}-${rand}`;

  return await prisma.$transaction(async (tx) => {
    const party = await tx.party.findFirst({
      where: { id: input.partyId, tenantId }
    });
    if (!party) {
      throw new Error("Party not found or does not belong to this stockist.");
    }

    const receipt = await tx.receipt.create({
      data: {
        id: receiptId,
        tenantId,
        partyId: input.partyId,
        salesmanId: input.salesmanId || null,
        receiptNo,
        amountPaisa: input.amountPaisa,
        paymentMode: input.paymentMode,
        referenceNo: input.referenceNo || null,
        notes: input.notes || null,
      },
    });

    await tx.party.update({
      where: { id: input.partyId },
      data: {
        outstandingPaisa: { decrement: input.amountPaisa },
      },
    });

    let pendingDeduction = input.amountPaisa;
    const unpaidSales = await tx.b2BSale.findMany({
      where: { tenantId, partyId: input.partyId, status: { in: ["unpaid", "partial"] } },
      orderBy: { invoiceDate: "asc" },
    });

    for (const sale of unpaidSales) {
      if (pendingDeduction <= 0) break;

      const due = sale.amountDuePaisa;
      if (pendingDeduction >= due) {
        pendingDeduction -= due;
        await tx.b2BSale.update({
          where: { id: sale.id },
          data: {
            amountPaidPaisa: { increment: due },
            amountDuePaisa: 0,
            status: "paid",
          },
        });
      } else {
        await tx.b2BSale.update({
          where: { id: sale.id },
          data: {
            amountPaidPaisa: { increment: pendingDeduction },
            amountDuePaisa: { decrement: pendingDeduction },
            status: "partial",
          },
        });
        pendingDeduction = 0;
      }
    }

    return receipt;
  });
}

export async function getPartyLedger(tenantId: string, partyId: string) {
  const [sales, receipts, party] = await Promise.all([
    prisma.b2BSale.findMany({
      where: { tenantId, partyId },
      orderBy: { invoiceDate: "desc" },
    }),
    prisma.receipt.findMany({
      where: { tenantId, partyId },
      orderBy: { receiptDate: "desc" },
    }),
    prisma.party.findFirst({
      where: { tenantId, id: partyId },
    }),
  ]);

  const ledgerEntries: any[] = [];

  for (const sale of sales) {
    ledgerEntries.push({
      id: sale.id,
      date: sale.invoiceDate.toISOString().slice(0, 10),
      type: sale.invoiceType === "challan" ? "Challan" : "Invoice",
      referenceNo: sale.invoiceNo,
      debitPaisa: sale.totalPaisa,
      creditPaisa: 0,
      balancePaisa: sale.amountDuePaisa,
    });
  }

  for (const rec of receipts) {
    ledgerEntries.push({
      id: rec.id,
      date: rec.receiptDate.toISOString().slice(0, 10),
      type: `Receipt (${rec.paymentMode.toUpperCase()})`,
      referenceNo: rec.receiptNo,
      debitPaisa: 0,
      creditPaisa: rec.amountPaisa,
      balancePaisa: 0,
    });
  }

  return {
    party,
    entries: ledgerEntries.sort((a, b) => b.date.localeCompare(a.date)),
  };
}

// ─── Indent Management ──────────────────────────────────────────

export async function getB2BIndents(tenantId: string) {
  return await withRetry(() =>
    prisma.b2BIndent.findMany({
      where: { tenantId },
      include: {
        items: true,
      },
      orderBy: { indentDate: "desc" },
    })
  );
}

export async function createB2BIndent(tenantId: string, input: {
  chemistName: string;
  phone?: string;
  items: { medicineName: string; quantity: number }[];
}) {
  const indentId = uid("indent");
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const indentNo = `IND-${dateStr}-${rand}`;

  return await prisma.$transaction(async (tx) => {
    const indent = await tx.b2BIndent.create({
      data: {
        id: indentId,
        tenantId,
        indentNo,
        chemistName: input.chemistName,
        phone: input.phone || null,
        status: "pending",
      },
    });

    for (const item of input.items) {
      await tx.b2BIndentItem.create({
        data: {
          id: uid("ii"),
          indentId,
          medicineName: item.medicineName,
          quantity: item.quantity,
        },
      });
    }

    return indent;
  });
}

// ─── Stockist Dashboard Summary (MTD/Today Sales & Recharts) ────

export async function getB2BSalesSummary(tenantId: string) {
  await ensureB2BDataBootstrapped(tenantId);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [todaySales, monthSales, unpaidReceivables, todayCollections] = await Promise.all([
    prisma.b2BSale.aggregate({
      where: { tenantId, invoiceDate: { gte: startOfToday } },
      _sum: { totalPaisa: true },
      _count: { id: true },
    }),
    prisma.b2BSale.aggregate({
      where: { tenantId, invoiceDate: { gte: startOfMonth } },
      _sum: { totalPaisa: true },
    }),
    prisma.party.aggregate({
      where: { tenantId },
      _sum: { outstandingPaisa: true },
    }),
    prisma.receipt.aggregate({
      where: { tenantId, receiptDate: { gte: startOfToday } },
      _sum: { amountPaisa: true },
    }),
  ]);

  return {
    todaySalesPaisa: todaySales._sum?.totalPaisa || 0,
    todayInvoices: todaySales._count?.id || 0,
    monthSalesPaisa: monthSales._sum?.totalPaisa || 0,
    outstandingReceivablesPaisa: unpaidReceivables._sum?.outstandingPaisa || 0,
    todayCollectionsPaisa: todayCollections._sum?.amountPaisa || 0,
  };
}

export async function getB2BSalesTrend(tenantId: string) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Calculate date range
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const startOfRange = new Date();
  startOfRange.setDate(startOfRange.getDate() - 6);
  startOfRange.setHours(0, 0, 0, 0);

  // Single query for all 7 days
  const sales = await prisma.b2BSale.findMany({
    where: {
      tenantId,
      invoiceDate: { gte: startOfRange, lte: endOfToday },
    },
    select: { totalPaisa: true, invoiceDate: true },
  });

  // Group by day in JavaScript
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const dayName = dayNames[d.getDay()];

    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);

    const daySales = sales.filter(
      (s) => s.invoiceDate >= d && s.invoiceDate < nextDay
    );

    return {
      day: dayName,
      sales: Math.round(daySales.reduce((sum, s) => sum + s.totalPaisa, 0) / 100),
      bills: daySales.length,
    };
  });
}

// ─── GSTR B2B Reports Aggregates ───────────────────────────────

// ─── Analytics: Monthly Profit, Top Chemists, Top Medicines ───

export async function getStockistAnalytics(tenantId: string, fromDateStr: string, toDateStr: string) {
  const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);
  const toDate = new Date(`${toDateStr}T23:59:59.999Z`);

  const sales = await prisma.b2BSale.findMany({
    where: { tenantId, invoiceDate: { gte: fromDate, lte: toDate } },
    include: { 
      party: true,
      items: {
        include: {
          inventory: true
        }
      }
    },
    orderBy: { invoiceDate: "asc" },
  });

  // Monthly sales revenue and cost from inventory purchase rate
  const monthlyMap: Record<string, { revenue: number; cost: number; profit: number }> = {};
  for (const sale of sales) {
    const monthKey = sale.invoiceDate.toISOString().slice(0, 7); // "YYYY-MM"
    if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { revenue: 0, cost: 0, profit: 0 };
    monthlyMap[monthKey].revenue += sale.taxablePaisa;

    // Cost = sum of purchaseRatePaisa * qty for items in this sale
    for (const item of sale.items) {
      const purchaseCost = (item.inventory?.purchaseRatePaisa || 0) * item.quantity;
      monthlyMap[monthKey].cost += purchaseCost;
    }
  }
  for (const key of Object.keys(monthlyMap)) {
    monthlyMap[key].profit = monthlyMap[key].revenue - monthlyMap[key].cost;
  }

  const monthlyProfit = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      label: new Date(month + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      revenuePaisa: data.revenue,
      costPaisa: data.cost,
      profitPaisa: data.profit,
    }));

  // Top Chemists by revenue
  const chemistMap: Record<string, { name: string; revenuePaisa: number; invoices: number }> = {};
  for (const sale of sales) {
    const id = sale.partyId;
    if (!chemistMap[id]) chemistMap[id] = { name: sale.party.name, revenuePaisa: 0, invoices: 0 };
    chemistMap[id].revenuePaisa += sale.totalPaisa;
    chemistMap[id].invoices += 1;
  }
  const topChemists = Object.entries(chemistMap)
    .map(([id, data]) => ({ partyId: id, ...data }))
    .sort((a, b) => b.revenuePaisa - a.revenuePaisa)
    .slice(0, 10);

  // Top Medicines by quantity sold
  const medMap: Record<string, { name: string; qty: number; revenuePaisa: number }> = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      const name = item.medicineName;
      if (!medMap[name]) medMap[name] = { name, qty: 0, revenuePaisa: 0 };
      medMap[name].qty += item.quantity + item.freeQuantity;
      medMap[name].revenuePaisa += item.totalPaisa;
    }
  }
  const topMedicines = Object.values(medMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  // Summary totals (cost from inventory purchase rates)
  let totalCostPaisa = 0;
  for (const sale of sales) {
    for (const item of sale.items) {
      totalCostPaisa += (item.inventory?.purchaseRatePaisa || 0) * item.quantity;
    }
  }
  const totalRevenuePaisa = sales.reduce((s, sale) => s + sale.totalPaisa, 0);
  const totalProfitPaisa = totalRevenuePaisa - totalCostPaisa;
  const totalInvoices = sales.length;

  return {
    monthlyProfit,
    topChemists,
    topMedicines,
    totalRevenuePaisa,
    totalCostPaisa,
    totalProfitPaisa,
    totalInvoices,
  };
}

export async function getGSTR1B2B(tenantId: string, fromDateStr: string, toDateStr: string) {
  const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);
  const toDate = new Date(`${toDateStr}T23:59:59.999Z`);

  const [tenant, sales] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { gstin: true }
    }),
    prisma.b2BSale.findMany({
      where: {
        tenantId,
        invoiceType: "invoice",
        invoiceDate: { gte: fromDate, lte: toDate },
      },
      include: {
        party: true,
        items: true,
      },
      orderBy: { invoiceDate: "asc" },
    })
  ]);

  const tenantStateCode = tenant?.gstin?.trim().substring(0, 2);

  return sales.map((sale) => {
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const partyStateCode = sale.party.gstin?.trim().substring(0, 2);
    const isInterstate = !!(tenantStateCode && partyStateCode && 
                           /^\d{2}$/.test(tenantStateCode) && 
                           /^\d{2}$/.test(partyStateCode) && 
                           tenantStateCode !== partyStateCode);

    for (const item of sale.items) {
      if (isInterstate) {
        igst += item.gstPaisa;
      } else {
        cgst += Math.round(item.gstPaisa / 2);
        sgst += Math.round(item.gstPaisa / 2);
      }
    }

    return {
      partyName: sale.party.name,
      gstin: sale.party.gstin || "URP",
      invoiceNo: sale.invoiceNo,
      invoiceDate: sale.invoiceDate.toISOString().slice(0, 10),
      invoiceValue: (sale.totalPaisa / 100).toFixed(2),
      taxableValue: (sale.taxablePaisa / 100).toFixed(2),
      cgst: (cgst / 100).toFixed(2),
      sgst: (sgst / 100).toFixed(2),
      igst: (igst / 100).toFixed(2),
      totalTax: (sale.gstPaisa / 100).toFixed(2),
    };
  });
}

// ─── Wholesale Inventory & FEFO Picker ────────────────────────

export async function getWholesaleInventory(tenantId: string) {
  return await withRetry(() =>
    prisma.inventoryItem.findMany({
      where: { tenantId, isActive: true },
      include: {
        medicine: true,
        supplier: true,
      },
      orderBy: [{ medicine: { name: "asc" } }, { expiryDate: "asc" }],
    })
  );
}

// ─── Bootstrap Stockist Seed Helper (Fast Onboarding) ──────────

async function ensureB2BDataBootstrapped(tenantId: string) {
  try {
    const partyCount = await prisma.party.count({ where: { tenantId } });
    if (partyCount > 0) return;

    await prisma.$transaction(async (tx) => {
      const routeNorth = await tx.route.create({
        data: { id: uid("route"), tenantId, name: "North Beat Area", code: "NT-RCH" },
      });
      const routeSouth = await tx.route.create({
        data: { id: uid("route"), tenantId, name: "South Beat Area", code: "ST-RCH" },
      });

      const salesman1 = await tx.salesman.create({
        data: {
          id: uid("salesman"),
          tenantId,
          name: "Vijay Shankar",
          phone: "+91 91000 23456",
          targetPaisa: 5000000,
          commissionPercent: 1.5,
          commissionOn: "sales",
        },
      });

      await tx.salesmanRoute.create({ data: { salesmanId: salesman1.id, routeId: routeNorth.id } });

      await tx.party.create({
        data: {
          id: uid("party"),
          tenantId,
          name: "Apex Pharmacy Ranchi",
          phone: "9835012345",
          gstin: "20AAAAA0000A1Z5",
          drugLicenseNo: "JH-RAN-22876A",
          creditLimitPaisa: 20000000,
          outstandingPaisa: 4500000,
          routeId: routeNorth.id,
        },
      });

      await tx.party.create({
        data: {
          id: uid("party"),
          tenantId,
          name: "Lal Medical Hall",
          phone: "9431102938",
          gstin: "20BBBBB1111B1Z2",
          drugLicenseNo: "JH-RAN-19283B",
          creditLimitPaisa: 15000000,
          outstandingPaisa: 0,
          routeId: routeSouth.id,
        },
      });
    });
  } catch (error) {
    // If it fails (due to parallel seed writing), verify if data is already populated
    const partyCount = await prisma.party.count({ where: { tenantId } }).catch(() => 0);
    if (partyCount > 0) {
      console.warn("Parallel B2B seeding detected. Recovered safely, B2B data already bootstrapped.");
      return;
    }
    throw error;
  }
}
