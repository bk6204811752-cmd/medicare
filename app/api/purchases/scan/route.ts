import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { scannedInvoiceSchema } from "@/lib/validators";

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const parsed = scannedInvoiceSchema.parse(await request.json());
    const { supplierName, invoiceNo, items } = parsed;

    const tenantId = auth.ctx.tenantId;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve or create Supplier
      let supplier = await tx.supplier.findFirst({
        where: {
          tenantId,
          name: { equals: supplierName, mode: "insensitive" },
        },
      });

      if (!supplier) {
        supplier = await tx.supplier.create({
          data: {
            id: uid("sup"),
            tenantId,
            name: supplierName,
            creditDays: 30,
            balancePaisa: 0,
            isActive: true,
          },
        });
      }

      // 2. Create Completed Purchase Order
      const totalPaisa = items.reduce((sum, item) => sum + item.quantity * item.purchaseRatePaisa, 0);
      const poNumber = invoiceNo || `PO-SCAN-${Date.now().toString().slice(-6)}`;

      const po = await tx.purchaseOrder.create({
        data: {
          id: uid("po"),
          tenantId,
          poNumber,
          supplierId: supplier.id,
          status: "completed",
          totalPaisa,
          notes: `Imported via AI Digital Invoice Scanner`,
          orderDate: new Date(),
          receivedDate: new Date(),
        },
      });

      await tx.supplier.update({
        where: { id: supplier.id },
        data: { balancePaisa: { increment: totalPaisa } },
      });

      // 3. Process items and add to stock
      for (const item of items) {
        // Create PurchaseOrderItem
        await tx.purchaseOrderItem.create({
          data: {
            id: uid("poi"),
            purchaseOrderId: po.id,
            medicineName: item.medicineName,
            quantity: item.quantity,
            receivedQuantity: item.quantity,
            ratePaisa: item.purchaseRatePaisa,
            totalPaisa: item.quantity * item.purchaseRatePaisa,
          },
        });

        // Resolve global medicine record
        let medicine = await tx.medicine.findFirst({
          where: { name: { equals: item.medicineName, mode: "insensitive" } },
        });

        if (!medicine) {
          medicine = await tx.medicine.create({
            data: {
              id: uid("med"),
              name: item.medicineName,
              mrpPaisa: item.mrpPaisa || Math.round(item.purchaseRatePaisa * 1.25),
              gstRate: item.gstRate || 12,
              hsnCode: item.hsnCode || "30049099",
              barcode: item.barcode || null,
              schedule: "OTC",
              requiresPrescription: false,
            },
          });
        } else {
          // Dynamic master drug catalog enrichment
          const needsUpdate =
            (item.hsnCode && medicine.hsnCode !== item.hsnCode) ||
            (item.gstRate && medicine.gstRate !== item.gstRate) ||
            (item.barcode && medicine.barcode !== item.barcode);

          if (needsUpdate) {
            medicine = await tx.medicine.update({
              where: { id: medicine.id },
              data: {
                hsnCode: item.hsnCode || medicine.hsnCode,
                gstRate: item.gstRate || medicine.gstRate,
                barcode: item.barcode || medicine.barcode,
              },
            });
          }
        }

        // Upsert inventory stock
        const batch = item.batchNo || `B2B-SCAN`;
        const mfg = item.mfgDate ? new Date(item.mfgDate) : new Date();
        
        let expiry = new Date();
        if (item.expiryDate) {
          expiry = new Date(item.expiryDate);
        } else {
          expiry.setMonth(expiry.getMonth() + 18);
        }

        const invItem = await tx.inventoryItem.upsert({
          where: {
            tenantId_medicineId_batchNo: {
              tenantId,
              medicineId: medicine.id,
              batchNo: batch,
            },
          },
          create: {
            id: uid("inv"),
            tenantId,
            medicineId: medicine.id,
            batchNo: batch,
            mfgDate: mfg,
            expiryDate: expiry,
            purchaseRatePaisa: item.purchaseRatePaisa,
            mrpPaisa: item.mrpPaisa || medicine.mrpPaisa,
            saleRatePaisa: item.mrpPaisa || medicine.mrpPaisa,
            gstRate: medicine.gstRate,
            hsnCode: medicine.hsnCode,
            quantity: item.quantity,
            reorderLevel: 10,
            isActive: true,
            supplierId: supplier.id,
          },
          update: {
            quantity: { increment: item.quantity },
            purchaseRatePaisa: item.purchaseRatePaisa,
            isActive: true,
          },
        });

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            id: uid("mov"),
            tenantId,
            inventoryId: invItem.id,
            adjustmentType: "purchase",
            quantityDelta: item.quantity,
            reason: "AI Camera Invoice Uploaded",
            referenceNo: poNumber,
          },
        });
      }

      return { poId: po.id, poNumber, supplierName: supplier.name, totalPaisa };
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Purchases Scan import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import scanned invoice" },
      { status: 500 }
    );
  }
}
