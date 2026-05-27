import { prisma } from "@/lib/prisma";

export type RefillReminder = {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  medicineName: string;
  lastPurchasedDate: Date;
  quantity: number;
  exhaustionDate: Date;
  daysRemaining: number;
  urgency: "due_soon" | "overdue" | "safe";
};

export async function getRefillReminders(tenantId: string): Promise<RefillReminder[]> {
  // 1. Fetch sales in the last 90 days to identify patient purchase habits
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const sales = await prisma.sale.findMany({
    where: {
      tenantId,
      customerId: { not: null },
      createdAt: { gte: ninetyDaysAgo },
    },
    include: {
      customer: true,
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
    orderBy: { createdAt: "desc" },
  });

  if (sales.length === 0) return [];

  // Group purchases by customer and medicine
  // key: customerId_medicineId
  const purchaseGroups = new Map<string, typeof sales[0]["items"]>();
  const latestSaleMap = new Map<string, Date>();
  const customerMap = new Map<string, any>();

  for (const sale of sales) {
    if (!sale.customer) continue;
    
    // Save customer details
    customerMap.set(sale.customerId!, sale.customer);

    for (const item of sale.items) {
      if (!item.inventory) continue;
      const medName = item.inventory.medicine.name;
      const key = `${sale.customerId!}_${medName}`;

      const list = purchaseGroups.get(key) || [];
      list.push(item);
      purchaseGroups.set(key, list);

      const existingLatest = latestSaleMap.get(key);
      if (!existingLatest || sale.createdAt > existingLatest) {
        latestSaleMap.set(key, sale.createdAt);
      }
    }
  }

  const reminders: RefillReminder[] = [];
  const now = new Date();

  for (const [key, items] of purchaseGroups.entries()) {
    const [customerId, medicineName] = key.split("_");
    const customer = customerMap.get(customerId);
    const latestSaleDate = latestSaleMap.get(key)!;

    // Chronic identification: if the user bought this medicine more than once, OR if quantity > 20 (monthly maintenance pack)
    const latestItem = items[0]; // items are in desc order due to sales query sorting
    const isChronic = items.length > 1 || latestItem.quantity >= 20;

    if (isChronic) {
      const quantity = latestItem.quantity;
      
      // Predict exhaustion: standard 1 tablet per day dosage
      const exhaustionDate = new Date(latestSaleDate);
      exhaustionDate.setDate(exhaustionDate.getDate() + quantity);

      // Calculations
      const msDiff = exhaustionDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

      let urgency: "due_soon" | "overdue" | "safe" = "safe";
      if (daysRemaining < 0) {
        urgency = "overdue";
      } else if (daysRemaining <= 7) {
        urgency = "due_soon";
      }

      // Only alert if refill is due soon (<= 7 days) or already overdue (up to 30 days overdue)
      if (daysRemaining <= 7 && daysRemaining >= -30) {
        reminders.push({
          customerId,
          customerName: customer.name,
          customerPhone: customer.phone || null,
          medicineName,
          lastPurchasedDate: latestSaleDate,
          quantity,
          exhaustionDate,
          daysRemaining,
          urgency,
        });
      }
    }
  }

  // Sort: overdue first, then days remaining ascending
  return reminders.sort((a, b) => {
    if (a.urgency === "overdue" && b.urgency !== "overdue") return -1;
    if (a.urgency !== "overdue" && b.urgency === "overdue") return 1;
    return a.daysRemaining - b.daysRemaining;
  });
}
