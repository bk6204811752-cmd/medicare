import crypto from "node:crypto";
import { Prisma, type Medicine, type Sale, type SaleItem, type Supplier, type Tenant } from "@prisma/client";
import { calculateBillTotals } from "@/lib/gst";
import { prisma, withRetry } from "@/lib/prisma";
import type { SaleLine } from "@/lib/types";
import { createCustomerSchema, createInventorySchema, createMedicineSchema, createSaleSchema, createSupplierSchema, quickAddMedicineSchema, stockAdjustmentSchema } from "@/lib/validators";

export const DEMO_TENANT_ID = "tenant-sharma";

// ─── Caches ──────────────────────────────────────────────────
const salesSummaryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds

// ─── Prisma payload types ────────────────────────────────────

type InventoryWithRelations = Prisma.InventoryItemGetPayload<{
  include: { medicine: true; supplier: true };
}>;

type UserWithTenant = Prisma.UserGetPayload<{
  include: { tenant: true };
}>;

type StockMovementWithInventory = Prisma.StockMovementGetPayload<{
  include: { inventory: { include: { medicine: true } } };
}>;

type ScheduleHWithSaleItem = Prisma.ScheduleHRegisterGetPayload<{
  include: { saleItem: true };
}>;

// ─── Public type exports ─────────────────────────────────────

export type LocalMedicine = {
  id: string;
  name: string;
  genericName: string | null;
  manufacturer: string | null;
  category: string | null;
  composition: string | null;
  dosageForm: string | null;
  strength: string | null;
  packSize: string | null;
  hsnCode: string | null;
  gstRate: number;
  mrpPaisa: number;
  schedule: string;
  barcode: string | null;
  requiresPrescription: boolean;
};

export type LocalSupplier = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  creditDays: number;
  balancePaisa: number;
};

export type LocalCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  doctorName: string | null;
  outstandingPaisa: number;
  loyaltyPoints: number;
};

export type LocalInventoryRow = {
  id: string;
  tenantId: string;
  medicineId: string;
  batchNo: string;
  mfgDate: string | null;
  expiryDate: string;
  purchaseRatePaisa: number;
  mrpPaisa: number;
  saleRatePaisa: number;
  gstRate: number;
  hsnCode: string | null;
  quantity: number;
  reorderLevel: number;
  rackLocation: string | null;
  supplierId: string | null;
  medicine: LocalMedicine;
  supplier: LocalSupplier | null;
};

export type LocalTenant = {
  id: string;
  name: string;
  slug: string;
  ownerName: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  state: string | null;
  gstin: string | null;
  drugLicenseNo: string | null;
  upiId: string | null;
  plan: string;
  isActive: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
  profilePicUrl?: string | null;
  address?: string | null;
};

export type LocalUser = {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: "super_admin" | "shop_admin" | "stockist_admin" | "staff" | "pharmacist" | "stockist_staff";
  isActive: boolean;
  tenantName: string | null;
  tenantApprovalStatus: "pending" | "approved" | "rejected" | null;
};

export type LocalStockMovement = {
  id: string;
  inventoryId: string;
  medicineName: string;
  batchNo: string;
  quantityDelta: number;
  adjustmentType: string;
  reason: string;
  referenceNo: string | null;
  notes: string | null;
  createdAt: string;
};

type LegacySaleRow = Record<string, unknown>;
type LegacySaleItemRow = Record<string, unknown>;
type LegacyUserWithPassword = Record<string, unknown> & { password_hash: string };

// ─── Demo data (seed only) ───────────────────────────────────

const demoTenant = {
  id: DEMO_TENANT_ID,
  name: "Sharma Medical Store",
  slug: "sharma-medical-ranchi",
  ownerName: "Basant Kumar",
  phone: "+91 98765 43210",
  email: "owner@sharmamedical.local",
  city: "Ranchi",
  state: "Jharkhand",
  gstin: "20ABCDE1234F1Z5",
  drugLicenseNo: "JH/RNC/2026/4521",
  plan: "free",
  isActive: true,
  approvalStatus: "approved"
};

const demoSuppliers = [
  { id: "sup-medline", name: "Medline Distributors", phone: "9334411122", gstin: "20AABCM1234L1Z2", creditDays: 30, balancePaisa: 4500000 },
  { id: "sup-health", name: "HealthFirst Agency", phone: "9431122299", gstin: "20AADFH5678Q1Z6", creditDays: 21, balancePaisa: 1850000 }
];

const demoMedicines = [
  ["med-azithral", "Azithral 500 Tablet", "Azithromycin", "Alembic Pharma", "Antibiotic", "Azithromycin 500mg", "Tablet", "500mg", "Strip of 5", "30049069", 12, 11950, "H", "8901234500011", true],
  ["med-dolo", "Dolo 650 Tablet", "Paracetamol", "Micro Labs", "Pain relief", "Paracetamol 650mg", "Tablet", "650mg", "Strip of 15", "30049099", 12, 3350, "G", "8901234500028", false],
  ["med-glycomet", "Glycomet GP 1 Tablet", "Glimepiride + Metformin", "USV", "Diabetes", "Glimepiride 1mg + Metformin 500mg", "Tablet", "1mg/500mg", "Strip of 15", "30049076", 12, 12800, "H", "8901234500035", true],
  ["med-ors", "Electral ORS Sachet", "Oral Rehydration Salts", "FDC", "Hydration", "WHO ORS formula", "Powder", "21.8g", "1 sachet", "30049099", 5, 2300, "OTC", "8901234500042", false],
  ["med-becosules", "Becosules Capsule", "Vitamin B Complex", "Pfizer", "Vitamin", "B-complex vitamins", "Capsule", "Multivitamin", "Strip of 20", "30045039", 18, 5250, "OTC", "8901234500059", false],
  ["med-insulin", "Human Mixtard 30/70 Cartridge", "Human Insulin", "Novo Nordisk", "Diabetes", "Biphasic insulin", "Injection", "100IU/ml", "3ml cartridge", "30043110", 0, 43800, "H", "8901234500066", true]
] as const;

const demoInventory = [
  ["inv-1", "med-azithral", "AZT2408", "2025-01-10", "2026-07-30", 8200, 11950, 11200, 12, "30049069", 18, 10, "A1", "sup-medline"],
  ["inv-2", "med-dolo", "DL650A", "2025-03-05", "2027-02-28", 2100, 3350, 3200, 12, "30049099", 96, 25, "B2", "sup-medline"],
  ["inv-3", "med-glycomet", "GP1251", "2024-10-12", "2026-06-20", 9200, 12800, 12100, 12, "30049076", 7, 12, "C4", "sup-health"],
  ["inv-4", "med-ors", "ORS991", "2025-05-01", "2026-05-30", 1500, 2300, 2200, 5, "30049099", 5, 20, "B1", "sup-health"],
  ["inv-5", "med-becosules", "BC2409", "2024-09-20", "2026-09-15", 3600, 5250, 5000, 18, "30045039", 42, 15, "D2", "sup-medline"],
  ["inv-6", "med-insulin", "INSMX2", "2025-02-01", "2026-06-05", 36000, 43800, 43000, 0, "30043110", 4, 8, "FRIDGE-1", "sup-health"]
] as const;

const demoCustomers = [
  { id: "cust-1", name: "Ravi Prasad", phone: "9876501111", doctorName: "Dr. Mehta", outstandingPaisa: 125000, loyaltyPoints: 84 },
  { id: "cust-2", name: "Anita Devi", phone: "9876502222", doctorName: "Dr. Sinha", outstandingPaisa: 0, loyaltyPoints: 42 },
  { id: "cust-3", name: "Walk-in Customer", phone: "", outstandingPaisa: 0, loyaltyPoints: 0 }
];

// ─── Bootstrap ───────────────────────────────────────────────

let _bootstrapped = false;
let _bootstrapPromise: Promise<void> | null = null;

function ensureDefaultData(): Promise<void> | void {
  // Fast path: already bootstrapped (after first successful seed)
  // This is synchronous — zero async overhead for 41 call sites.
  if (_bootstrapped) return;

  _bootstrapPromise ??= seedDefaultData()
    .then(() => { _bootstrapped = true; })
    .catch((error) => {
      _bootstrapPromise = null;
      throw error;
    });
  return _bootstrapPromise;
}

