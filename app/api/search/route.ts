import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getCustomers, getInventoryRows, getSales, getSuppliers } from "@/lib/local-db";
import { formatCurrency, formatDate } from "@/lib/utils";

type SearchResult = {
  id: string;
  type: "inventory" | "customer" | "supplier" | "invoice";
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

  const includes = (value: unknown) => String(value ?? "").toLowerCase().includes(query);
  const results: SearchResult[] = [];
  const tid = auth.ctx.tenantId;
  const [inventoryRows, customers, suppliers, sales] = await Promise.all([
    getInventoryRows(tid), getCustomers(tid), getSuppliers(tid), getSales(tid)
  ]);

  for (const row of inventoryRows) {
    if ([row.medicine.name, row.medicine.genericName, row.medicine.barcode, row.batchNo, row.rackLocation].some(includes)) {
      results.push({
        id: row.id, type: "inventory", title: row.medicine.name,
        subtitle: `Batch ${row.batchNo} | Stock ${row.quantity} | ${row.rackLocation || "No rack"}`,
        href: `/shop/inventory`
      });
    }
  }

  for (const customer of customers) {
    if ([customer.name, customer.phone, customer.doctorName].some(includes)) {
      results.push({
        id: customer.id, type: "customer", title: customer.name,
        subtitle: `${customer.phone || "No phone"} | Due ${formatCurrency(customer.outstandingPaisa)}`,
        href: `/shop/customers`
      });
    }
  }

  for (const supplier of suppliers) {
    if ([supplier.name, supplier.phone, supplier.gstin].some(includes)) {
      results.push({
        id: supplier.id, type: "supplier", title: supplier.name,
        subtitle: `${supplier.gstin || "No GSTIN"} | Payable ${formatCurrency(supplier.balancePaisa)}`,
        href: `/shop/suppliers`
      });
    }
  }

  for (const sale of sales as Record<string, unknown>[]) {
    if ([sale.invoice_no, sale.customer_name, sale.customer_phone, sale.payment_mode].some(includes)) {
      results.push({
        id: String(sale.id), type: "invoice", title: String(sale.invoice_no),
        subtitle: `${String(sale.customer_name ?? "Walk-in")} | ${formatDate(String(sale.invoice_date))} | ${formatCurrency(Number(sale.total_paisa ?? 0))}`,
        href: `/shop/billing`
      });
    }
  }

  return NextResponse.json({ data: results.slice(0, 10) });
}
