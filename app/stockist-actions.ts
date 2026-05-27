"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  createRoute,
  createSalesman,
  createParty,
  updateParty,
  createReceipt,
  createB2BSalesOrder,
  createB2BSale,
  createB2BIndent
} from "@/lib/stockist-db";

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function redirectWith(path: string, type: "success" | "error", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

// ─── Route Actions ───────────────────────────────────────────

export async function createRouteAction(formData: FormData) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) redirect("/login");

  const name = formValue(formData, "name");
  const code = formValue(formData, "code");
  const description = formValue(formData, "description");

  if (!name) {
    redirectWith("/stockist/settings", "error", "Route name is required");
  }

  try {
    await createRoute(tid, { name, code, description });
  } catch (error) {
    console.error("createRouteAction error:", error);
    redirectWith("/stockist/settings", "error", "Failed to create Route");
  }

  redirectWith("/stockist/settings", "success", "Route created successfully!");
}

// ─── Salesman Actions ────────────────────────────────────────

export async function createSalesmanAction(formData: FormData) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) redirect("/login");

  const name = formValue(formData, "name");
  const phone = formValue(formData, "phone");
  const email = formValue(formData, "email");
  const targetPaisa = Math.round(Number(formValue(formData, "target") || 0) * 100);
  const commissionPercent = Number(formValue(formData, "commissionPercent") || 0.0);
  const commissionOn = formValue(formData, "commissionOn") || "sales";

  const routeIdsRaw = formData.getAll("routeIds");
  const routeIds = routeIdsRaw.map((v) => String(v));

  if (!name) {
    redirectWith("/stockist/salesmen", "error", "Salesman name is required");
  }

  try {
    await createSalesman(tid, {
      name,
      phone,
      email,
      targetPaisa,
      commissionPercent,
      commissionOn,
      routeIds,
    });
  } catch (error) {
    console.error("createSalesmanAction error:", error);
    redirectWith("/stockist/salesmen", "error", "Failed to add field executive");
  }

  redirectWith("/stockist/salesmen", "success", "Salesman added successfully!");
}

// ─── Party Actions ───────────────────────────────────────────

export async function createPartyAction(formData: FormData) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) redirect("/login");

  const name = formValue(formData, "name");
  const phone = formValue(formData, "phone");
  const email = formValue(formData, "email");
  const address = formValue(formData, "address");
  const gstin = formValue(formData, "gstin");
  const drugLicenseNo = formValue(formData, "drugLicenseNo");
  const creditLimitPaisa = Math.round(Number(formValue(formData, "creditLimit") || 0) * 100);
  const routeId = formValue(formData, "routeId");

  if (!name) {
    redirectWith("/stockist/parties", "error", "Party name is required");
  }

  try {
    await createParty(tid, {
      name,
      phone,
      email,
      address,
      gstin,
      drugLicenseNo,
      creditLimitPaisa,
      routeId: routeId || undefined,
    });
  } catch (error) {
    console.error("createPartyAction error:", error);
    redirectWith("/stockist/parties", "error", "Failed to register Party");
  }

  redirectWith("/stockist/parties", "success", "Retail chemist party registered successfully!");
}

export async function updatePartyAction(formData: FormData) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) redirect("/login");

  const id = formValue(formData, "id");
  const name = formValue(formData, "name");
  const phone = formValue(formData, "phone");
  const email = formValue(formData, "email");
  const address = formValue(formData, "address");
  const gstin = formValue(formData, "gstin");
  const drugLicenseNo = formValue(formData, "drugLicenseNo");
  const creditLimitPaisa = Math.round(Number(formValue(formData, "creditLimit") || 0) * 100);
  const routeId = formValue(formData, "routeId");
  const outstandingPaisa = Math.round(Number(formValue(formData, "outstanding") || 0) * 100);

  if (!id || !name) {
    redirectWith("/stockist/parties", "error", "Chemist ID and name are required");
  }

  try {
    await updateParty(tid, id, {
      name,
      phone,
      email,
      address,
      gstin,
      drugLicenseNo,
      creditLimitPaisa,
      routeId: routeId || undefined,
      outstandingPaisa,
    });
  } catch (error) {
    console.error("updatePartyAction error:", error);
    redirectWith("/stockist/parties", "error", "Failed to update Chemist details");
  }

  redirectWith("/stockist/parties", "success", "Chemist party details and credit metrics updated successfully!");
}