async function seedDefaultData() {
  try {
    const tenantCount = await prisma.tenant.count();
    if (tenantCount > 0) {
      await ensureDefaultUsers();
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.tenant.create({ data: demoTenant });

      await tx.user.create({
        data: {
          id: "user-super-admin",
          tenantId: null,
          name: "Super Admin",
          email: "admin@medcare.local",
          phone: "+91 90000 00000",
          passwordHash: await hashPassword("Admin@12345"),
          role: "super_admin",
          isActive: true
        }
      });

      await tx.user.create({
        data: {
          id: "user-sharma-owner",
          tenantId: DEMO_TENANT_ID,
          name: "Basant Kumar",
          email: "owner@sharmamedical.local",
          phone: "+91 98765 43210",
          passwordHash: await hashPassword("Shop@12345"),
          role: "shop_admin",
          isActive: true
        }
      });

      for (const supplier of demoSuppliers) {
        await tx.supplier.create({ data: { ...supplier, tenantId: DEMO_TENANT_ID } });
      }

      for (const medicine of demoMedicines) {
        const [id, name, genericName, manufacturer, category, composition, dosageForm, strength, packSize, hsnCode, gstRate, mrpPaisa, schedule, barcode, requiresPrescription] = medicine;
        await tx.medicine.create({
          data: { id, name, genericName, manufacturer, category, composition, dosageForm, strength, packSize, hsnCode, gstRate, mrpPaisa, schedule, barcode, requiresPrescription }
        });
      }

      for (const item of demoInventory) {
        const [invId, medicineId, batchNo, mfgDate, expiryDate, purchaseRatePaisa, mrpPaisa, saleRatePaisa, gstRate, hsnCode, quantity, reorderLevel, rackLocation, supplierId] = item;
        await tx.inventoryItem.create({
          data: {
            id: invId, tenantId: DEMO_TENANT_ID, medicineId, batchNo,
            mfgDate: dateOnly(mfgDate), expiryDate: dateOnly(expiryDate),
            purchaseRatePaisa, mrpPaisa, saleRatePaisa, gstRate, hsnCode,
            quantity, reorderLevel, rackLocation, supplierId
          }
        });
      }

      for (const customer of demoCustomers) {
        await tx.customer.create({ data: { ...customer, tenantId: DEMO_TENANT_ID } });
      }
    });
  } catch (error) {
    // If it fails (e.g. parallel thread already seeded the database), check if seeded data exists
    const tenantCount = await prisma.tenant.count().catch(() => 0);
    if (tenantCount > 0) {
      console.warn("Parallel seeding detected. Recovered safely, checking default users next...");
      await ensureDefaultUsers().catch(() => {});
      return;
    }
    throw error;
  }
}

async function ensureDefaultUsers() {
  // 1. Super Admin
  try {
    const superAdmin = await prisma.user.findUnique({ where: { email: "admin@medcare.local" } });
    if (!superAdmin) {
      await prisma.user.create({
        data: {
          id: "user-super-admin", tenantId: null, name: "Super Admin",
          email: "admin@medcare.local", phone: "+91 90000 00000",
          passwordHash: await hashPassword("Admin@12345"), role: "super_admin", isActive: true
        }
      }).catch((e) => {
        console.warn("Safe Warning: Parallel super admin insert resolved:", e.message);
      });
    }
  } catch (err) {
    console.warn("Safe Warning: Parallel super admin check caught:", err);
  }

  // 2. Demo Shopkeeper Owner
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: DEMO_TENANT_ID } });
    const owner = await prisma.user.findUnique({ where: { email: "owner@sharmamedical.local" } });
    if (tenant && !owner) {
      await prisma.tenant.update({ where: { id: DEMO_TENANT_ID }, data: { approvalStatus: "approved", isActive: true } }).catch(() => {});
      await prisma.user.create({
        data: {
          id: "user-sharma-owner", tenantId: DEMO_TENANT_ID, name: "Basant Kumar",
          email: "owner@sharmamedical.local", phone: "+91 98765 43210",
          passwordHash: await hashPassword("Shop@12345"), role: "shop_admin", isActive: true
        }
      }).catch((e) => {
        console.warn("Safe Warning: Parallel shop owner insert resolved:", e.message);
      });
    }
  } catch (err) {
    console.warn("Safe Warning: Parallel shop owner check caught:", err);
  }

  // 3. Demo Wholesaler / Stockist
  try {
    const stockistTenantId = "tenant-demo-stockist";
    const stockist = await prisma.user.findUnique({ where: { email: "stockist@medcare.local" } });
    if (!stockist) {
      let stockistTenant = await prisma.tenant.findUnique({ where: { id: stockistTenantId } });
      if (!stockistTenant) {
        await prisma.tenant.create({
          data: {
            id: stockistTenantId, name: "Shankar Pharma Wholesalers", slug: "shankar-pharma",
            ownerName: "Sanjay Mehta", phone: "+91 94311 02938", email: "stockist@medcare.local",
            city: "Ranchi", state: "Jharkhand", gstin: "20BBBBB1111B1Z2", drugLicenseNo: "JH-RAN-19283B",
            plan: "premium", isActive: true, approvalStatus: "approved"
          }
        }).catch((e) => {
          console.warn("Safe Warning: Parallel stockist tenant insert resolved:", e.message);
        });
      }

      await prisma.user.create({
        data: {
          id: "user-demo-stockist", tenantId: stockistTenantId, name: "Sanjay Mehta",
          email: "stockist@medcare.local", phone: "+91 94311 02938",
          passwordHash: await hashPassword("Stockist@12345"), role: "stockist_admin", isActive: true
        }
      }).catch((e) => {
        console.warn("Safe Warning: Parallel stockist user insert resolved:", e.message);
      });
    }
  } catch (err) {
    console.warn("Safe Warning: Parallel stockist check caught:", err);
  }
}

// ─── Utilities ───────────────────────────────────────────────

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function optionalDate(value: string | undefined) {
  return value ? dateOnly(value) : null;
}

function iso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function isoDate(value: Date | string | null | undefined) {
  return iso(value)?.slice(0, 10) ?? "";
}

// ─── Mappers ─────────────────────────────────────────────────

function mapMedicine(medicine: Medicine): LocalMedicine {
  return {
    id: medicine.id, name: medicine.name, genericName: medicine.genericName,
    manufacturer: medicine.manufacturer, category: medicine.category,
    composition: medicine.composition, dosageForm: medicine.dosageForm,
    strength: medicine.strength, packSize: medicine.packSize,
    hsnCode: medicine.hsnCode, gstRate: medicine.gstRate, mrpPaisa: medicine.mrpPaisa,
    schedule: medicine.schedule, barcode: medicine.barcode,
    requiresPrescription: medicine.requiresPrescription
  };
}

function mapSupplier(supplier: Supplier): LocalSupplier {
  return {
    id: supplier.id, name: supplier.name, phone: supplier.phone,
    email: supplier.email, address: supplier.address, gstin: supplier.gstin,
    creditDays: supplier.creditDays, balancePaisa: supplier.balancePaisa
  };
}

function mapInventory(row: InventoryWithRelations): LocalInventoryRow {
  return {
    id: row.id, tenantId: row.tenantId, medicineId: row.medicineId,
    batchNo: row.batchNo, mfgDate: row.mfgDate ? isoDate(row.mfgDate) : null,
    expiryDate: isoDate(row.expiryDate), purchaseRatePaisa: row.purchaseRatePaisa,
    mrpPaisa: row.mrpPaisa, saleRatePaisa: row.saleRatePaisa, gstRate: row.gstRate,
    hsnCode: row.hsnCode, quantity: row.quantity, reorderLevel: row.reorderLevel,
    rackLocation: row.rackLocation, supplierId: row.supplierId,
    medicine: mapMedicine(row.medicine),
    supplier: row.supplier ? mapSupplier(row.supplier) : null
  };
}

function mapTenant(tenant: Tenant): LocalTenant {
  return {
    id: tenant.id, name: tenant.name, slug: tenant.slug, ownerName: tenant.ownerName,
    phone: tenant.phone, email: tenant.email, city: tenant.city, state: tenant.state,
    gstin: tenant.gstin, drugLicenseNo: tenant.drugLicenseNo, plan: tenant.plan,
    upiId: tenant.upiId ?? null,
    isActive: tenant.isActive,
    approvalStatus: tenant.approvalStatus as LocalTenant["approvalStatus"],
    profilePicUrl: tenant.profilePicUrl ?? null,
    address: tenant.address ?? null
  };
}

function mapUser(user: UserWithTenant): LocalUser {
  return {
    id: user.id, tenantId: user.tenantId, name: user.name, email: user.email,
    phone: user.phone, role: user.role as LocalUser["role"], isActive: user.isActive,
    tenantName: user.tenant?.name ?? null,
    tenantApprovalStatus: user.tenant?.approvalStatus ? (user.tenant.approvalStatus as LocalUser["tenantApprovalStatus"]) : null
  };
}

function mapUserWithPassword(user: UserWithTenant): LegacyUserWithPassword {
  return {
    id: user.id, tenant_id: user.tenantId, name: user.name, email: user.email,
    phone: user.phone, password_hash: user.passwordHash, role: user.role,
    is_active: user.isActive, tenant_name: user.tenant?.name ?? null,
    approval_status: user.tenant?.approvalStatus ?? null
  };
}

function mapSaleRow(sale: Sale): LegacySaleRow {
  return {
    id: sale.id, tenant_id: sale.tenantId, invoice_no: sale.invoiceNo,
    invoice_date: iso(sale.invoiceDate), customer_id: sale.customerId,
    customer_name: sale.customerName, customer_phone: sale.customerPhone,
    prescription_no: sale.prescriptionNo, doctor_name: sale.doctorName,
    payment_mode: sale.paymentMode, subtotal_paisa: sale.subtotalPaisa,
    discount_paisa: sale.discountPaisa, taxable_paisa: sale.taxablePaisa,
    cgst_paisa: sale.cgstPaisa, sgst_paisa: sale.sgstPaisa,
    igst_paisa: sale.igstPaisa, gst_paisa: sale.gstPaisa,
    round_off_paisa: sale.roundOffPaisa, total_paisa: sale.totalPaisa,
    amount_paid_paisa: sale.amountPaidPaisa, amount_due_paisa: sale.amountDuePaisa,
    status: sale.status, created_at: iso(sale.createdAt)
  };
}

