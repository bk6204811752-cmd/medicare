const { PrismaClient } = require("@prisma/client");
const crypto = require("node:crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const tenant = {
  id: "tenant-sharma",
  name: "Sharma Medical Store",
  slug: "sharma-medical-ranchi",
  ownerName: "Basant Kumar",
  phone: "+91 98765 43210",
  email: "owner@sharmamedical.local",
  city: "Ranchi",
  state: "Jharkhand",
  gstin: "20ABCDE1234F1Z5",
  drugLicenseNo: "JH/RNC/2026/4521",
  plan: "free"
};

const medicines = [
  ["med-azithral", "Azithral 500 Tablet", "Azithromycin", "Alembic Pharma", "Antibiotic", "Azithromycin 500mg", "Tablet", "500mg", "Strip of 5", "30049069", 12, 11950, "H", "8901234500011", true],
  ["med-dolo", "Dolo 650 Tablet", "Paracetamol", "Micro Labs", "Pain relief", "Paracetamol 650mg", "Tablet", "650mg", "Strip of 15", "30049099", 12, 3350, "G", "8901234500028", false],
  ["med-glycomet", "Glycomet GP 1 Tablet", "Glimepiride + Metformin", "USV", "Diabetes", "Glimepiride 1mg + Metformin 500mg", "Tablet", "1mg/500mg", "Strip of 15", "30049076", 12, 12800, "H", "8901234500035", true],
  ["med-ors", "Electral ORS Sachet", "Oral Rehydration Salts", "FDC", "Hydration", "WHO ORS formula", "Powder", "21.8g", "1 sachet", "30049099", 5, 2300, "OTC", "8901234500042", false],
  ["med-becosules", "Becosules Capsule", "Vitamin B Complex", "Pfizer", "Vitamin", "B-complex vitamins", "Capsule", "Multivitamin", "Strip of 20", "30045039", 18, 5250, "OTC", "8901234500059", false],
  ["med-insulin", "Human Mixtard 30/70 Cartridge", "Human Insulin", "Novo Nordisk", "Diabetes", "Biphasic insulin", "Injection", "100IU/ml", "3ml cartridge", "30043110", 0, 43800, "H", "8901234500066", true]
];

const suppliers = [
  { id: "sup-medline", name: "Medline Distributors", phone: "9334411122", gstin: "20AABCM1234L1Z2", creditDays: 30, balancePaisa: 4500000 },
  { id: "sup-health", name: "HealthFirst Agency", phone: "9431122299", gstin: "20AADFH5678Q1Z6", creditDays: 21, balancePaisa: 1850000 }
];

const inventory = [
  ["inv-1", "med-azithral", "AZT2408", "2025-01-10", "2026-07-30", 8200, 11950, 11200, 12, "30049069", 18, 10, "A1", "sup-medline"],
  ["inv-2", "med-dolo", "DL650A", "2025-03-05", "2027-02-28", 2100, 3350, 3200, 12, "30049099", 96, 25, "B2", "sup-medline"],
  ["inv-3", "med-glycomet", "GP1251", "2024-10-12", "2026-06-20", 9200, 12800, 12100, 12, "30049076", 7, 12, "C4", "sup-health"],
  ["inv-4", "med-ors", "ORS991", "2025-05-01", "2026-05-30", 1500, 2300, 2200, 5, "30049099", 5, 20, "B1", "sup-health"],
  ["inv-5", "med-becosules", "BC2409", "2024-09-20", "2026-09-15", 3600, 5250, 5000, 18, "30045039", 42, 15, "D2", "sup-medline"],
  ["inv-6", "med-insulin", "INSMX2", "2025-02-01", "2026-06-05", 36000, 43800, 43000, 0, "30043110", 4, 8, "FRIDGE-1", "sup-health"]
];

const customers = [
  { id: "cust-1", name: "Ravi Prasad", phone: "9876501111", doctorName: "Dr. Mehta", outstandingPaisa: 125000, loyaltyPoints: 84 },
  { id: "cust-2", name: "Anita Devi", phone: "9876502222", doctorName: "Dr. Sinha", outstandingPaisa: 0, loyaltyPoints: 42 },
  { id: "cust-3", name: "Walk-in Customer", phone: "", outstandingPaisa: 0, loyaltyPoints: 0 }
];

