import { z } from "zod";

export const saleLineSchema = z.object({
  inventoryId: z.string().min(1),
  quantity: z.number().int().positive(),
  saleRatePaisa: z.number().int().nonnegative(),
  discountPercent: z.number().int().min(0).max(100)
});

export const createSaleSchema = z.object({
  customerName: z.string().trim().optional(),
  customerPhone: z.string().trim().optional(),
  doctorName: z.string().trim().optional(),
  prescriptionNo: z.string().trim().optional(),
  paymentMode: z.enum(["cash", "upi", "card", "credit"]),
  lines: z.array(saleLineSchema).min(1)
});

export const createInventorySchema = z.object({
  medicineId: z.string().min(1),
  supplierId: z.string().optional(),
  batchNo: z.string().trim().min(1),
  mfgDate: z.string().optional(),
  expiryDate: z.string().min(1),
  purchaseRatePaisa: z.number().int().nonnegative(),
  mrpPaisa: z.number().int().nonnegative(),
  saleRatePaisa: z.number().int().nonnegative(),
  gstRate: z.union([z.literal(0), z.literal(5), z.literal(12), z.literal(18), z.literal(28)]),
  hsnCode: z.string().trim().optional(),
  quantity: z.number().int().nonnegative(),
  reorderLevel: z.number().int().nonnegative(),
  rackLocation: z.string().trim().optional()
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required"),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Valid email is required").optional().or(z.literal("")),
  address: z.string().trim().optional(),
  doctorName: z.string().trim().optional(),
  outstandingPaisa: z.number().int().nonnegative().default(0),
  loyaltyPoints: z.number().int().nonnegative().default(0)
});

export const createSupplierSchema = z.object({
  name: z.string().trim().min(2, "Supplier name is required"),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Valid email is required").optional().or(z.literal("")),
  address: z.string().trim().optional(),
  gstin: z.string().trim().optional(),
  creditDays: z.number().int().min(0).max(365),
  balancePaisa: z.number().int().nonnegative().default(0)
});

export const stockAdjustmentSchema = z.object({
  inventoryId: z.string().min(1),
  adjustmentType: z.enum(["opening", "damage", "loss", "sample", "correction", "return_in", "return_out"]),
  quantityDelta: z.number().int().refine((value) => value !== 0, "Quantity change cannot be zero"),
  reason: z.string().trim().min(3, "Reason is required"),
  referenceNo: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include one uppercase letter")
  .regex(/[a-z]/, "Password must include one lowercase letter")
  .regex(/[0-9]/, "Password must include one number");

export const registerShopSchema = z
  .object({
    shopName: z.string().trim().min(2, "Shop name is required"),
    ownerName: z.string().trim().min(2, "Owner name is required"),
    phone: z.string().trim().min(8, "Phone number is required"),
    email: z.string().trim().email("Valid email is required").toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    gstin: z.string().trim().optional(),
    drugLicenseNo: z.string().trim().optional()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required").toLowerCase(),
  password: z.string().min(1, "Password is required")
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Valid email is required").toLowerCase()
});

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("Valid email is required").toLowerCase(),
    otp: z.string().trim().length(6, "OTP must be 6 digits").regex(/^\d+$/, "OTP must be numeric"),
    password: passwordSchema,
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export const sendVerificationOtpSchema = z.object({
  shopName: z.string().trim().min(2, "Shop name is required"),
  ownerName: z.string().trim().min(2, "Owner name is required"),
  phone: z.string().trim().min(8, "Phone number is required"),
  email: z.string().trim().email("Valid email is required").toLowerCase(),
  password: passwordSchema,
  confirmPassword: z.string(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  gstin: z.string().trim().optional(),
  drugLicenseNo: z.string().trim().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export const verifyEmailOtpSchema = z.object({
  email: z.string().trim().email("Valid email is required").toLowerCase(),
  otp: z.string().trim().length(6, "OTP must be 6 digits").regex(/^\d+$/, "OTP must be numeric")
});

export const createMedicineSchema = z.object({
  name: z.string().trim().min(2, "Medicine name is required"),
  genericName: z.string().trim().optional().default(""),
  manufacturer: z.string().trim().optional().default(""),
  category: z.string().trim().optional().default(""),
  composition: z.string().trim().optional().default(""),
  dosageForm: z.string().trim().optional().default(""),
  strength: z.string().trim().optional().default(""),
  packSize: z.string().trim().optional().default(""),
  hsnCode: z.string().trim().optional().default(""),
  gstRate: z.union([z.literal(0), z.literal(5), z.literal(12), z.literal(18), z.literal(28)]).default(12),
  mrpPaisa: z.number().int().nonnegative(),
  schedule: z.enum(["OTC", "G", "H", "H1", "X"]).default("OTC"),
  barcode: z.string().trim().optional().default(""),
  requiresPrescription: z.boolean().default(false),
});

export const quickAddMedicineSchema = z.object({
  name: z.string().trim().min(2, "Medicine name is required"),
  genericName: z.string().trim().optional().default(""),
  manufacturer: z.string().trim().optional().default(""),
  category: z.string().trim().optional().default(""),
  composition: z.string().trim().optional().default(""),
  dosageForm: z.string().trim().optional().default(""),
  strength: z.string().trim().optional().default(""),
  packSize: z.string().trim().optional().default(""),
  hsnCode: z.string().trim().optional().default(""),
  gstRate: z.union([z.literal(0), z.literal(5), z.literal(12), z.literal(18), z.literal(28)]).default(12),
  mrpPaisa: z.number().int().nonnegative(),
  schedule: z.enum(["OTC", "G", "H", "H1", "X"]).default("OTC"),
  barcode: z.string().trim().optional().default(""),
  requiresPrescription: z.boolean().default(false),
  batchNo: z.string().trim().min(1, "Batch number is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  mfgDate: z.string().optional(),
  purchaseRatePaisa: z.number().int().nonnegative(),
  saleRatePaisa: z.number().int().nonnegative(),
  quantity: z.number().int().nonnegative(),
  reorderLevel: z.number().int().nonnegative().default(10),
  rackLocation: z.string().trim().optional().default(""),
  supplierId: z.string().optional(),
});