function mapSaleItemRow(item: SaleItem): LegacySaleItemRow {
  return {
    id: item.id, sale_id: item.saleId, tenant_id: item.tenantId,
    inventory_id: item.inventoryId, medicine_name: item.medicineName,
    batch_no: item.batchNo, expiry_date: isoDate(item.expiryDate),
    quantity: item.quantity, mrp_paisa: item.mrpPaisa,
    sale_rate_paisa: item.saleRatePaisa, discount_percent: item.discountPercent,
    discount_paisa: item.discountPaisa, hsn_code: item.hsnCode,
    gst_rate: item.gstRate, gst_paisa: item.gstPaisa,
    cgst_paisa: item.cgstPaisa, sgst_paisa: item.sgstPaisa,
    igst_paisa: item.igstPaisa, taxable_paisa: item.taxablePaisa,
    total_paisa: item.totalPaisa, schedule: item.schedule
  };
}

function mapStockMovement(movement: StockMovementWithInventory): LocalStockMovement {
  return {
    id: movement.id, inventoryId: movement.inventoryId,
    medicineName: movement.inventory.medicine.name,
    batchNo: movement.inventory.batchNo,
    quantityDelta: movement.quantityDelta, adjustmentType: movement.adjustmentType,
    reason: movement.reason, referenceNo: movement.referenceNo,
    notes: movement.notes, createdAt: iso(movement.createdAt) ?? ""
  };
}

function mapScheduleHRow(row: ScheduleHWithSaleItem) {
  return {
    id: row.id, tenant_id: row.tenantId, sale_item_id: row.saleItemId,
    medicine_name: row.medicineName, quantity: row.quantity,
    customer_name: row.customerName, customer_phone: row.customerPhone,
    doctor_name: row.doctorName, prescription_no: row.prescriptionNo,
    sale_date: iso(row.saleDate), schedule: row.saleItem.schedule,
    batchNo: row.saleItem.batchNo, expiryDate: isoDate(row.saleItem.expiryDate)
  };
}

function sortInventory(rows: LocalInventoryRow[]) {
  return rows.sort((a, b) => a.medicine.name.localeCompare(b.medicine.name) || a.expiryDate.localeCompare(b.expiryDate));
}

// ─── Auth helpers ────────────────────────────────────────────

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const candidate = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
  const stored = Buffer.from(hash, "hex");
  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
}

export function hashOtp(otp: string) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

// ─── Session management ──────────────────────────────────────

export async function createSession(userId: string) {
  await ensureDefaultData();
  const sessionId = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await withRetry(() => prisma.authSession.create({ data: { id: sessionId, userId, expiresAt } }));
  return { sessionId, expiresAt: expiresAt.toISOString() };
}

interface SessionCacheEntry {
  user: LocalUser;
  expiresAt: number;
}

const sessionCache = new Map<string, SessionCacheEntry>();

function cleanSessionCache() {
  const now = Date.now();
  if (sessionCache.size > 500) {
    for (const [key, entry] of sessionCache.entries()) {
      if (entry.expiresAt < now) {
        sessionCache.delete(key);
      }
    }
  }
}

export async function getUserBySession(sessionId: string | undefined) {
  if (!sessionId) return null;

  const now = Date.now();
  const cached = sessionCache.get(sessionId);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  await ensureDefaultData();
  const session = await withRetry(() => prisma.authSession.findUnique({
    where: { id: sessionId },
    include: { user: { include: { tenant: true } } }
  }));

  if (!session || session.expiresAt <= new Date()) {
    sessionCache.delete(sessionId);
    return null;
  }

  const mappedUser = mapUser(session.user);
  cleanSessionCache();
  sessionCache.set(sessionId, {
    user: mappedUser,
    expiresAt: now + 30000 // Cache for 30 seconds
  });
  return mappedUser;
}

export async function deleteSession(sessionId: string | undefined) {
  if (!sessionId) return;
  sessionCache.delete(sessionId);
  await prisma.authSession.deleteMany({ where: { id: sessionId } });
}

export async function getUserByEmailWithPassword(email: string) {
  await ensureDefaultData();
  const user = await withRetry(() => prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { tenant: true }
  }));
  return user ? mapUserWithPassword(user) : undefined;
}

export async function getUserById(userId: string) {
  await ensureDefaultData();
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { tenant: true } });
  return user ? mapUser(user) : null;
}

// ─── Tenant management ──────────────────────────────────────

export async function registerPendingShop(input: {
  shopName: string; ownerName: string; phone: string; email: string;
  password: string; city?: string; state?: string; gstin?: string; drugLicenseNo?: string;
  role?: string;
}) {
  await ensureDefaultData();
  const tenantId = uid("tenant");
  const userId = uid("user");
  const slugBase = input.shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  const slug = `${slugBase || "shop"}-${Date.now().toString(36)}`;

  await prisma.$transaction(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId, name: input.shopName, slug, ownerName: input.ownerName,
        phone: input.phone, email: input.email,
        city: input.city || null, state: input.state || null,
        gstin: input.gstin || null, drugLicenseNo: input.drugLicenseNo || null,
        plan: "free", isActive: false, approvalStatus: "pending"
      }
    });

    await tx.user.create({
      data: {
        id: userId, tenantId, name: input.ownerName, email: input.email,
        phone: input.phone, passwordHash: await hashPassword(input.password),
        role: input.role || "shop_admin", isActive: false
      }
    });
  });

  return { tenantId, userId, slug };
}

export async function getAllTenants() {
  await ensureDefaultData();
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { users: { where: { role: { in: ["shop_admin", "stockist_admin"] } }, take: 1 } }
  });
  const priority = { pending: 0, approved: 1, rejected: 2 } as Record<string, number>;
  return tenants.map((t) => ({
    ...mapTenant(t),
    ownerRole: t.users[0]?.role || "shop_admin"
  })).sort((a, b) => (priority[a.approvalStatus] ?? 9) - (priority[b.approvalStatus] ?? 9));
}

export async function getApprovedTenantsWithOwners() {
  await ensureDefaultData();
  const tenants = await prisma.tenant.findMany({
    where: { approvalStatus: "approved", isActive: true },
    include: { users: { where: { role: { in: ["shop_admin", "stockist_admin"] } }, take: 1 } }
  });
  return tenants.map((tenant) => ({
    id: tenant.id, name: tenant.name, email: tenant.email,
    ownerName: tenant.ownerName, ownerEmail: tenant.users[0]?.email ?? null
  }));
}

export async function updateTenantApproval(tenantId: string, status: "approved" | "rejected") {
  const active = status === "approved";
  await prisma.$transaction([
    prisma.tenant.update({ where: { id: tenantId }, data: { approvalStatus: status, isActive: active } }),
    prisma.user.updateMany({ where: { tenantId }, data: { isActive: active } })
  ]);
}

export async function getTenantById(tenantId: string) {
  await ensureDefaultData();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  return tenant ? mapTenant(tenant) : null;
}

export async function createPasswordResetOtp(userId: string, otp: string) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10);
  await prisma.passwordResetOtp.create({ data: { id: uid("otp"), userId, otpHash: hashOtp(otp), expiresAt } });
  return expiresAt.toISOString();
}

export async function resetPasswordWithOtp(email: string, otp: string, password: string) {
  const user = await getUserByEmailWithPassword(email);
  if (!user) return false;
  const otpRow = await prisma.passwordResetOtp.findFirst({
    where: { userId: String(user.id), otpHash: hashOtp(otp), usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" }
  });
  if (!otpRow) return false;
  await prisma.$transaction([
    prisma.user.update({ where: { id: String(user.id) }, data: { passwordHash: await hashPassword(password) } }),
    prisma.passwordResetOtp.update({ where: { id: otpRow.id }, data: { usedAt: new Date() } })
  ]);
  return true;
}

// ─── Email Verification OTP ─────────────────────────────────

export async function createEmailVerificationOtp(email: string, otp: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes

  // Invalidate previous unused OTPs for this email
  await prisma.emailVerificationOtp.updateMany({
    where: { email: normalizedEmail, usedAt: null },
    data: { usedAt: new Date() }
  });

  await prisma.emailVerificationOtp.create({
    data: {
      email: normalizedEmail,
      otpHash: hashOtp(otp),
      expiresAt
    }
  });
  return expiresAt.toISOString();
}

export async function verifyEmailOtp(email: string, otp: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const otpRow = await prisma.emailVerificationOtp.findFirst({
    where: {
      email: normalizedEmail,
      otpHash: hashOtp(otp),
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });
  if (!otpRow) return false;

  await prisma.emailVerificationOtp.update({
    where: { id: otpRow.id },
    data: { usedAt: new Date() }
  });
  return true;
}

export async function getUserNameByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { name: true }
  });
  return user?.name ?? null;
}

// ─── Inventory (tenant-scoped) ───────────────────────────────

