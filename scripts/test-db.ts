import { prisma } from "../lib/prisma";
import { createB2BSale } from "../lib/stockist-db";

async function main() {
  console.log("Connecting to DB...");
  try {
    // 1. Get tenants
    const tenants = await prisma.tenant.findMany({ take: 5 });
    console.log("Tenants found:", tenants.map((t: any) => ({ id: t.id, name: t.name })));
    
    if (tenants.length === 0) {
      console.log("No tenants found in DB!");
      return;
    }

    const tenantId = tenants[0].id;
    console.log(`Using Tenant ID: ${tenantId}`);

    // 2. Get parties
    const parties = await prisma.party.findMany({ where: { tenantId } });
    console.log("Parties found:", parties.map((p: any) => ({ id: p.id, name: p.name })));

    if (parties.length === 0) {
      console.log("No parties found for this tenant. Creating a test party...");
      // Let's create one if needed
    }

    // 3. Get inventory
    const inventory = await prisma.inventoryItem.findMany({
      where: { tenantId, quantity: { gt: 0 } },
      include: { medicine: true },
      take: 5
    });
    console.log("Inventory items in-stock:", inventory.map((i: any) => ({
      id: i.id,
      name: i.medicine.name,
      qty: i.quantity,
      ptr: i.ptrPaisa
    })));

    if (parties.length > 0 && inventory.length > 0) {
      const partyId = parties[0].id;
      const invId = inventory[0].id;
      
      console.log(`Attempting B2B Sale simulation for partyId: ${partyId}, inventoryId: ${invId}`);
      
      const result = await createB2BSale(tenantId, {
        partyId,
        paymentMode: "credit",
        invoiceType: "invoice",
        items: [
          {
            inventoryId: invId,
            quantity: 1,
            freeQuantity: 0,
            saleRatePaisa: inventory[0].ptrPaisa || 100,
            discountPercent: 0,
          }
        ]
      });
      console.log("Sale created successfully! Invoice No:", result.invoiceNo);
    } else {
      console.log("Cannot run simulation: need at least one party and one in-stock inventory item.");
    }
  } catch (err: any) {
    console.error("CRITICAL ERROR during simulation:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
