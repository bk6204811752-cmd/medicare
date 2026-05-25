import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getGstReport, getInventoryRows, getSales, getScheduleHRegister, toCsv } from "@/lib/local-db";

export async function GET(_request: Request, { params }: { params: Promise<{ type: string }> }) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const { type } = await params;
    const { searchParams } = new URL(_request.url);
    const month = searchParams.get("month") ?? undefined;
    const tid = auth.ctx.tenantId;
    let rows: Record<string, unknown>[] = [];

    if (type === "sales") {
      rows = (await getSales(tid)) as Record<string, unknown>[];
    } else if (type === "gst") {
      const gstRows = (await getGstReport(tid, month)) as {
        hsnCode: string | null;
        gstRate: number;
        taxablePaisa: number;
        gstPaisa: number;
      }[];
      rows = gstRows.map(row => {
        const cgstRate = row.gstRate / 2;
        const sgstRate = row.gstRate - cgstRate;
        const cgstAmt = Math.round(row.gstPaisa / 2);
        const sgstAmt = row.gstPaisa - cgstAmt;
        return {
          "HSN Code": row.hsnCode ?? "N/A",
          "GST Rate (%)": `${row.gstRate}%`,
          "CGST Rate (%)": `${cgstRate}%`,
          "SGST Rate (%)": `${sgstRate}%`,
          "Taxable Value (INR)": (row.taxablePaisa / 100).toFixed(2),
          "CGST Amount (INR)": (cgstAmt / 100).toFixed(2),
          "SGST Amount (INR)": (sgstAmt / 100).toFixed(2),
          "Total Tax (INR)": (row.gstPaisa / 100).toFixed(2),
        };
      }) as unknown as Record<string, unknown>[];
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