export async function getInventoryRows(tenantId: string) {
  await ensureDefaultData();
  const rows = await prisma.inventoryItem.findMany({
    where: { tenantId, isActive: true },
    include: { medicine: true, supplier: true }
  });
  return sortInventory(rows.map(mapInventory));
}

export async function getInventoryByMedicine(tenantId: string, medicineId: string) {
  await ensureDefaultData();
  const rows = await prisma.inventoryItem.findMany({
    where: { tenantId, medicineId, isActive: true },
    include: { medicine: true, supplier: true }
  });
  return sortInventory(rows.map(mapInventory));
}

export async function searchInventory(tenantId: string, q: string) {
  const normalized = q.trim().toLowerCase();
  if (!normalized) return [];

  // Barcode exact-match fast path: if query looks like a barcode (8-13 digits), try exact match first
  if (/^\d{8,13}$/.test(normalized)) {
    const barcodeMatch = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        isActive: true,
        quantity: { gt: 0 },
        medicine: { barcode: normalized },
      },
      include: { medicine: true, supplier: true },
      orderBy: { expiryDate: "asc" },
      take: 5,
    });
    if (barcodeMatch.length > 0) return barcodeMatch.map(mapInventory);
  }

  // Multi-word search: split query into tokens, build AND conditions
  const tokens = normalized.split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length === 0) {
    // Single short token fallback
    const rows = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { medicine: { name: { contains: normalized } } },
          { medicine: { genericName: { contains: normalized } } },
          { medicine: { barcode: { contains: normalized } } },
          { batchNo: { contains: normalized } },
        ],
      },
      include: { medicine: true, supplier: true },
      orderBy: [{ quantity: "desc" }, { expiryDate: "asc" }],
      take: 10,
    });
    return rows.map(mapInventory);
  }

  // Each token must match at least one field
  const isShortQuery = normalized.length < 4;
  const tokenConditions = tokens.map(token => ({
    OR: isShortQuery ? [
      { medicine: { name: { contains: token } } },
      { medicine: { genericName: { contains: token } } },
      { batchNo: { contains: token } },
    ] : [
      { medicine: { name: { contains: token } } },
      { medicine: { genericName: { contains: token } } },
      { medicine: { manufacturer: { contains: token } } },
      { medicine: { composition: { contains: token } } },
      { medicine: { category: { contains: token } } },
      { medicine: { barcode: { contains: token } } },
      { batchNo: { contains: token } },
    ],
  }));

  const rows = await prisma.inventoryItem.findMany({
    where: {
      tenantId,
      isActive: true,
      AND: tokenConditions,
    },
    include: { medicine: true, supplier: true },
    orderBy: [{ quantity: "desc" }, { expiryDate: "asc" }],
    take: 10,
  });
  return rows.map(mapInventory);
}

export async function getGenericSubstitutes(tenantId: string, genericNames: string[], excludeMedicineIds: string[]) {
  await ensureDefaultData();
  const rows = await prisma.inventoryItem.findMany({
    where: {
      tenantId,
      isActive: true,
      quantity: { gt: 0 },
      expiryDate: { gt: new Date() },
      medicine: {
        genericName: { in: genericNames },
        id: { notIn: excludeMedicineIds }
      }
    },
    include: { medicine: true, supplier: true },
    orderBy: { expiryDate: "asc" }
  });
  return rows.map(mapInventory);
}

export async function getMedicines() {
  await ensureDefaultData();
  const rows = await prisma.medicine.findMany({ orderBy: { name: "asc" } });
  return rows.map(mapMedicine);
}

export async function getTenant(tenantId: string): Promise<LocalTenant> {
  await ensureDefaultData();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found");
  return mapTenant(tenant);
}

// ─── Suppliers (tenant-scoped) ───────────────────────────────

export async function getSuppliers(tenantId: string): Promise<LocalSupplier[]> {
  await ensureDefaultData();
  const suppliers = await prisma.supplier.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" }
  });
  return suppliers.map(mapSupplier);
}

export async function addSupplier(tenantId: string, input: unknown) {
  const data = createSupplierSchema.parse(input);
  await ensureDefaultData();
  const existing = data.id ? await prisma.supplier.findFirst({ where: { tenantId, id: data.id } }) : null;
  const supplierId = data.id ?? existing?.id ?? uid("sup");

  if (data.id || existing) {
    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        name: data.name, phone: data.phone || null, email: data.email || null,
        address: data.address || null, gstin: data.gstin || null,
        creditDays: data.creditDays, balancePaisa: data.balancePaisa
      }
    });
  } else {
    await prisma.supplier.create({
      data: {
        id: supplierId, tenantId, name: data.name,
        phone: data.phone || null, email: data.email || null,
        address: data.address || null, gstin: data.gstin || null,
        creditDays: data.creditDays, balancePaisa: data.balancePaisa
      }
    });
  }
  return (await getSuppliers(tenantId)).find((s) => s.id === supplierId);
}

export async function getSupplierSupplyHistory(tenantId: string, supplierId: string) {
  await ensureDefaultData();
  const items = await prisma.inventoryItem.findMany({
    where: { tenantId, supplierId, isActive: true },
    include: {
      medicine: true
    },
    orderBy: { createdAt: "desc" }
  });
  return items.map((item) => ({
    id: item.id,
    medicineId: item.medicineId,
    medicineName: item.medicine.name,
    medicinePackSize: item.medicine.packSize || "1 unit",
    batchNo: item.batchNo,
    mfgDate: item.mfgDate ? item.mfgDate.toISOString().slice(0, 10) : null,
    expiryDate: item.expiryDate.toISOString().slice(0, 10),
    purchaseRatePaisa: item.purchaseRatePaisa,
    mrpPaisa: item.mrpPaisa,
    saleRatePaisa: item.saleRatePaisa,
    gstRate: item.gstRate,
    hsnCode: item.hsnCode || item.medicine.hsnCode || "N/A",
    quantity: item.quantity,
    createdAt: item.createdAt.toISOString()
  }));
}

// ─── Customers (tenant-scoped) ───────────────────────────────

export async function getCustomers(tenantId: string): Promise<LocalCustomer[]> {
  await ensureDefaultData();
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" }
  });
  return customers.map((c) => ({
    id: c.id, name: c.name, phone: c.phone, email: c.email,
    address: c.address, doctorName: c.doctorName,
    outstandingPaisa: c.outstandingPaisa, loyaltyPoints: c.loyaltyPoints
  }));
}

export async function getCustomer(tenantId: string, customerId: string) {
  await ensureDefaultData();
  const c = await prisma.customer.findFirst({
    where: { tenantId, id: customerId }
  });
  if (!c) return null;
  return {
    id: c.id, name: c.name, phone: c.phone, email: c.email,
    address: c.address, doctorName: c.doctorName,
    outstandingPaisa: c.outstandingPaisa, loyaltyPoints: c.loyaltyPoints
  };
}

export async function addCustomer(tenantId: string, input: unknown) {
  const data = createCustomerSchema.parse(input);
  await ensureDefaultData();
  const existing = data.id 
    ? await prisma.customer.findFirst({ where: { tenantId, id: data.id } }) 
    : (data.phone ? await prisma.customer.findFirst({ where: { tenantId, phone: data.phone } }) : null);
  const customerId = data.id ?? existing?.id ?? uid("cust");

  if (data.id || existing) {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        name: data.name, phone: data.phone || null, email: data.email || null, address: data.address || null,
        doctorName: data.doctorName || null, outstandingPaisa: data.outstandingPaisa,
        loyaltyPoints: data.loyaltyPoints
      }
    });
  } else {
    await prisma.customer.create({
      data: {
        id: customerId, tenantId, name: data.name, phone: data.phone || null,
        email: data.email || null, address: data.address || null,
        doctorName: data.doctorName || null, outstandingPaisa: data.outstandingPaisa,
        loyaltyPoints: data.loyaltyPoints
      }
    });
  }

  return (await getCustomers(tenantId)).find((c) => c.id === customerId);
}

