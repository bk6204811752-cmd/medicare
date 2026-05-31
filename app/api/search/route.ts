import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

type SearchResult = {
  id: string;
  type: "inventory" | "customer" | "supplier" | "invoice" | "retailer";
  title: string;
  subtitle: string;
  href: string;
};

export async function GET(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (query.length < 2) return NextResponse.json({ data: [] });

  const results: SearchResult[] = [];
  const tid = auth.ctx.tenantId;
  const isStockist = auth.ctx.user.role === "stockist_admin" || auth.ctx.user.role === "stockist_staff";

  try {
    if (isStockist) {
      // ─── B2B Stockist Search Queries ─────────────────────────────
      const [inventoryRows, parties, suppliers, b2bSales] = await Promise.all([
        prisma.inventoryItem.findMany({
          where: {
            tenantId: tid, isActive: true,
            OR: [
              { medicine: { name: { contains: query, mode: "insensitive" } } },
              { medicine: { genericName: { contains: query, mode: "insensitive" } } },
              { medicine: { barcode: { contains: query, mode: "insensitive" } } },
              { batchNo: { contains: query, mode: "insensitive" } },
            ],
          },
          include: { medicine: true },
          take: 5,
        }),
        prisma.party.findMany({
          where: {
            tenantId: tid,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { gstin: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 5,
        }),
        prisma.supplier.findMany({
          where: {
            tenantId: tid, isActive: true,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { gstin: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 5,
        }),
        prisma.b2BSale.findMany({
          where: {
            tenantId: tid,
            OR: [
              { invoiceNo: { contains: query, mode: "insensitive" } },
              { party: { name: { contains: query, mode: "insensitive" } } },
            ],
          },
          include: { party: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

      for (const row of inventoryRows) {
        results.push({
          id: row.id, type: "inventory", title: row.medicine.name,
          subtitle: `Batch ${row.batchNo} | Stock ${row.quantity} | Loc: ${row.rackLocation || "MAIN_WH"}`,
          href: `/stockist/inventory`
        });
      }

      for (const party of parties) {
        results.push({
          id: party.id, type: "retailer", title: party.name,
          subtitle: `${party.phone || "No phone"} | Outstanding: ${formatCurrency(party.outstandingPaisa)}`,
          href: `/stockist/parties`
        });
      }

      for (const supplier of suppliers) {
        results.push({
          id: supplier.id, type: "supplier", title: supplier.name,
          subtitle: `${supplier.gstin || "No GSTIN"} | Balance: ${formatCurrency(supplier.balancePaisa)}`,
          href: `/stockist/purchases`
        });
      }

      for (const sale of b2bSales) {
        results.push({
          id: sale.id, type: "invoice", title: sale.invoiceNo,
          subtitle: `${sale.party.name} | ${formatDate(sale.invoiceDate.toISOString())} | ${formatCurrency(sale.totalPaisa)}`,
          href: `/stockist/sales`
        });
      }
    } else {
      // ─── Retail Chemist Search Queries ───────────────────────────
      const [inventoryRows, customers, suppliers, sales] = await Promise.all([
        prisma.inventoryItem.findMany({
          where: {
            tenantId: tid, isActive: true,
            OR: [
              { medicine: { name: { contains: query, mode: "insensitive" } } },
              { medicine: { genericName: { contains: query, mode: "insensitive" } } },
              { medicine: { barcode: { contains: query, mode: "insensitive" } } },
              { batchNo: { contains: query, mode: "insensitive" } },
            ],
          },
          include: { medicine: true },
          take: 5,
        }),
        prisma.customer.findMany({
          where: {
            tenantId: tid,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { doctorName: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 5,
        }),
        prisma.supplier.findMany({
          where: {
            tenantId: tid, isActive: true,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { gstin: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 5,
        }),
        prisma.sale.findMany({
          where: {
            tenantId: tid,
            OR: [
              { invoiceNo: { contains: query, mode: "insensitive" } },
              { customerName: { contains: query, mode: "insensitive" } },
              { customerPhone: { contains: query, mode: "insensitive" } },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

      for (const row of inventoryRows) {
        results.push({
          id: row.id, type: "inventory", title: row.medicine.name,
          subtitle: `Batch ${row.batchNo} | Stock ${row.quantity} | ${row.rackLocation || "No rack"}`,
          href: `/shop/inventory`
        });
      }

      for (const customer of customers) {
        results.push({
          id: customer.id, type: "customer", title: customer.name,
          subtitle: `${customer.phone || "No phone"} | Due ${formatCurrency(customer.outstandingPaisa)}`,
          href: `/shop/customers`
        });
      }

      for (const supplier of suppliers) {
        results.push({
          id: supplier.id, type: "supplier", title: supplier.name,
          subtitle: `${supplier.gstin || "No GSTIN"} | Payable ${formatCurrency(supplier.balancePaisa)}`,
          href: `/shop/suppliers`
        });
      }

      for (const sale of sales) {
        results.push({
          id: sale.id, type: "invoice", title: sale.invoiceNo,
          subtitle: `${sale.customerName ?? "Walk-in"} | ${formatDate(sale.invoiceDate.toISOString())} | ${formatCurrency(sale.totalPaisa)}`,
          href: `/shop/billing`
        });
      }
    }

    return NextResponse.json({ data: results.slice(0, 10) });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}