// ─── Receipt Actions ──────────────────────────────────────────

export async function createReceiptAction(formData: FormData) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) redirect("/login");

  const partyId = formValue(formData, "partyId");
  const salesmanId = formValue(formData, "salesmanId");
  const amountPaisa = Math.round(Number(formValue(formData, "amount") || 0) * 100);
  const paymentMode = formValue(formData, "paymentMode");
  const referenceNo = formValue(formData, "referenceNo");
  const notes = formValue(formData, "notes");

  if (!partyId || !amountPaisa || !paymentMode) {
    redirectWith("/stockist/collection", "error", "Incomplete collection receipt details");
  }

  try {
    await createReceipt(tid, {
      partyId,
      salesmanId: salesmanId || undefined,
      amountPaisa,
      paymentMode,
      referenceNo,
      notes,
    });
  } catch (error) {
    console.error("createReceiptAction error:", error);
    redirectWith("/stockist/collection", "error", "Failed to log collection receipt");
  }

  redirectWith("/stockist/collection", "success", "Collection receipt logged and outstanding updated successfully!");
}

// ─── B2B Sales & POS Direct Billing ──────────────────────────

export async function createB2BSaleAction(input: {
  partyId: string;
  salesmanId?: string;
  orderId?: string;
  paymentMode?: string;
  invoiceType?: string;
  discountPaisa?: number;
  notes?: string;
  items: {
    inventoryId: string;
    quantity: number;
    freeQuantity?: number;
    saleRatePaisa: number;
    discountPercent?: number;
    schemeDetails?: string;
  }[];
}) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) throw new Error("Unauthorized");

  try {
    const sale = await createB2BSale(tid, input);
    return { success: true, invoiceNo: sale.invoiceNo };
  } catch (e: any) {
    console.error("createB2BSaleAction error:", e);
    return { success: false, error: e.message || "Failed to generate B2B Invoice" };
  }
}

export async function createB2BSalesOrderAction(input: {
  partyId: string;
  salesmanId?: string;
  notes?: string;
  items: { medicineId: string; medicineName: string; quantity: number; freeQuantity?: number; ratePaisa: number }[];
}) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) throw new Error("Unauthorized");

  try {
    const order = await createB2BSalesOrder(tid, input);
    return { success: true, orderNo: order.orderNo };
  } catch (e: any) {
    console.error("createB2BSalesOrderAction error:", e);
    return { success: false, error: e.message || "Failed to book B2B Sales Order" };
  }
}

export async function createStockistSupplierAction(formData: FormData) {
  const user = await requireUser();
  const tid = user.tenantId;
  if (!tid) redirect("/login");

  const name = formValue(formData, "name");
  const phone = formValue(formData, "phone");
  const email = formValue(formData, "email");
  const address = formValue(formData, "address");
  const gstin = formValue(formData, "gstin");
  const creditDays = Number(formValue(formData, "creditDays") || 30);

  if (!name) {
    redirectWith("/stockist/suppliers", "error", "Manufacturer name is required");
  }

  try {
    const prismaModule = await import("@/lib/prisma");
    const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    
    await prismaModule.prisma.supplier.create({
      data: {
        id: uid("sup"),
        tenantId: tid,
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        gstin: gstin || null,
        creditDays,
        balancePaisa: 0,
        isActive: true,
      },
    });
  } catch (error) {
    console.error("createStockistSupplierAction error:", error);
    redirectWith("/stockist/suppliers", "error", "Failed to register Manufacturer");
  }

  redirectWith("/stockist/suppliers", "success", "Manufacturer / CFA registered successfully!");
}