export async function getCustomerPurchases(tenantId: string, customerId: string) {
  await ensureDefaultData();
  const sales = await prisma.sale.findMany({
    where: { tenantId, customerId },
    include: {
      items: true
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return sales.map((sale) => ({
    id: sale.id,
    invoiceNo: sale.invoiceNo,
    date: sale.createdAt.toISOString().slice(0, 10),
    createdAt: sale.createdAt.toISOString(),
    totalPaisa: sale.totalPaisa,
    paymentMode: sale.paymentMode,
    subtotalPaisa: sale.subtotalPaisa,
    discountPaisa: sale.discountPaisa,
    taxablePaisa: sale.taxablePaisa,
    cgstPaisa: sale.cgstPaisa,
    sgstPaisa: sale.sgstPaisa,
    igstPaisa: sale.igstPaisa,
    gstPaisa: sale.gstPaisa,
    roundOffPaisa: sale.roundOffPaisa,
    amountPaidPaisa: sale.amountPaidPaisa,
    amountDuePaisa: sale.amountDuePaisa,
    status: sale.status,
    items: sale.items.map((item) => ({
      id: item.id,
      medicine_name: item.medicineName,
      batch_no: item.batchNo,
      expiry_date: item.expiryDate.toISOString().slice(0, 10),
      quantity: item.quantity,
      mrp_paisa: item.mrpPaisa,
      sale_rate_paisa: item.saleRatePaisa,
      discount_percent: item.discountPercent,
      discount_paisa: item.discountPaisa,
      hsn_code: item.hsnCode || "N/A",
      gst_rate: item.gstRate,
      gst_paisa: item.gstPaisa,
      total_paisa: item.totalPaisa
    }))
  }));
}

// ─── Add inventory (tenant-scoped) ───────────────────────────

export async function addInventory(tenantId: string, input: unknown) {
  const data = createInventorySchema.parse(input);
  await ensureDefaultData();
  const medicine = await prisma.medicine.findUnique({ where: { id: data.medicineId } });
  if (!medicine) throw new Error("Medicine not found");

  const inventory = await prisma.inventoryItem.upsert({
    where: {
      tenantId_medicineId_batchNo: { tenantId, medicineId: data.medicineId, batchNo: data.batchNo }
    },
    create: {
      id: uid("inv"), tenantId, medicineId: data.medicineId, batchNo: data.batchNo,
      mfgDate: optionalDate(data.mfgDate), expiryDate: dateOnly(data.expiryDate),
      purchaseRatePaisa: data.purchaseRatePaisa, mrpPaisa: data.mrpPaisa,
      saleRatePaisa: data.saleRatePaisa, gstRate: data.gstRate,
      hsnCode: data.hsnCode || medicine.hsnCode || null,
      quantity: data.quantity, reorderLevel: data.reorderLevel,
      rackLocation: data.rackLocation || null, supplierId: data.supplierId || null, isActive: true
    },
    update: {
      quantity: { increment: data.quantity },
      purchaseRatePaisa: data.purchaseRatePaisa, mrpPaisa: data.mrpPaisa,
      saleRatePaisa: data.saleRatePaisa, gstRate: data.gstRate,
      hsnCode: data.hsnCode || medicine.hsnCode || null,
      reorderLevel: data.reorderLevel, rackLocation: data.rackLocation || null,
      supplierId: data.supplierId || null, isActive: true
    },
    include: { medicine: true, supplier: true }
  });

  return mapInventory(inventory);
}

// ─── Stock movements (tenant-scoped) ─────────────────────────

export async function getStockMovements(tenantId: string, limit = 50): Promise<LocalStockMovement[]> {
  await ensureDefaultData();
  const movements = await prisma.stockMovement.findMany({
    where: { tenantId },
    include: { inventory: { include: { medicine: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit
  });
  return movements.map(mapStockMovement);
}

export async function addStockAdjustment(tenantId: string, input: unknown) {
  const data = stockAdjustmentSchema.parse(input);
  await ensureDefaultData();
  const movementId = uid("mov");

  await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventoryItem.findFirst({
      where: { id: data.inventoryId, tenantId, isActive: true }
    });
    if (!inventory) throw new Error("Inventory item not found");
    const nextQuantity = inventory.quantity + data.quantityDelta;
    if (nextQuantity < 0) throw new Error(`Adjustment would make stock negative. Current stock is ${inventory.quantity}.`);

    await tx.inventoryItem.update({ where: { id: data.inventoryId }, data: { quantity: nextQuantity } });
    await tx.stockMovement.create({
      data: {
        id: movementId, tenantId, inventoryId: data.inventoryId,
        adjustmentType: data.adjustmentType, quantityDelta: data.quantityDelta,
        reason: data.reason, referenceNo: data.referenceNo || null, notes: data.notes || null
      }
    });
  });

  return {
    item: (await getInventoryRows(tenantId)).find((row) => row.id === data.inventoryId),
    movement: (await getStockMovements(tenantId, 1))[0]
  };
}

// ─── Sales (tenant-scoped) ───────────────────────────────────

export async function createSale(tenantId: string, input: unknown) {
  salesSummaryCache.delete(tenantId);
  const data = createSaleSchema.parse(input);
  await ensureDefaultData();
  const saleId = uid("sale");

  await prisma.$transaction(async (tx) => {
    const inventoryIds = data.lines.map((l) => l.inventoryId);
    const inventories = await tx.inventoryItem.findMany({
      where: { id: { in: inventoryIds }, tenantId, isActive: true },
      include: { medicine: true, supplier: true }
    });

    const inventoryMap = new Map(inventories.map((inv) => [inv.id, inv]));
    const inventoryRows: { row: LocalInventoryRow; line: (typeof data.lines)[number] }[] = [];

    for (const line of data.lines) {
      const inventory = inventoryMap.get(line.inventoryId);
      if (!inventory) throw new Error("Inventory item not found");
      if (inventory.quantity < line.quantity) {
        throw new Error(`${inventory.medicine.name} has only ${inventory.quantity} in stock`);
      }
      inventoryRows.push({ row: mapInventory(inventory), line });
    }

    const saleLines: SaleLine[] = inventoryRows.map(({ row, line }) => ({
      inventoryId: row.id, medicineName: row.medicine.name, batchNo: row.batchNo,
      expiryDate: row.expiryDate, quantity: line.quantity, mrpPaisa: row.mrpPaisa,
      saleRatePaisa: line.saleRatePaisa, discountPercent: line.discountPercent,
      gstRate: row.gstRate as SaleLine["gstRate"],
      hsnCode: String(row.hsnCode || row.medicine.hsnCode || ""),
      schedule: row.medicine.schedule as SaleLine["schedule"]
    }));

    const controlled = saleLines.some((l) => ["H", "H1", "X"].includes(l.schedule));
    if (controlled && (!data.doctorName || !data.prescriptionNo)) {
      throw new Error("Prescription number and doctor name are required for Schedule H/H1/X medicines");
    }

    const totals = calculateBillTotals(saleLines);
    const invoiceCount = await tx.sale.count({ where: { tenantId } });
    const invoiceNo = `MED-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(6, "0")}`;
    const customerName = data.customerName || "Walk-in Customer";
    let customerId: string | null = null;

    if (data.customerPhone) {
      const existing = await tx.customer.findFirst({ where: { tenantId, phone: data.customerPhone } });
      customerId = existing?.id ?? uid("cust");
      if (!existing) {
        await tx.customer.create({
          data: { id: customerId, tenantId, name: customerName, phone: data.customerPhone, doctorName: data.doctorName || null }
        });
      }
    }

    await tx.sale.create({
      data: {
        id: saleId, tenantId, invoiceNo, customerId, customerName,
        customerPhone: data.customerPhone || null, prescriptionNo: data.prescriptionNo || null,
        doctorName: data.doctorName || null, paymentMode: data.paymentMode,
        subtotalPaisa: totals.subtotalPaisa, discountPaisa: totals.discountPaisa,
        taxablePaisa: totals.taxablePaisa, cgstPaisa: totals.cgstPaisa,
        sgstPaisa: totals.sgstPaisa, igstPaisa: totals.igstPaisa, gstPaisa: totals.gstPaisa,
        roundOffPaisa: totals.roundOffPaisa, totalPaisa: totals.totalPaisa,
        amountPaidPaisa: data.paymentMode === "credit" ? 0 : totals.totalPaisa,
        amountDuePaisa: data.paymentMode === "credit" ? totals.totalPaisa : 0,
        status: data.paymentMode === "credit" ? "credit" : "completed"
      }
    });

    // Map sale item records for bulk batch insertion
    const saleItemData = inventoryRows.map(({ row, line }, index) => {
      const lineTotal = totals.lineTotals[index];
      return {
        id: uid("item"),
        saleId,
        tenantId,
        inventoryId: row.id,
        medicineName: row.medicine.name,
        batchNo: row.batchNo,
        expiryDate: dateOnly(row.expiryDate),
        quantity: line.quantity,
        mrpPaisa: row.mrpPaisa,
        saleRatePaisa: line.saleRatePaisa,
        discountPercent: line.discountPercent,
        discountPaisa: lineTotal.discountPaisa,
        hsnCode: String(row.hsnCode || row.medicine.hsnCode || ""),
        gstRate: row.gstRate,
        gstPaisa: lineTotal.gstPaisa,
        cgstPaisa: lineTotal.cgstPaisa,
        sgstPaisa: lineTotal.sgstPaisa,
        igstPaisa: lineTotal.igstPaisa,
        taxablePaisa: lineTotal.taxablePaisa,
        totalPaisa: lineTotal.totalPaisa,
        schedule: row.medicine.schedule
      };
    });

    // Execute bulk insertion in a single high-performance query
    await tx.saleItem.createMany({ data: saleItemData });

    // Update inventory stock levels sequentially to avoid transactional locks
    for (const line of saleLines) {
      await tx.inventoryItem.update({
        where: { id: line.inventoryId },
        data: { quantity: { decrement: line.quantity } }
      });
    }

    // Map and bulk insert Schedule H register records if any controlled drugs exist
    const scheduleHData: any[] = [];
    for (const [index, line] of saleLines.entries()) {
      if (["H", "H1", "X"].includes(line.schedule)) {
        const saleItemId = saleItemData[index].id;
        scheduleHData.push({
          id: uid("sch"),
          tenantId,
          saleItemId,
          medicineName: line.medicineName,
          quantity: line.quantity,
          customerName,
          customerPhone: data.customerPhone || null,
          doctorName: data.doctorName || null,
          prescriptionNo: data.prescriptionNo || null
        });
      }
    }

    if (scheduleHData.length > 0) {
      await tx.scheduleHRegister.createMany({ data: scheduleHData });
    }

    if (data.paymentMode === "credit" && customerId) {
      await tx.customer.update({ where: { id: customerId }, data: { outstandingPaisa: { increment: totals.totalPaisa } } });
    }
  });

  return getSale(tenantId, saleId);
}

export async function getSales(tenantId: string) {
  await ensureDefaultData();
  const sales = await prisma.sale.findMany({
    where: { tenantId }, orderBy: { createdAt: "desc" }, take: 50
  });
  return sales.map(mapSaleRow);
}

export async function getSale(tenantId: string, saleId: string) {
  await ensureDefaultData();
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, tenantId }, include: { items: true, prescriptionImages: true }
  });
  return { 
    sale: sale ? {
      ...mapSaleRow(sale),
      prescriptionImages: sale.prescriptionImages.map(img => ({
        id: img.id,
        imageUrl: img.imageUrl,
        uploadedAt: img.uploadedAt.toISOString()
      }))
    } : null, 
    items: sale ? sale.items.map(mapSaleItemRow) : [] 
  };
}

export async function getSaleByIdOrInvoice(tenantId: string, idOrInvoice: string) {
  await ensureDefaultData();
  const sale = await prisma.sale.findFirst({
    where: { tenantId, OR: [{ id: idOrInvoice }, { invoiceNo: idOrInvoice }] },
    include: { items: true, prescriptionImages: true }
  });
  if (!sale) return null;
  return { 
    sale: {
      ...mapSaleRow(sale),
      prescriptionImages: sale.prescriptionImages.map(img => ({
        id: img.id,
        imageUrl: img.imageUrl,
        uploadedAt: img.uploadedAt.toISOString()
      }))
    }, 
    items: sale.items.map(mapSaleItemRow) 
  };
}
// ─── Reports (tenant-scoped) ─────────────────────────────────

export async function getSalesSummary(tenantId: string) {
  const cached = salesSummaryCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  await ensureDefaultData();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [allAgg, allCount, todayAgg, todayCount] = await Promise.all([
    prisma.sale.aggregate({
      where: { tenantId },
      _sum: { totalPaisa: true, gstPaisa: true, amountDuePaisa: true, discountPaisa: true },
    }),
    prisma.sale.count({ where: { tenantId } }),
    prisma.sale.aggregate({
      where: { tenantId, createdAt: { gte: today, lt: tomorrow } },
      _sum: { totalPaisa: true, gstPaisa: true, amountDuePaisa: true },
    }),
    prisma.sale.count({ where: { tenantId, createdAt: { gte: today, lt: tomorrow } } }),
  ]);

  const result = {
    bills: allCount,
    totalPaisa: allAgg._sum?.totalPaisa ?? 0,
    gstPaisa: allAgg._sum?.gstPaisa ?? 0,
    duePaisa: allAgg._sum?.amountDuePaisa ?? 0,
    discountPaisa: allAgg._sum?.discountPaisa ?? 0,
    todayBills: todayCount,
    todaySalesPaisa: todayAgg._sum?.totalPaisa ?? 0,
    todayGstPaisa: todayAgg._sum?.gstPaisa ?? 0,
    todayDuePaisa: todayAgg._sum?.amountDuePaisa ?? 0,
  };

  salesSummaryCache.set(tenantId, { data: result, timestamp: Date.now() });
  return result;
}

export async function getSalesTrend(tenantId: string, days = 7) {
  await ensureDefaultData();
  const startRange = new Date();
  startRange.setHours(0, 0, 0, 0);
  startRange.setDate(startRange.getDate() - (days - 1));

  const sales = await prisma.sale.findMany({
    where: { tenantId, createdAt: { gte: startRange } },
    select: { totalPaisa: true, createdAt: true },
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return Array.from({ length: days }, (_, index) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - index - 1));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const daySales = sales.filter((s) => s.createdAt >= start && s.createdAt < end);
    return {
      day: dayNames[start.getDay()],
      sales: Math.round(daySales.reduce((sum, s) => sum + s.totalPaisa, 0) / 100),
      bills: daySales.length
    };
  });
}

