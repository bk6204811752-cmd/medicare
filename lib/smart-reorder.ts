import { prisma } from "@/lib/prisma";

export type ReorderSuggestion = {
  medicineId: string;
  medicineName: string;
  genericName: string | null;
  category: string | null;
  currentStock: number;
  reorderLevel: number;
  suggestedReorderLevel: number;
  avgDailySales: number;
  sales30Days: number;
  suggestedQty: number;
  urgency: "critical" | "warning" | "adequate";
  preferredSupplierId: string | null;
  preferredSupplierName: string | null;
  ptrPaisa: number;
  mrpPaisa: number;
};

export async function getReorderSuggestions(tenantId: string): Promise<ReorderSuggestion[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. Get all inventory items
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { tenantId, isActive: true },
    include: {
      medicine: true,
      supplier: true,
    },
  });

  if (inventoryItems.length === 0) return [];

  // 2. Get all sales items in the last 30 days
  const saleItems = await prisma.saleItem.findMany({
    where: {
      tenantId,
      sale: {
        createdAt: { gte: thirtyDaysAgo },
      },
    },
    include: {
      inventory: true,
    },
  });

  // Calculate sales by medicineId
  const salesMap = new Map<string, number>();
  for (const item of saleItems) {
    if (item.inventory) {
      const medId = item.inventory.medicineId;
      salesMap.set(medId, (salesMap.get(medId) || 0) + item.quantity);
    }
  }

  // Group inventory items by medicine
  const medicineGroups = new Map<string, typeof inventoryItems>();
  for (const item of inventoryItems) {
    const list = medicineGroups.get(item.medicineId) || [];
    list.push(item);
    medicineGroups.set(item.medicineId, list);
  }

  const suggestions: ReorderSuggestion[] = [];

  for (const [medId, items] of medicineGroups.entries()) {
    const firstItem = items[0];
    const medicineName = firstItem.medicine.name;
    const genericName = firstItem.medicine.genericName;
    const category = firstItem.medicine.category;

    // Sum stock across all batches
    const currentStock = items.reduce((sum, item) => sum + item.quantity, 0);

    // Get max reorder level set across batches, fallback to 10
    const reorderLevel = Math.max(...items.map((i) => i.reorderLevel), 10);

    // Sales metrics
    const sales30Days = salesMap.get(medId) || 0;
    const avgDailySales = Number((sales30Days / 30).toFixed(2));

    // Dynamic reorder level based on sales velocity (lead time = 3 days, safety multiplier = 1.5)
    const leadTimeDays = 3;
    const safetyMultiplier = 1.5;
    const suggestedReorderLevel = Math.ceil(avgDailySales * leadTimeDays * safetyMultiplier);

    // Determine preferred supplier from latest batch or any active supplier
    const sortedByCreated = [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const preferredSupplierItem = sortedByCreated.find((i) => i.supplierId && i.supplier?.isActive);
    const preferredSupplierId = preferredSupplierItem?.supplierId || null;
    const preferredSupplierName = preferredSupplierItem?.supplier?.name || "Local Distributor";

    // Pricing
    const ptrPaisa = firstItem.purchaseRatePaisa || firstItem.medicine.ptrPaisa || 0;
    const mrpPaisa = firstItem.mrpPaisa || firstItem.medicine.mrpPaisa || 0;

    // Check if reorder is needed
    const needsReorder = currentStock <= reorderLevel || currentStock <= suggestedReorderLevel;

    if (needsReorder) {
      // Calculate suggested order qty (recommend 10 days of stock supply minus current stock)
      const targetDays = 10;
      let suggestedQty = Math.ceil(avgDailySales * targetDays) - currentStock;

      // If average sales are very low but stock is below static reorder level, recommend a standard package order
      if (suggestedQty <= 0) {
        suggestedQty = Math.max(20, reorderLevel * 2 - currentStock);
      }

      // Round suggestedQty to multiples of 10 for standard box sizing
      suggestedQty = Math.ceil(suggestedQty / 10) * 10;

      // Urgency determination
      let urgency: "critical" | "warning" | "adequate" = "warning";
      if (currentStock === 0 || currentStock <= Math.ceil(avgDailySales * 1.5)) {
        urgency = "critical";
      }

      suggestions.push({
        medicineId: medId,
        medicineName,
        genericName,
        category,
        currentStock,
        reorderLevel,
        suggestedReorderLevel,
        avgDailySales,
        sales30Days,
        suggestedQty,
        urgency,
        preferredSupplierId,
        preferredSupplierName,
        ptrPaisa,
        mrpPaisa,
      });
    }
  }

  // Sort: critical first, then alphabetical
  return suggestions.sort((a, b) => {
    if (a.urgency === "critical" && b.urgency !== "critical") return -1;
    if (a.urgency !== "critical" && b.urgency === "critical") return 1;
    return a.medicineName.localeCompare(b.medicineName);
  });
}
