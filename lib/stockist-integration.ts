import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/prisma";
import { hashOtp } from "@/lib/local-db";

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function generate6DigitOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function generateOrderNo(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SORD-${dateStr}-${rand}`;
}

function generatePoNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PO-${dateStr}-${rand}`;
}

// ─── Stockist Discovery ─────────────────────────────────────────

export async function getRegisteredStockists() {
  return await withRetry(() =>
    prisma.tenant.findMany({
      where: {
        users: {
          some: {
            role: { in: ["stockist_admin", "stockist_staff"] },
          },
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        phone: true,
        drugLicenseNo: true,
      },
      orderBy: { name: "asc" },
    })
  );
}

// ─── Chemist: Place Order to Stockist ──────────────────────────

export async function createStockistOrder(
  chemistTenantId: string,
  input: {
    stockistTenantId: string;
    notes?: string;
    items: { medicineName: string; quantity: number; ratePaisa?: number }[];
  }
) {
  const chemistTenant = await prisma.tenant.findUnique({
    where: { id: chemistTenantId },
    select: { name: true, phone: true },
  });
  if (!chemistTenant) throw new Error("Chemist tenant not found");

  const stockistTenant = await prisma.tenant.findUnique({
    where: { id: input.stockistTenantId },
    select: { id: true, name: true },
  });
  if (!stockistTenant) throw new Error("Stockist not found");

  const orderId = uid("sord");
  const orderNo = generateOrderNo();

  const totalPaisa = input.items.reduce(
    (sum, item) => sum + (item.ratePaisa || 0) * item.quantity,
    0
  );

  return await prisma.$transaction(async (tx) => {
    const order = await tx.stockistOrder.create({
      data: {
        id: orderId,
        orderNo,
        chemistTenantId,
        stockistTenantId: input.stockistTenantId,
        chemistName: chemistTenant.name,
        chemistPhone: chemistTenant.phone || null,
        status: "pending",
        notes: input.notes || null,
        totalPaisa,
      },
    });

    for (const item of input.items) {
      await tx.stockistOrderItem.create({
        data: {
          id: uid("soi"),
          orderId,
          medicineName: item.medicineName,
          quantity: item.quantity,
          ratePaisa: item.ratePaisa || 0,
          totalPaisa: (item.ratePaisa || 0) * item.quantity,
        },
      });
    }

    // Notify stockist
    await tx.inAppNotification.create({
      data: {
        id: uid("notif"),
        tenantId: input.stockistTenantId,
        type: "stockist_order_placed",
        title: "New Order Received",
        message: `${chemistTenant.name} has placed an order for ${input.items.length} item(s). Order No: ${orderNo}`,
        payload: JSON.stringify({ orderId, orderNo }),
        isRead: false,
      },
    });

    return order;
  });
}

// ─── Chemist: List Own Orders ───────────────────────────────────

export async function getStockistOrdersForChemist(chemistTenantId: string) {
  return await withRetry(() =>
    prisma.stockistOrder.findMany({
      where: { chemistTenantId },
      include: {
        items: true,
        stockistTenant: {
          select: { id: true, name: true, city: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  );
}

// ─── Stockist: List Incoming Orders ────────────────────────────

export async function getIncomingOrdersForStockist(stockistTenantId: string) {
  return await withRetry(() =>
    prisma.stockistOrder.findMany({
      where: { stockistTenantId },
      include: {
        items: true,
        chemistTenant: {
          select: { id: true, name: true, city: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  );
}

// ─── Stockist: Accept Order — Generates OTP ────────────────────

export async function acceptOrder(orderId: string, stockistTenantId: string) {
  const order = await prisma.stockistOrder.findFirst({
    where: { id: orderId, stockistTenantId },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found");
  if (order.status !== "pending") throw new Error("Order is not in pending state");

  const otp = generate6DigitOtp();
  const otpExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  return await prisma.$transaction(async (tx) => {
    const freshOrder = await tx.stockistOrder.findFirst({
      where: { id: orderId, stockistTenantId },
      select: { status: true }
    });
    if (!freshOrder) throw new Error("Order not found");
    if (freshOrder.status !== "pending") throw new Error("Order is no longer in pending state");

    const updated = await tx.stockistOrder.update({
      where: { id: orderId },
      data: {
        status: "otp_sent",
        otp: hashOtp(otp), // Store hashed OTP, not plaintext
        otpExpiresAt,
      },
    });


    // Notify chemist with OTP
    await tx.inAppNotification.create({
      data: {
        id: uid("notif"),
        tenantId: order.chemistTenantId,
        type: "otp_ready",
        title: "Order Accepted — OTP Ready",
        message: `Your order ${order.orderNo} has been accepted. Show this OTP to the delivery person.`,
        payload: JSON.stringify({
          orderId,
          orderNo: order.orderNo,
          otp,
          otpExpiresAt: otpExpiresAt.toISOString(),
          stockistName: order.chemistName, // will be resolved on client
        }),
        isRead: false,
      },
    });

    return updated;
  });
}

// ─── Stockist: Reject Order ─────────────────────────────────────

export async function rejectOrder(
  orderId: string,
  stockistTenantId: string,
  reason?: string
) {
  const order = await prisma.stockistOrder.findFirst({
    where: { id: orderId, stockistTenantId },
  });
  if (!order) throw new Error("Order not found");
  if (!["pending", "otp_sent"].includes(order.status))
    throw new Error("Order cannot be rejected in its current state");

  return await prisma.$transaction(async (tx) => {
    const freshOrder = await tx.stockistOrder.findFirst({
      where: { id: orderId, stockistTenantId },
      select: { status: true }
    });
    if (!freshOrder) throw new Error("Order not found");
    if (!["pending", "otp_sent"].includes(freshOrder.status)) {
      throw new Error("Order cannot be rejected in its current state");
    }

    const updated = await tx.stockistOrder.update({
      where: { id: orderId },
      data: { status: "cancelled" },
    });

    await tx.inAppNotification.create({
      data: {
        id: uid("notif"),
        tenantId: order.chemistTenantId,
        type: "order_rejected",
        title: "Order Rejected",
        message: `Your order ${order.orderNo} was rejected by the stockist.${reason ? ` Reason: ${reason}` : ""}`,
        payload: JSON.stringify({ orderId, orderNo: order.orderNo }),
        isRead: false,
      },
    });

    return updated;
  });
}

// ─── Stockist: Confirm Delivery via OTP ────────────────────────

export async function confirmDelivery(
  orderId: string,
  otp: string,
  stockistTenantId: string
) {
  const order = await prisma.stockistOrder.findFirst({
    where: { id: orderId, stockistTenantId },
    include: {
      items: true,
      stockistTenant: { select: { name: true, phone: true, address: true } },
    },
  });

  if (!order) throw new Error("Order not found");
  if (order.status !== "otp_sent")
    throw new Error("Order is not awaiting delivery confirmation");
  if (!order.otp || order.otp !== hashOtp(otp)) throw new Error("Invalid OTP");
  if (order.otpExpiresAt && order.otpExpiresAt < new Date())
    throw new Error("OTP has expired");

  return await prisma.$transaction(async (tx) => {
    const freshOrder = await tx.stockistOrder.findFirst({
      where: { id: orderId, stockistTenantId },
      select: { status: true }
    });
    if (!freshOrder) throw new Error("Order not found");
    if (freshOrder.status !== "otp_sent") {
      throw new Error("Order is no longer awaiting delivery confirmation");
    }

    // Mark order delivered
    const updated = await tx.stockistOrder.update({
      where: { id: orderId },
      data: {
        status: "delivered",
        otpVerifiedAt: new Date(),
        otp: null, // clear OTP after use
      },
    });

    // ── Auto Purchase Entry in Chemist's tenant ──────────────────
    // 1. Find or create Supplier record in chemist's tenant
    let supplier = await tx.supplier.findFirst({
      where: {
        tenantId: order.chemistTenantId,
        name: order.stockistTenant.name,
      },
    });

    if (!supplier) {
      supplier = await tx.supplier.create({
        data: {
          id: uid("sup"),
          tenantId: order.chemistTenantId,
          name: order.stockistTenant.name,
          phone: order.stockistTenant.phone || null,
          address: order.stockistTenant.address || null,
          isActive: true,
        },
      });
    }

    // 2. Create PurchaseOrder with all items
    const poNumber = generatePoNumber();
    const totalPaisa = order.items.reduce((s, i) => s + i.totalPaisa, 0);

    const po = await tx.purchaseOrder.create({
      data: {
        id: uid("po"),
        tenantId: order.chemistTenantId,
        poNumber,
        supplierId: supplier.id,
        status: "completed",
        totalPaisa,
        notes: `Auto-created from Stockist Order ${order.orderNo}`,
        orderDate: order.orderDate,
        receivedDate: new Date(),
      },
    });

    for (const item of order.items) {
      await tx.purchaseOrderItem.create({
        data: {
          id: uid("poi"),
          purchaseOrderId: po.id,
          medicineName: item.medicineName,
          quantity: item.quantity,
          receivedQuantity: item.quantity,
          ratePaisa: item.ratePaisa,
          totalPaisa: item.totalPaisa,
        },
      });

      // ─── Real-Time Inventory & Stock Sync ──────────────────────────
      // 1. Resolve medicine globally by name (case-insensitive)
      let medicine = await tx.medicine.findFirst({
        where: { name: { equals: item.medicineName, mode: "insensitive" } }
      });

      if (!medicine) {
        medicine = await tx.medicine.create({
          data: {
            id: uid("med"),
            name: item.medicineName,
            mrpPaisa: item.ratePaisa ? Math.round(item.ratePaisa * 1.25) : 10000,
            gstRate: 12,
            schedule: "OTC",
            requiresPrescription: false
          }
        });
      }

      // 2. Add stock to Chemist's inventory
      const batch = item.batchNo || `B2B-${order.orderNo}`;
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + 18); // Default 1.5 year expiry

      const chemistInv = await tx.inventoryItem.upsert({
        where: {
          tenantId_medicineId_batchNo: {
            tenantId: order.chemistTenantId,
            medicineId: medicine.id,
            batchNo: batch
          }
        },
        create: {
          id: uid("inv"),
          tenantId: order.chemistTenantId,
          medicineId: medicine.id,
          batchNo: batch,
          mfgDate: new Date(),
          expiryDate: expiry,
          purchaseRatePaisa: item.ratePaisa || 0,
          mrpPaisa: medicine.mrpPaisa,
          saleRatePaisa: medicine.mrpPaisa,
          gstRate: medicine.gstRate,
          hsnCode: medicine.hsnCode,
          quantity: item.quantity,
          reorderLevel: 5,
          isActive: true,
          supplierId: supplier.id
        },
        update: {
          quantity: { increment: item.quantity },
          purchaseRatePaisa: item.ratePaisa || 0,
          isActive: true
        }
      });

      // 3. Record StockMovement for Chemist
      await tx.stockMovement.create({
        data: {
          id: uid("mov"),
          tenantId: order.chemistTenantId,
          inventoryId: chemistInv.id,
          adjustmentType: "purchase",
          quantityDelta: item.quantity,
          reason: "B2B Stockist Delivery Received",
          referenceNo: poNumber,
          notes: `Automatically received from Stockist Order ${order.orderNo}`
        }
      });

      // 4. Deduct stock from Stockist's inventory if matching stock is found (FIFO)
      let remainingDeductQty = item.quantity;
      while (remainingDeductQty > 0) {
        const stockistInv = await tx.inventoryItem.findFirst({
          where: {
            tenantId: order.stockistTenantId,
            medicineId: medicine.id,
            isActive: true,
            quantity: { gt: 0 }
          },
          orderBy: { expiryDate: "asc" } // FIFO
        });

        if (!stockistInv) {
          break;
        }

        const deductQty = Math.min(remainingDeductQty, stockistInv.quantity);
        if (deductQty > 0) {
          await tx.inventoryItem.update({
            where: { id: stockistInv.id },
            data: { quantity: { decrement: deductQty } }
          });

          await tx.stockMovement.create({
            data: {
              id: uid("mov"),
              tenantId: order.stockistTenantId,
              inventoryId: stockistInv.id,
              adjustmentType: "sale",
              quantityDelta: -deductQty,
              reason: "B2B Chemist Order Delivered",
              referenceNo: order.orderNo,
              notes: `Delivered to Chemist ${order.chemistName}`
            }
          });

          remainingDeductQty -= deductQty;
        } else {
          break;
        }
      }
    }

    // 3. Notify chemist about auto-created PO
    await tx.inAppNotification.create({
      data: {
        id: uid("notif"),
        tenantId: order.chemistTenantId,
        type: "purchase_auto_created",
        title: "Purchase Entry Created Automatically ✓",
        message: `Order ${order.orderNo} delivered! Purchase Order ${poNumber} has been auto-created in your purchases.`,
        payload: JSON.stringify({
          orderId,
          orderNo: order.orderNo,
          poNumber,
          poId: po.id,
          supplierName: order.stockistTenant.name,
          itemCount: order.items.length,
          totalPaisa,
        }),
        isRead: false,
      },
    });

    return { order: updated, purchaseOrder: po, poNumber };
  });
}

// ─── In-App Notifications ───────────────────────────────────────

export async function getInAppNotifications(tenantId: string) {
  return await withRetry(() =>
    prisma.inAppNotification.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
  );
}

export async function getUnreadInAppCount(tenantId: string) {
  return await withRetry(() =>
    prisma.inAppNotification.count({
      where: { tenantId, isRead: false },
    })
  );
}

export async function markInAppNotificationsRead(
  tenantId: string,
  ids?: string[]
) {
  const where = ids?.length
    ? { tenantId, id: { in: ids } }
    : { tenantId, isRead: false };

  return await prisma.inAppNotification.updateMany({
    where,
    data: { isRead: true },
  });
}

// ─── Fetch All Stockists Inventory ──────────────────────────────
export async function getAllStockistInventory() {
  const stockists = await getRegisteredStockists();
  const stockistTenantIds = stockists.map((s) => s.id);

  return await withRetry(() =>
    prisma.inventoryItem.findMany({
      where: {
        tenantId: { in: stockistTenantIds },
        isActive: true,
        quantity: { gt: 0 },
      },
      include: {
        medicine: true,
        tenant: {
          select: {
            id: true,
            name: true,
            city: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { medicine: { name: "asc" } },
        { saleRatePaisa: "asc" },
      ],
    })
  );
}