export async function getScheduleHRegister(tenantId: string) {
  await ensureDefaultData();
  const rows = await prisma.scheduleHRegister.findMany({
    where: { tenantId }, include: { saleItem: true }, orderBy: { saleDate: "desc" }
  });
  return rows.map(mapScheduleHRow);
}

export async function getGstReport(tenantId: string, month?: string) {
  await ensureDefaultData();
  
  let dateFilter = {};
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 1);
    dateFilter = {
      sale: {
        createdAt: {
          gte: start,
          lt: end
        }
      }
    };
  }

  const items = await prisma.saleItem.findMany({
    where: {
      tenantId,
      ...dateFilter
    }
  });

  const grouped = new Map<string, { hsnCode: string | null; gstRate: number; taxablePaisa: number; gstPaisa: number }>();
  for (const item of items) {
    const key = `${item.hsnCode ?? ""}:${item.gstRate}`;
    const current = grouped.get(key) ?? { hsnCode: item.hsnCode, gstRate: item.gstRate, taxablePaisa: 0, gstPaisa: 0 };
    current.taxablePaisa += item.taxablePaisa;
    current.gstPaisa += item.gstPaisa;
    grouped.set(key, current);
  }
  return Array.from(grouped.values()).sort((a, b) => a.gstRate - b.gstRate || String(a.hsnCode ?? "").localeCompare(String(b.hsnCode ?? "")));
}

export async function getDailyReport(tenantId: string, date = new Date()) {
  await ensureDefaultData();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const expiryCutoff = new Date(start);
  expiryCutoff.setDate(expiryCutoff.getDate() + 60);

  const [sales, inventoryLevels, expiringCount] = await Promise.all([
    prisma.sale.findMany({ where: { tenantId, createdAt: { gte: start, lt: end } } }),
    prisma.inventoryItem.findMany({
      where: { tenantId, isActive: true },
      select: { quantity: true, reorderLevel: true }
    }),
    prisma.inventoryItem.count({
      where: { tenantId, isActive: true, expiryDate: { lte: expiryCutoff } }
    })
  ]);

  return {
    reportDate: start.toISOString().slice(0, 10),
    bills: sales.length,
    totalPaisa: sales.reduce((sum, s) => sum + s.totalPaisa, 0),
    gstPaisa: sales.reduce((sum, s) => sum + s.gstPaisa, 0),
    lowStockCount: inventoryLevels.filter((i) => i.quantity <= i.reorderLevel).length,
    expiringCount
  };
}

export async function logDailyReport(tenantId: string, reportDate: string, sentTo: string) {
  await prisma.dailyReportLog.create({ data: { id: uid("report"), tenantId, reportDate, sentTo } });
}

export async function getPlatformSummary() {
  await ensureDefaultData();
  const [totalShops, activeShops, pendingShops, rejectedShops, users, salesAgg] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { approvalStatus: "approved", isActive: true } }),
    prisma.tenant.count({ where: { approvalStatus: "pending" } }),
    prisma.tenant.count({ where: { approvalStatus: "rejected" } }),
    prisma.user.count(),
    prisma.sale.aggregate({ _count: true, _sum: { totalPaisa: true } }),
  ]);
  return {
    totalShops, activeShops, pendingShops, rejectedShops,
    users, bills: salesAgg._count,
    gmvPaisa: salesAgg._sum?.totalPaisa ?? 0,
  };
}

// ─── Notifications (tenant-scoped) ───────────────────────────

export async function getNotifications(tenantId: string) {
  await ensureDefaultData();
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 60);

  // 1. Fetch expiring items directly (usually very few)
  const expiringItems = await prisma.inventoryItem.findMany({
    where: { tenantId, isActive: true, expiryDate: { lte: cutoff } },
    include: { medicine: true }
  });

  // 2. Fetch lightweight low-stock levels to filter ids
  const inventoryLevels = await prisma.inventoryItem.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, quantity: true, reorderLevel: true }
  });

  const lowStockIds = inventoryLevels
    .filter((r) => r.quantity <= r.reorderLevel)
    .map((r) => r.id);

  // 3. Fetch low-stock items with medicine relation
  const lowStockItems = lowStockIds.length > 0 
    ? await prisma.inventoryItem.findMany({
        where: { id: { in: lowStockIds } },
        include: { medicine: true }
      })
    : [];

  const lowStock = lowStockItems.map((r) => ({
    id: `low-${r.id}`, type: "low_stock", title: "Low stock",
    message: `${r.medicine.name} has ${r.quantity} units left. Reorder level is ${r.reorderLevel}.`,
    severity: "warning", createdAt: now.toISOString()
  }));

  const expiring = expiringItems.map((r) => ({
    id: `exp-${r.id}`, type: "expiry_alert", title: "Expiry alert",
    message: `${r.medicine.name} batch ${r.batchNo} expires on ${isoDate(r.expiryDate)}.`,
    severity: r.expiryDate < now ? "danger" : "warning",
    createdAt: now.toISOString()
  }));

  return [...expiring, ...lowStock];
}

