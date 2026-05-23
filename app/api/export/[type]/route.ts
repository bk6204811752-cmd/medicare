import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getGstReport, getInventoryRows, getSales, getScheduleHRegister, toCsv } from "@/lib/local-db";

export async function GET(_request: Request, { params }: { params: Promise<{ type: string }> }) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const { type } = await params;
    const tid = auth.ctx.tenantId;
    let rows: Record<string, unknown>[] = [];

    if (type === "sales") {
      rows = (await getSales(tid)) as Record<string, unknown>[];
    } else if (type === "gst") {
      rows = (await getGstReport(tid)) as Record<string, unknown>[];
    } else if (type === "inventory") {
      rows = (await getInventoryRows(tid)).map((row) => ({
        medicine: row.medicine.name, batchNo: row.batchNo, expiryDate: row.expiryDate,
        quantity: row.quantity, saleRatePaisa: row.saleRatePaisa, gstRate: row.gstRate,
        rackLocation: row.rackLocation, supplier: row.supplier?.name ?? ""
      }));
    } else if (type === "schedule-h") {
      rows = (await getScheduleHRegister(tid)) as Record<string, unknown>[];
    } else {
      return NextResponse.json({ error: "Unknown export type" }, { status: 404 });
    }

    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="medcare-${type}.csv"`
      }
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
