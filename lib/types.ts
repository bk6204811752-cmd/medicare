export type Role = "super_admin" | "shop_admin" | "stockist_admin" | "staff" | "pharmacist" | "stockist_staff";

export type Medicine = {
  id: string;
  name: string;
  genericName: string;
  manufacturer: string;
  category: string;
  composition: string;
  dosageForm: string;
  strength: string;
  packSize: string;
  hsnCode: string;
  gstRate: 0 | 5 | 12 | 18;
  mrpPaisa: number;
  schedule: "OTC" | "G" | "H" | "H1" | "X";
  barcode: string;
  requiresPrescription: boolean;
};

export type InventoryItem = {
  id: string;
  tenantId: string;
  medicineId: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  purchaseRatePaisa: number;
  mrpPaisa: number;
  saleRatePaisa: number;
  gstRate: 0 | 5 | 12 | 18;
  hsnCode: string;
  quantity: number;
  reorderLevel: number;
  rackLocation: string;
  supplierId: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  doctorName?: string;
  outstandingPaisa: number;
  loyaltyPoints: number;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  gstin: string;
  creditDays: number;
  balancePaisa: number;
};

export type SaleLine = {
  inventoryId: string;
  medicineName: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  mrpPaisa: number;
  saleRatePaisa: number;
  discountPercent: number;
  gstRate: 0 | 5 | 12 | 18;
  hsnCode: string;
  schedule: Medicine["schedule"];
};