export async function getLowStockRows(tenantId: string) {
  await ensureDefaultData();
  const inventoryLevels = await prisma.inventoryItem.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, quantity: true, reorderLevel: true }
  });

  const lowStockIds = inventoryLevels
    .filter((r) => r.quantity <= r.reorderLevel)
    .map((r) => r.id);

  if (lowStockIds.length === 0) return [];

  const rows = await prisma.inventoryItem.findMany({
    where: { id: { in: lowStockIds } },
    include: { medicine: true, supplier: true }
  });

  return sortInventory(rows.map(mapInventory));
}

export async function getExpiringRows(tenantId: string, days = 90) {
  await ensureDefaultData();
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() + days);
  const rows = await prisma.inventoryItem.findMany({
    where: { tenantId, isActive: true, expiryDate: { lte: cutoff } },
    include: { medicine: true, supplier: true },
  });
  return sortInventory(rows.map(mapInventory));
}

// ─── Purchase Orders (tenant-scoped) ─────────────────────────

export async function getPurchaseOrders(tenantId: string) {
  await ensureDefaultData();
  const orders = await prisma.purchaseOrder.findMany({
    where: { tenantId },
    include: { supplier: true, items: true },
    orderBy: { createdAt: "desc" }
  });
  return orders.map((po) => ({
    id: po.id, poNumber: po.poNumber, supplierId: po.supplierId,
    supplierName: po.supplier.name, status: po.status,
    totalPaisa: po.totalPaisa, notes: po.notes,
    orderDate: iso(po.orderDate), expectedDate: iso(po.expectedDate),
    receivedDate: iso(po.receivedDate), createdAt: iso(po.createdAt),
    items: po.items.map((i) => ({
      id: i.id, medicineName: i.medicineName, quantity: i.quantity,
      receivedQuantity: i.receivedQuantity, ratePaisa: i.ratePaisa, totalPaisa: i.totalPaisa
    }))
  }));
}

export async function createPurchaseOrder(tenantId: string, input: {
  supplierId: string; notes?: string; expectedDate?: string;
  items: { medicineName: string; quantity: number; ratePaisa: number }[];
}) {
  await ensureDefaultData();
  const poId = uid("po");
  const poCount = await prisma.purchaseOrder.count({ where: { tenantId } });
  const poNumber = `PO-${new Date().getFullYear()}-${String(poCount + 1).padStart(5, "0")}`;
  const totalPaisa = input.items.reduce((sum, i) => sum + i.quantity * i.ratePaisa, 0);

  await prisma.$transaction(async (tx) => {
    await tx.purchaseOrder.create({
      data: {
        id: poId, tenantId, poNumber, supplierId: input.supplierId,
        status: "draft", totalPaisa, notes: input.notes || null,
        expectedDate: input.expectedDate ? dateOnly(input.expectedDate) : null
      }
    });
    for (const item of input.items) {
      await tx.purchaseOrderItem.create({
        data: {
          id: uid("poi"), purchaseOrderId: poId, medicineName: item.medicineName,
          quantity: item.quantity, ratePaisa: item.ratePaisa,
          totalPaisa: item.quantity * item.ratePaisa
        }
      });
    }
  });

  return (await getPurchaseOrders(tenantId)).find((po) => po.id === poId);
}

export async function receivePurchaseOrder(tenantId: string, poId: string, receivedItems: { itemId: string; receivedQuantity: number }[]) {
  await ensureDefaultData();
  await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findFirst({ where: { id: poId, tenantId }, include: { items: true } });
    if (!po) throw new Error("Purchase order not found");

    for (const ri of receivedItems) {
      await tx.purchaseOrderItem.update({
        where: { id: ri.itemId },
        data: { receivedQuantity: ri.receivedQuantity }
      });
    }

    const allReceived = po.items.every((item) => {
      const received = receivedItems.find((ri) => ri.itemId === item.id);
      return (received?.receivedQuantity ?? item.receivedQuantity) >= item.quantity;
    });

    await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: allReceived ? "completed" : "partially_received", receivedDate: new Date() }
    });
  });

  return (await getPurchaseOrders(tenantId)).find((po) => po.id === poId);
}

// ─── Sale Returns (tenant-scoped) ────────────────────────────

export async function getSaleReturns(tenantId: string) {
  await ensureDefaultData();
  const returns = await prisma.saleReturn.findMany({
    where: { tenantId },
    include: { sale: true, items: true },
    orderBy: { createdAt: "desc" }
  });
  return returns.map((r) => ({
    id: r.id, returnNo: r.returnNo, saleId: r.saleId,
    invoiceNo: r.sale.invoiceNo, customerName: r.sale.customerName,
    reason: r.reason, refundPaisa: r.refundPaisa, status: r.status,
    createdAt: iso(r.createdAt),
    items: r.items.map((i) => ({
      id: i.id, medicineName: i.medicineName, batchNo: i.batchNo,
      quantity: i.quantity, refundPaisa: i.refundPaisa
    }))
  }));
}

export async function createSaleReturn(tenantId: string, input: {
  saleId: string; reason: string;
  items: { saleItemId: string; inventoryId: string; medicineName: string; batchNo: string; quantity: number; refundPaisa: number }[];
}) {
  await ensureDefaultData();
  const returnId = uid("sret");
  const returnCount = await prisma.saleReturn.count({ where: { tenantId } });
  const returnNo = `SR-${new Date().getFullYear()}-${String(returnCount + 1).padStart(5, "0")}`;
  const totalRefund = input.items.reduce((sum, i) => sum + i.refundPaisa, 0);

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({ where: { id: input.saleId, tenantId } });
    if (!sale) throw new Error("Sale not found");

    await tx.saleReturn.create({
      data: {
        id: returnId, tenantId, returnNo, saleId: input.saleId,
        customerId: sale.customerId, reason: input.reason, refundPaisa: totalRefund
      }
    });

    for (const item of input.items) {
      await tx.saleReturnItem.create({
        data: {
          id: uid("sri"), saleReturnId: returnId, saleItemId: item.saleItemId,
          inventoryId: item.inventoryId, medicineName: item.medicineName,
          batchNo: item.batchNo, quantity: item.quantity, refundPaisa: item.refundPaisa
        }
      });
      await tx.inventoryItem.update({ where: { id: item.inventoryId }, data: { quantity: { increment: item.quantity } } });
    }

    if (sale.customerId) {
      await tx.customer.update({ where: { id: sale.customerId }, data: { outstandingPaisa: { decrement: totalRefund } } });
    }
  });

  salesSummaryCache.delete(tenantId);
  return (await getSaleReturns(tenantId)).find((r) => r.id === returnId);
}

// ─── Purchase Returns (tenant-scoped) ────────────────────────

export async function getPurchaseReturns(tenantId: string) {
  await ensureDefaultData();
  const returns = await prisma.purchaseReturn.findMany({
    where: { tenantId },
    include: { supplier: true, items: true },
    orderBy: { createdAt: "desc" }
  });
  return returns.map((r) => ({
    id: r.id, returnNo: r.returnNo, supplierId: r.supplierId,
    supplierName: r.supplier.name, reason: r.reason,
    totalPaisa: r.totalPaisa, status: r.status, createdAt: iso(r.createdAt),
    items: r.items.map((i) => ({
      id: i.id, medicineName: i.medicineName, batchNo: i.batchNo,
      quantity: i.quantity, ratePaisa: i.ratePaisa, totalPaisa: i.totalPaisa
    }))
  }));
}

export async function createPurchaseReturn(tenantId: string, input: {
  supplierId: string; reason: string;
  items: { inventoryId: string; medicineName: string; batchNo: string; quantity: number; ratePaisa: number }[];
}) {
  await ensureDefaultData();
  const returnId = uid("pret");
  const returnCount = await prisma.purchaseReturn.count({ where: { tenantId } });
  const returnNo = `PR-${new Date().getFullYear()}-${String(returnCount + 1).padStart(5, "0")}`;
  const totalPaisa = input.items.reduce((sum, i) => sum + i.quantity * i.ratePaisa, 0);

  await prisma.$transaction(async (tx) => {
    await tx.purchaseReturn.create({
      data: {
        id: returnId, tenantId, returnNo, supplierId: input.supplierId,
        reason: input.reason, totalPaisa
      }
    });

    for (const item of input.items) {
      await tx.purchaseReturnItem.create({
        data: {
          id: uid("pri"), purchaseReturnId: returnId, inventoryId: item.inventoryId,
          medicineName: item.medicineName, batchNo: item.batchNo,
          quantity: item.quantity, ratePaisa: item.ratePaisa,
          totalPaisa: item.quantity * item.ratePaisa
        }
      });
      await tx.inventoryItem.update({ where: { id: item.inventoryId }, data: { quantity: { decrement: item.quantity } } });
    }

    await tx.supplier.update({ where: { id: input.supplierId }, data: { balancePaisa: { decrement: totalPaisa } } });
  });

  return (await getPurchaseReturns(tenantId)).find((r) => r.id === returnId);
}

// ─── Advanced Reports (tenant-scoped) ────────────────────────