async function main() {
  await prisma.tenant.upsert({
    where: { id: tenant.id },
    update: tenant,
    create: tenant
  });

  await prisma.user.upsert({
    where: { email: "admin@medcare.local" },
    update: {
      name: "Super Admin",
      phone: "+91 90000 00000",
      role: "super_admin",
      isActive: true
    },
    create: {
      id: "user-super-admin",
      tenantId: null,
      name: "Super Admin",
      email: "admin@medcare.local",
      phone: "+91 90000 00000",
      passwordHash: hashPassword("Admin@12345"),
      role: "super_admin",
      isActive: true
    }
  });

  await prisma.user.upsert({
    where: { email: "owner@sharmamedical.local" },
    update: {
      tenantId: tenant.id,
      name: "Basant Kumar",
      phone: "+91 98765 43210",
      role: "shop_admin",
      isActive: true
    },
    create: {
      id: "user-sharma-owner",
      tenantId: tenant.id,
      name: "Basant Kumar",
      email: "owner@sharmamedical.local",
      phone: "+91 98765 43210",
      passwordHash: hashPassword("Shop@12345"),
      role: "shop_admin",
      isActive: true
    }
  });

  const stockistTenantId = "tenant-demo-stockist";
  await prisma.tenant.upsert({
    where: { id: stockistTenantId },
    update: {
      name: "Shankar Pharma Wholesalers",
      slug: "shankar-pharma",
      ownerName: "Sanjay Mehta",
      phone: "+91 94311 02938",
      email: "stockist@medcare.local",
      city: "Ranchi",
      state: "Jharkhand",
      gstin: "20BBBBB1111B1Z2",
      drugLicenseNo: "JH-RAN-19283B",
      plan: "premium",
      isActive: true,
      approvalStatus: "approved"
    },
    create: {
      id: stockistTenantId,
      name: "Shankar Pharma Wholesalers",
      slug: "shankar-pharma",
      ownerName: "Sanjay Mehta",
      phone: "+91 94311 02938",
      email: "stockist@medcare.local",
      city: "Ranchi",
      state: "Jharkhand",
      gstin: "20BBBBB1111B1Z2",
      drugLicenseNo: "JH-RAN-19283B",
      plan: "premium",
      isActive: true,
      approvalStatus: "approved"
    }
  });

  await prisma.user.upsert({
    where: { email: "stockist@medcare.local" },
    update: {
      tenantId: stockistTenantId,
      name: "Sanjay Mehta",
      phone: "+91 94311 02938",
      role: "stockist_admin",
      isActive: true
    },
    create: {
      id: "user-demo-stockist",
      tenantId: stockistTenantId,
      name: "Sanjay Mehta",
      email: "stockist@medcare.local",
      phone: "+91 94311 02938",
      passwordHash: hashPassword("Stockist@12345"),
      role: "stockist_admin",
      isActive: true
    }
  });

  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: { id: supplier.id },
      update: { ...supplier, tenantId: tenant.id },
      create: { ...supplier, tenantId: tenant.id }
    });
  }

  for (const medicine of medicines) {
    const [id, name, genericName, manufacturer, category, composition, dosageForm, strength, packSize, hsnCode, gstRate, mrpPaisa, schedule, barcode, requiresPrescription] = medicine;
    await prisma.medicine.upsert({
      where: { id },
      update: { name, genericName, manufacturer, category, composition, dosageForm, strength, packSize, hsnCode, gstRate, mrpPaisa, schedule, barcode, requiresPrescription },
      create: { id, name, genericName, manufacturer, category, composition, dosageForm, strength, packSize, hsnCode, gstRate, mrpPaisa, schedule, barcode, requiresPrescription }
    });
  }

  for (const item of inventory) {
    const [id, medicineId, batchNo, mfgDate, expiryDate, purchaseRatePaisa, mrpPaisa, saleRatePaisa, gstRate, hsnCode, quantity, reorderLevel, rackLocation, supplierId] = item;
    await prisma.inventoryItem.upsert({
      where: { id },
      update: {
        tenantId: tenant.id,
        medicineId,
        batchNo,
        mfgDate: new Date(mfgDate),
        expiryDate: new Date(expiryDate),
        purchaseRatePaisa,
        mrpPaisa,
        saleRatePaisa,
        gstRate,
        hsnCode,
        quantity,
        reorderLevel,
        rackLocation,
        supplierId
      },
      create: {
        id,
        tenantId: tenant.id,
        medicineId,
        batchNo,
        mfgDate: new Date(mfgDate),
        expiryDate: new Date(expiryDate),
        purchaseRatePaisa,
        mrpPaisa,
        saleRatePaisa,
        gstRate,
        hsnCode,
        quantity,
        reorderLevel,
        rackLocation,
        supplierId
      }
    });
  }

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: { ...customer, tenantId: tenant.id },
      create: { ...customer, tenantId: tenant.id }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
