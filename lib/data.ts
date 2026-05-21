import type { Customer, InventoryItem, Medicine, Supplier } from "@/lib/types";

export const tenant = {
  id: "tenant-sharma",
  name: "Sharma Medical Store",
  ownerName: "Basant Kumar",
  city: "Ranchi",
  state: "Jharkhand",
  phone: "+91 98765 43210",
  gstin: "20ABCDE1234F1Z5",
  drugLicenseNo: "JH/RNC/2026/4521",
  plan: "Free Trial"
};

export const medicines: Medicine[] = [
  {
    id: "med-azithral",
    name: "Azithral 500 Tablet",
    genericName: "Azithromycin",
    manufacturer: "Alembic Pharma",
    category: "Antibiotic",
    composition: "Azithromycin 500mg",
    dosageForm: "Tablet",
    strength: "500mg",
    packSize: "Strip of 5",
    hsnCode: "30049069",
    gstRate: 12,
    mrpPaisa: 11950,
    schedule: "H",
    barcode: "8901234500011",
    requiresPrescription: true
  },
  {
    id: "med-dolo",
    name: "Dolo 650 Tablet",
    genericName: "Paracetamol",
    manufacturer: "Micro Labs",
    category: "Pain relief",
    composition: "Paracetamol 650mg",
    dosageForm: "Tablet",
    strength: "650mg",
    packSize: "Strip of 15",
    hsnCode: "30049099",
    gstRate: 12,
    mrpPaisa: 3350,
    schedule: "G",
    barcode: "8901234500028",
    requiresPrescription: false
  },
  {
    id: "med-glycomet",
    name: "Glycomet GP 1 Tablet",
    genericName: "Glimepiride + Metformin",
    manufacturer: "USV",
    category: "Diabetes",
    composition: "Glimepiride 1mg + Metformin 500mg",
    dosageForm: "Tablet",
    strength: "1mg/500mg",
    packSize: "Strip of 15",
    hsnCode: "30049076",
    gstRate: 12,
    mrpPaisa: 12800,
    schedule: "H",
    barcode: "8901234500035",
    requiresPrescription: true
  },
  {
    id: "med-ors",
    name: "Electral ORS Sachet",
    genericName: "Oral Rehydration Salts",
    manufacturer: "FDC",
    category: "Hydration",
    composition: "WHO ORS formula",
    dosageForm: "Powder",
    strength: "21.8g",
    packSize: "1 sachet",
    hsnCode: "30049099",
    gstRate: 5,
    mrpPaisa: 2300,
    schedule: "OTC",
    barcode: "8901234500042",
    requiresPrescription: false
  },
  {
    id: "med-becosules",
    name: "Becosules Capsule",
    genericName: "Vitamin B Complex",
    manufacturer: "Pfizer",
    category: "Vitamin",
    composition: "B-complex vitamins",
    dosageForm: "Capsule",
    strength: "Multivitamin",
    packSize: "Strip of 20",
    hsnCode: "30045039",
    gstRate: 18,
    mrpPaisa: 5250,
    schedule: "OTC",
    barcode: "8901234500059",
    requiresPrescription: false
  },
  {
    id: "med-insulin",
    name: "Human Mixtard 30/70 Cartridge",
    genericName: "Human Insulin",
    manufacturer: "Novo Nordisk",
    category: "Diabetes",
    composition: "Biphasic insulin",
    dosageForm: "Injection",
    strength: "100IU/ml",
    packSize: "3ml cartridge",
    hsnCode: "30043110",
    gstRate: 0,
    mrpPaisa: 43800,
    schedule: "H",
    barcode: "8901234500066",
    requiresPrescription: true
  }
];

export const suppliers: Supplier[] = [
  { id: "sup-medline", name: "Medline Distributors", phone: "9334411122", gstin: "20AABCM1234L1Z2", creditDays: 30, balancePaisa: 4500000 },
  { id: "sup-health", name: "HealthFirst Agency", phone: "9431122299", gstin: "20AADFH5678Q1Z6", creditDays: 21, balancePaisa: 1850000 }
];