export async function getProfitReport(tenantId: string) {
  await ensureDefaultData();
  const items = await prisma.saleItem.findMany({
    where: { tenantId },
    include: { inventory: true }
  });

  let totalRevenue = 0;
  let totalCost = 0;
  let totalGst = 0;

  for (const item of items) {
    totalRevenue += item.totalPaisa;
    totalCost += item.inventory.purchaseRatePaisa * item.quantity;
    totalGst += item.gstPaisa;
  }

  const grossProfit = totalRevenue - totalCost - totalGst;

  return {
    totalRevenue, totalCost, totalGst, grossProfit,
    marginPercent: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0,
    itemCount: items.length
  };
}

export async function getExpiryReport(tenantId: string) {
  const rows = await getInventoryRows(tenantId);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const expired = rows.filter((r) => new Date(r.expiryDate) < now);
  const within30 = rows.filter((r) => { const d = new Date(r.expiryDate); return d >= now && d <= new Date(now.getTime() + 30 * 86400000); });
  const within90 = rows.filter((r) => { const d = new Date(r.expiryDate); return d > new Date(now.getTime() + 30 * 86400000) && d <= new Date(now.getTime() + 90 * 86400000); });
  const within180 = rows.filter((r) => { const d = new Date(r.expiryDate); return d > new Date(now.getTime() + 90 * 86400000) && d <= new Date(now.getTime() + 180 * 86400000); });

  const valueAtRisk = (items: LocalInventoryRow[]) => items.reduce((sum, r) => sum + r.mrpPaisa * r.quantity, 0);

  return {
    expired: { count: expired.length, valuePaisa: valueAtRisk(expired), items: expired.slice(0, 20) },
    within30: { count: within30.length, valuePaisa: valueAtRisk(within30), items: within30.slice(0, 20) },
    within90: { count: within90.length, valuePaisa: valueAtRisk(within90), items: within90.slice(0, 20) },
    within180: { count: within180.length, valuePaisa: valueAtRisk(within180), items: within180.slice(0, 20) }
  };
}

export async function getSlowMovingReport(tenantId: string) {
  await ensureDefaultData();
  const [inventory, saleItems] = await Promise.all([
    getInventoryRows(tenantId),
    prisma.saleItem.findMany({ where: { tenantId }, include: { sale: { select: { createdAt: true } } } })
  ]);

  const now = new Date();
  const salesByInv = new Map<string, Date>();
  for (const si of saleItems) {
    const existing = salesByInv.get(si.inventoryId);
    if (!existing || si.sale.createdAt.getTime() > existing.getTime()) salesByInv.set(si.inventoryId, si.sale.createdAt);
  }

  return inventory.map((row) => {
    const lastSale = salesByInv.get(row.id);
    const daysSinceLastSale = lastSale ? Math.floor((now.getTime() - lastSale.getTime()) / 86400000) : 999;
    return { ...row, lastSaleDate: lastSale ? iso(lastSale) : null, daysSinceLastSale };
  }).filter((r) => r.daysSinceLastSale > 30).sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale);
}

// ─── Medicine management ────────────────────────────────────

export async function searchByBarcode(tenantId: string, barcode: string) {
  await ensureDefaultData();
  const raw = barcode.trim();
  if (!raw) return [];

  // 1. Exact match first
  let rows = await prisma.inventoryItem.findMany({
    where: {
      tenantId,
      isActive: true,
      quantity: { gt: 0 },
      medicine: { barcode: raw },
    },
    include: { medicine: true, supplier: true },
    take: 5,
  });

  // 2. Fallback: try stripping leading zeros (common when scanner prefixes barcodes)
  if (rows.length === 0 && raw.startsWith("0")) {
    const stripped = raw.replace(/^0+/, "");
    if (stripped.length >= 3) {
      rows = await prisma.inventoryItem.findMany({
        where: {
          tenantId,
          isActive: true,
          quantity: { gt: 0 },
          medicine: { barcode: stripped },
        },
        include: { medicine: true, supplier: true },
        take: 5,
      });
    }
  }

  // 3. Fallback: If 13 digits (EAN-13), try the first 12 digits (truncation of check digit)
  if (rows.length === 0 && raw.length === 13) {
    const prefix12 = raw.substring(0, 12);
    rows = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        isActive: true,
        quantity: { gt: 0 },
        medicine: {
          OR: [
            { barcode: { startsWith: prefix12 } },
            { barcode: prefix12 },
          ],
        },
      },
      include: { medicine: true, supplier: true },
      take: 5,
    });
  }

  // 4. Fallback: Prefix/startsWith matching for general numeric queries >= 6 digits
  if (rows.length === 0 && raw.length >= 6) {
    rows = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        isActive: true,
        quantity: { gt: 0 },
        medicine: {
          barcode: { startsWith: raw },
        },
      },
      include: { medicine: true, supplier: true },
      take: 5,
    });
  }

  return rows.map(mapInventory);
}

export async function searchMedicinesByName(q: string) {
  await ensureDefaultData();
  const normalized = q.trim().toLowerCase();
  if (!normalized || normalized.length < 2) return [];
  const tokens = normalized.split(/\s+/).filter(t => t.length >= 2);
  const isShortQuery = normalized.length < 4;

  const conditions = tokens.length > 0
    ? tokens.map(token => ({
        OR: isShortQuery ? [
          { name: { contains: token } },
          { genericName: { contains: token } },
        ] : [
          { name: { contains: token } },
          { genericName: { contains: token } },
          { manufacturer: { contains: token } },
          { composition: { contains: token } },
        ],
      }))
    : [{
        OR: [
          { name: { contains: normalized } },
          { genericName: { contains: normalized } },
        ],
      }];

  const rows = await prisma.medicine.findMany({
    where: { AND: conditions },
    take: 10,
  });
  return rows.map(mapMedicine);
}

export async function createMedicine(input: unknown) {
  const data = createMedicineSchema.parse(input);
  await ensureDefaultData();

  if (data.barcode) {
    const existing = await prisma.medicine.findFirst({ where: { barcode: data.barcode } });
    if (existing) throw new Error(`A medicine with barcode ${data.barcode} already exists: ${existing.name}`);
  }

  const medicineId = uid("med");
  const medicine = await prisma.medicine.create({
    data: {
      id: medicineId,
      name: data.name,
      genericName: data.genericName || null,
      manufacturer: data.manufacturer || null,
      category: data.category || null,
      composition: data.composition || null,
      dosageForm: data.dosageForm || null,
      strength: data.strength || null,
      packSize: data.packSize || null,
      hsnCode: data.hsnCode || null,
      gstRate: data.gstRate,
      mrpPaisa: data.mrpPaisa,
      schedule: data.schedule,
      barcode: data.barcode || null,
      requiresPrescription: data.requiresPrescription,
    },
  });
  return mapMedicine(medicine);
}

export async function quickAddMedicineWithStock(tenantId: string, input: unknown) {
  const data = quickAddMedicineSchema.parse(input);
  await ensureDefaultData();

  if (data.barcode) {
    const existing = await prisma.medicine.findFirst({ where: { barcode: data.barcode } });
    if (existing) throw new Error(`A medicine with barcode ${data.barcode} already exists: ${existing.name}`);
  }

  const medicineId = uid("med");
  const inventoryId = uid("inv");

  const result = await prisma.$transaction(async (tx) => {
    const medicine = await tx.medicine.create({
      data: {
        id: medicineId,
        name: data.name,
        genericName: data.genericName || null,
        manufacturer: data.manufacturer || null,
        category: data.category || null,
        composition: data.composition || null,
        dosageForm: data.dosageForm || null,
        strength: data.strength || null,
        packSize: data.packSize || null,
        hsnCode: data.hsnCode || null,
        gstRate: data.gstRate,
        mrpPaisa: data.mrpPaisa,
        schedule: data.schedule,
        barcode: data.barcode || null,
        requiresPrescription: data.requiresPrescription,
      },
    });

    const inventory = await tx.inventoryItem.create({
      data: {
        id: inventoryId,
        tenantId,
        medicineId,
        batchNo: data.batchNo,
        mfgDate: data.mfgDate ? dateOnly(data.mfgDate) : null,
        expiryDate: dateOnly(data.expiryDate),
        purchaseRatePaisa: data.purchaseRatePaisa,
        mrpPaisa: data.mrpPaisa,
        saleRatePaisa: data.saleRatePaisa,
        gstRate: data.gstRate,
        hsnCode: data.hsnCode || null,
        quantity: data.quantity,
        reorderLevel: data.reorderLevel,
        rackLocation: data.rackLocation || null,
        supplierId: data.supplierId || null,
        isActive: true,
      },
      include: { medicine: true, supplier: true },
    });

    return { medicine, inventory };
  });

  return {
    medicine: mapMedicine(result.medicine),
    inventory: mapInventory(result.inventory),
  };
}

export async function getSalesWithItems(tenantId: string) {
  await ensureDefaultData();
  const sales = await prisma.sale.findMany({
    where: { tenantId },
    include: { items: true, prescriptionImages: true },
    orderBy: { createdAt: "desc" },
    take: 150
  });
  return sales.map(sale => ({
    ...mapSaleRow(sale),
    items: sale.items.map(mapSaleItemRow),
    prescriptionImages: sale.prescriptionImages.map(img => ({
      id: img.id,
      imageUrl: img.imageUrl,
      uploadedAt: img.uploadedAt.toISOString()
    }))
  }));
}

// ─── CSV export ──────────────────────────────────────────────

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}
