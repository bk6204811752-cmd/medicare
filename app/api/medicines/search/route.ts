import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { searchByBarcode, searchInventory, searchMedicinesByName } from "@/lib/local-db";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const isNumeric = /^\d+$/.test(q);
    if (q.length < 1 || (!isNumeric && q.length < 2)) return NextResponse.json({ data: [], suggestions: [] });

    // Barcode fast-path: if query is 8-13 digits, try exact barcode match first
    const isBarcode = /^\d{8,13}$/.test(q);
    let inventoryRows;
    if (isBarcode) {
      inventoryRows = await searchByBarcode(auth.ctx.tenantId, q);
      if (inventoryRows.length > 0) {
        return NextResponse.json({ data: inventoryRows, suggestions: [], matchType: "barcode" });
      }
    }

    // Standard search — run inventory + medicine master in parallel for speed
    const [inventoryResult, medicineResult] = await Promise.all([
      searchInventory(auth.ctx.tenantId, q),
      searchMedicinesByName(q),
    ]);
    inventoryRows = inventoryResult;

    // Sort inventory: prioritize in-stock items with furthest expiry (FEFO)
    const now = Date.now();
    inventoryRows.sort((a: any, b: any) => {
      // Out-of-stock items go to bottom
      if (a.quantity <= 0 && b.quantity > 0) return 1;
      if (a.quantity > 0 && b.quantity <= 0) return -1;
      // Expired items go to bottom
      const aExp = new Date(a.expiryDate).getTime();
      const bExp = new Date(b.expiryDate).getTime();
      const aExpired = aExp < now;
      const bExpired = bExp < now;
      if (aExpired && !bExpired) return 1;
      if (!aExpired && bExpired) return -1;
      // Both valid: sort by nearest expiry first (FEFO — First Expiry First Out)
      return aExp - bExp;
    });

    // Filter out medicine master suggestions that are already in inventory results
    const inventoryMedicineIds = new Set(inventoryRows.map((r: any) => r.medicineId));
    const suggestions = medicineResult.filter((m: any) => !inventoryMedicineIds.has(m.id));

    return NextResponse.json({
      data: inventoryRows,
      suggestions,
      matchType: inventoryRows.length > 0 ? "inventory" : suggestions.length > 0 ? "master" : "none",
    });
  } catch (error) {
    console.error("Medicine search API error:", error);
    return NextResponse.json(
      { error: "Medicine search failed. Please try again." },
      { status: 500 }
    );
  }
}