export const inventory: InventoryItem[] = [
  { id: "inv-1", tenantId: tenant.id, medicineId: "med-azithral", batchNo: "AZT2408", mfgDate: "2025-01-10", expiryDate: "2026-07-30", purchaseRatePaisa: 8200, mrpPaisa: 11950, saleRatePaisa: 11200, gstRate: 12, hsnCode: "30049069", quantity: 18, reorderLevel: 10, rackLocation: "A1", supplierId: "sup-medline" },
  { id: "inv-2", tenantId: tenant.id, medicineId: "med-dolo", batchNo: "DL650A", mfgDate: "2025-03-05", expiryDate: "2027-02-28", purchaseRatePaisa: 2100, mrpPaisa: 3350, saleRatePaisa: 3200, gstRate: 12, hsnCode: "30049099", quantity: 96, reorderLevel: 25, rackLocation: "B2", supplierId: "sup-medline" },
  { id: "inv-3", tenantId: tenant.id, medicineId: "med-glycomet", batchNo: "GP1251", mfgDate: "2024-10-12", expiryDate: "2026-06-20", purchaseRatePaisa: 9200, mrpPaisa: 12800, saleRatePaisa: 12100, gstRate: 12, hsnCode: "30049076", quantity: 7, reorderLevel: 12, rackLocation: "C4", supplierId: "sup-health" },
  { id: "inv-4", tenantId: tenant.id, medicineId: "med-ors", batchNo: "ORS991", mfgDate: "2025-05-01", expiryDate: "2026-05-30", purchaseRatePaisa: 1500, mrpPaisa: 2300, saleRatePaisa: 2200, gstRate: 5, hsnCode: "30049099", quantity: 5, reorderLevel: 20, rackLocation: "B1", supplierId: "sup-health" },
  { id: "inv-5", tenantId: tenant.id, medicineId: "med-becosules", batchNo: "BC2409", mfgDate: "2024-09-20", expiryDate: "2026-09-15", purchaseRatePaisa: 3600, mrpPaisa: 5250, saleRatePaisa: 5000, gstRate: 18, hsnCode: "30045039", quantity: 42, reorderLevel: 15, rackLocation: "D2", supplierId: "sup-medline" },
  { id: "inv-6", tenantId: tenant.id, medicineId: "med-insulin", batchNo: "INSMX2", mfgDate: "2025-02-01", expiryDate: "2026-06-05", purchaseRatePaisa: 36000, mrpPaisa: 43800, saleRatePaisa: 43000, gstRate: 0, hsnCode: "30043110", quantity: 4, reorderLevel: 8, rackLocation: "FRIDGE-1", supplierId: "sup-health" }
];

export const customers: Customer[] = [
  { id: "cust-1", name: "Ravi Prasad", phone: "9876501111", doctorName: "Dr. Mehta", outstandingPaisa: 125000, loyaltyPoints: 84 },
  { id: "cust-2", name: "Anita Devi", phone: "9876502222", doctorName: "Dr. Sinha", outstandingPaisa: 0, loyaltyPoints: 42 },
  { id: "cust-3", name: "Walk-in Customer", phone: "", outstandingPaisa: 0, loyaltyPoints: 0 }
];

export const salesTrend = [
  { day: "Mon", sales: 18500 },
  { day: "Tue", sales: 22400 },
  { day: "Wed", sales: 19800 },
  { day: "Thu", sales: 24500 },
  { day: "Fri", sales: 30200 },
  { day: "Sat", sales: 27800 },
  { day: "Sun", sales: 14600 }
];

export function getInventoryRows() {
  return inventory.map((item) => ({
    ...item,
    medicine: medicines.find((medicine) => medicine.id === item.medicineId)!,
    supplier: suppliers.find((supplier) => supplier.id === item.supplierId)!
  }));
}
