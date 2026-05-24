import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { searchByBarcode, searchInventory, searchMedicinesByName, getGenericSubstitutes } from "@/lib/local-db";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const isNumeric = /^\d+$/.test(q);
    if (q.length < 1 || (!isNumeric && q.length < 2)) return NextResponse.json({ data: [], suggestions: [] });

    // Barcode fast-path: if query is a pure numeric string of 6+ digits, try barcode matching first
    const isBarcode = q.length >= 6 && /^\d+$/.test(q);
    let inventoryRows: any[];
    if (isBarcode) {
      inventoryRows = await searchByBarcode(auth.ctx.tenantId, q);
      if (inventoryRows.length > 0) {
        const hasExact = inventoryRows.some((r: any) => r.medicine?.barcode === q);
        return NextResponse.json({
          data: inventoryRows,
          suggestions: [],
          matchType: hasExact ? "barcode" : "barcode-partial",
        });
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

    // ─── Smart Generic Substitutes Logic ───
    const hasOutOfStock = inventoryRows.some((r: any) => r.quantity <= 0);
    const hasSuggestions = suggestions.length > 0;
    
    if (hasOutOfStock || hasSuggestions) {
      const genericNames = new Set<string>();
      
      // 1. Gather generic names from out-of-stock matches
      inventoryRows.forEach((r: any) => {
        if (r.quantity <= 0 && r.medicine?.genericName && r.medicine.genericName.trim().length > 3) {
          genericNames.add(r.medicine.genericName.trim());
        }
      });
      
      // 2. Gather generic names from master list suggestions (which are out-of-stock by definition)
      suggestions.forEach((m: any) => {
        if (m.genericName && m.genericName.trim().length > 3) {
          genericNames.add(m.genericName.trim());
        }
      });

      if (genericNames.size > 0) {
        try {
          const substituteRows = await getGenericSubstitutes(
            auth.ctx.tenantId,
            Array.from(genericNames),
            Array.from(inventoryMedicineIds)
          );
          
          // Attach substitute tags to each substitute row
          const taggedSubstitutes = substituteRows.map((sub: any) => {
            const targetBrand = inventoryRows.find((r: any) => r.quantity <= 0 && r.medicine?.genericName === sub.medicine.genericName)?.medicine?.name ||
                                suggestions.find((m: any) => m.genericName === sub.medicine.genericName)?.name || "";
            return {
              ...sub,
              isGenericSubstitute: true,
              substituteFor: targetBrand
            };
          });
          
          // Merge substitutes into inventoryRows
          inventoryRows = [...taggedSubstitutes, ...inventoryRows];
        } catch (err) {
          console.error("Failed to query generic substitutes:", err);
        }
      }
    }

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
