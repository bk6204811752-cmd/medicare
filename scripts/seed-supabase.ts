/**
 * Supabase Seed Script
 * 
 * This script seeds the Supabase database with initial demo data:
 * - Super Admin user
 * - Demo Shop Tenant (Sharma Medical Store)
 * - Demo Stockist Tenant (Shankar Pharma Wholesalers)
 * - Sample medicines, inventory, customers, and suppliers
 * 
 * The script is idempotent - it checks for existing records before inserting.
 * Safe to run multiple times.
 * 
 * Usage: node scripts/seed-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'node:crypto';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Hash password using scrypt (same as Prisma implementation)
 */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Upsert helper - insert if not exists, update if exists
 */
async function upsert(
  table: string,
  matchColumn: string,
  matchValue: any,
  data: any
) {
  // Check if record exists
  const { data: existing } = await supabase
    .from(table)
    .select('*')
    .eq(matchColumn, matchValue)
    .single();

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from(table)
      .update(data)
      .eq(matchColumn, matchValue);

    if (error) {
      console.error(`Error updating ${table}:`, error);
      throw error;
    }
    console.log(`✓ Updated ${table}: ${matchValue}`);
  } else {
    // Insert new record
    const { error } = await supabase
      .from(table)
      .insert(data);

    if (error) {
      console.error(`Error inserting ${table}:`, error);
      throw error;
    }
    console.log(`✓ Created ${table}: ${matchValue}`);
  }
}

// ============================================================================
// SEED DATA
// ============================================================================

const shopTenant = {
  id: 'tenant-sharma',
  name: 'Sharma Medical Store',
  slug: 'sharma-medical-ranchi',
  owner_name: 'Basant Kumar',
  phone: '+91 98765 43210',
  email: 'owner@sharmamedical.local',
  city: 'Ranchi',
  state: 'Jharkhand',
  gstin: '20ABCDE1234F1Z5',
  drug_license_no: 'JH/RNC/2026/4521',
  plan: 'free',
  is_active: true,
  approval_status: 'approved'
};

const stockistTenant = {
  id: 'tenant-demo-stockist',
  name: 'Shankar Pharma Wholesalers',
  slug: 'shankar-pharma',
  owner_name: 'Sanjay Mehta',
  phone: '+91 94311 02938',
  email: 'stockist@medcare.local',
  city: 'Ranchi',
  state: 'Jharkhand',
  gstin: '20BBBBB1111B1Z2',
  drug_license_no: 'JH-RAN-19283B',
  plan: 'premium',
  is_active: true,
  approval_status: 'approved'
};

const users = [
  {
    id: 'user-super-admin',
    tenant_id: null,
    name: 'Super Admin',
    email: 'admin@medcare.local',
    phone: '+91 90000 00000',
    password_hash: hashPassword('Admin@12345'),
    role: 'super_admin',
    is_active: true
  },

  {
    id: 'user-sharma-owner',
    tenant_id: 'tenant-sharma',
    name: 'Basant Kumar',
    email: 'owner@sharmamedical.local',
    phone: '+91 98765 43210',
    password_hash: hashPassword('Shop@12345'),
    role: 'shop_admin',
    is_active: true
  },
  {
    id: 'user-demo-stockist',
    tenant_id: 'tenant-demo-stockist',
    name: 'Sanjay Mehta',
    email: 'stockist@medcare.local',
    phone: '+91 94311 02938',
    password_hash: hashPassword('Stockist@12345'),
    role: 'stockist_admin',
    is_active: true
  }
];

const medicines = [
  {
    id: 'med-azithral',
    name: 'Azithral 500 Tablet',
    generic_name: 'Azithromycin',
    manufacturer: 'Alembic Pharma',
    category: 'Antibiotic',
    composition: 'Azithromycin 500mg',
    dosage_form: 'Tablet',
    strength: '500mg',
    pack_size: 'Strip of 5',
    hsn_code: '30049069',
    gst_rate: 12,
    mrp_paisa: 11950,
    schedule: 'H',
    barcode: '8901234500011',
    requires_prescription: true
  },
  {
    id: 'med-dolo',
    name: 'Dolo 650 Tablet',
    generic_name: 'Paracetamol',
    manufacturer: 'Micro Labs',
    category: 'Pain relief',
    composition: 'Paracetamol 650mg',
    dosage_form: 'Tablet',
    strength: '650mg',
    pack_size: 'Strip of 15',
    hsn_code: '30049099',
    gst_rate: 12,
    mrp_paisa: 3350,
    schedule: 'G',
    barcode: '8901234500028',
    requires_prescription: false
  },

  {
    id: 'med-glycomet',
    name: 'Glycomet GP 1 Tablet',
    generic_name: 'Glimepiride + Metformin',
    manufacturer: 'USV',
    category: 'Diabetes',
    composition: 'Glimepiride 1mg + Metformin 500mg',
    dosage_form: 'Tablet',
    strength: '1mg/500mg',
    pack_size: 'Strip of 15',
    hsn_code: '30049076',
    gst_rate: 12,
    mrp_paisa: 12800,
    schedule: 'H',
    barcode: '8901234500035',
    requires_prescription: true
  },
  {
    id: 'med-ors',
    name: 'Electral ORS Sachet',
    generic_name: 'Oral Rehydration Salts',
    manufacturer: 'FDC',
    category: 'Hydration',
    composition: 'WHO ORS formula',
    dosage_form: 'Powder',
    strength: '21.8g',
    pack_size: '1 sachet',
    hsn_code: '30049099',
    gst_rate: 5,
    mrp_paisa: 2300,
    schedule: 'OTC',
    barcode: '8901234500042',
    requires_prescription: false
  },
  {
    id: 'med-becosules',
    name: 'Becosules Capsule',
    generic_name: 'Vitamin B Complex',
    manufacturer: 'Pfizer',
    category: 'Vitamin',
    composition: 'B-complex vitamins',
    dosage_form: 'Capsule',
    strength: 'Multivitamin',
    pack_size: 'Strip of 20',
    hsn_code: '30045039',
    gst_rate: 18,
    mrp_paisa: 5250,
    schedule: 'OTC',
    barcode: '8901234500059',
    requires_prescription: false
  },
  {
    id: 'med-insulin',
    name: 'Human Mixtard 30/70 Cartridge',
    generic_name: 'Human Insulin',
    manufacturer: 'Novo Nordisk',
    category: 'Diabetes',
    composition: 'Biphasic insulin',
    dosage_form: 'Injection',
    strength: '100IU/ml',
    pack_size: '3ml cartridge',
    hsn_code: '30043110',
    gst_rate: 0,
    mrp_paisa: 43800,
    schedule: 'H',
    barcode: '8901234500066',
    requires_prescription: true
  }
];

const suppliers = [
  {
    id: 'sup-medline',
    tenant_id: 'tenant-sharma',
    name: 'Medline Distributors',
    phone: '9334411122',
    gstin: '20AABCM1234L1Z2',
    credit_days: 30,
    balance_paisa: 4500000,
    is_active: true
  },
  {
    id: 'sup-health',
    tenant_id: 'tenant-sharma',
    name: 'HealthFirst Agency',
    phone: '9431122299',
    gstin: '20AADFH5678Q1Z6',
    credit_days: 21,
    balance_paisa: 1850000,
    is_active: true
  }
];

const inventory = [
  {
    id: 'inv-1',
    tenant_id: 'tenant-sharma',
    medicine_id: 'med-azithral',
    batch_no: 'AZT2408',
    mfg_date: '2025-01-10',
    expiry_date: '2026-07-30',
    purchase_rate_paisa: 8200,
    mrp_paisa: 11950,
    sale_rate_paisa: 11200,
    gst_rate: 12,
    hsn_code: '30049069',
    quantity: 18,
    reorder_level: 10,
    rack_location: 'A1',
    supplier_id: 'sup-medline',
    is_active: true
  },
  {
    id: 'inv-2',
    tenant_id: 'tenant-sharma',
    medicine_id: 'med-dolo',
    batch_no: 'DL650A',
    mfg_date: '2025-03-05',
    expiry_date: '2027-02-28',
    purchase_rate_paisa: 2100,
    mrp_paisa: 3350,
    sale_rate_paisa: 3200,
    gst_rate: 12,
    hsn_code: '30049099',
    quantity: 96,
    reorder_level: 25,
    rack_location: 'B2',
    supplier_id: 'sup-medline',
    is_active: true
  },

  {
    id: 'inv-3',
    tenant_id: 'tenant-sharma',
    medicine_id: 'med-glycomet',
    batch_no: 'GP1251',
    mfg_date: '2024-10-12',
    expiry_date: '2026-06-20',
    purchase_rate_paisa: 9200,
    mrp_paisa: 12800,
    sale_rate_paisa: 12100,
    gst_rate: 12,
    hsn_code: '30049076',
    quantity: 7,
    reorder_level: 12,
    rack_location: 'C4',
    supplier_id: 'sup-health',
    is_active: true
  },
  {
    id: 'inv-4',
    tenant_id: 'tenant-sharma',
    medicine_id: 'med-ors',
    batch_no: 'ORS991',
    mfg_date: '2025-05-01',
    expiry_date: '2026-05-30',
    purchase_rate_paisa: 1500,
    mrp_paisa: 2300,
    sale_rate_paisa: 2200,
    gst_rate: 5,
    hsn_code: '30049099',
    quantity: 5,
    reorder_level: 20,
    rack_location: 'B1',
    supplier_id: 'sup-health',
    is_active: true
  },
  {
    id: 'inv-5',
    tenant_id: 'tenant-sharma',
    medicine_id: 'med-becosules',
    batch_no: 'BC2409',
    mfg_date: '2024-09-20',
    expiry_date: '2026-09-15',
    purchase_rate_paisa: 3600,
    mrp_paisa: 5250,
    sale_rate_paisa: 5000,
    gst_rate: 18,
    hsn_code: '30045039',
    quantity: 42,
    reorder_level: 15,
    rack_location: 'D2',
    supplier_id: 'sup-medline',
    is_active: true
  },
  {
    id: 'inv-6',
    tenant_id: 'tenant-sharma',
    medicine_id: 'med-insulin',
    batch_no: 'INSMX2',
    mfg_date: '2025-02-01',
    expiry_date: '2026-06-05',
    purchase_rate_paisa: 36000,
    mrp_paisa: 43800,
    sale_rate_paisa: 43000,
    gst_rate: 0,
    hsn_code: '30043110',
    quantity: 4,
    reorder_level: 8,
    rack_location: 'FRIDGE-1',
    supplier_id: 'sup-health',
    is_active: true
  }
];

const customers = [
  {
    id: 'cust-1',
    tenant_id: 'tenant-sharma',
    name: 'Rajesh Verma',
    phone: '9876543210',
    address: 'Sector 2, Dhurwa, Ranchi',
    balance_paisa: 0,
    is_active: true
  },
  {
    id: 'cust-2',
    tenant_id: 'tenant-sharma',
    name: 'Priya Singh',
    phone: '8765432109',
    address: 'Main Road, Ranchi',
    balance_paisa: 0,
    is_active: true
  },
  {
    id: 'cust-3',
    tenant_id: 'tenant-sharma',
    name: 'Amit Kumar',
    phone: '7654321098',
    address: 'Lalpur, Ranchi',
    balance_paisa: 0,
    is_active: true
  }
];

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seed() {
  console.log('🌱 Starting Supabase seed...\n');

  try {
    // 1. Seed Tenants
    console.log('📦 Seeding Tenants...');
    await upsert('tenants', 'id', shopTenant.id, shopTenant);
    await upsert('tenants', 'id', stockistTenant.id, stockistTenant);
    console.log('');

    // 2. Seed Users
    console.log('👤 Seeding Users...');
    for (const user of users) {
      await upsert('users', 'id', user.id, user);
    }
    console.log('');

    // 3. Seed Medicines
    console.log('💊 Seeding Medicines...');
    for (const medicine of medicines) {
      await upsert('medicines', 'id', medicine.id, medicine);
    }
    console.log('');

    // 4. Seed Suppliers
    console.log('🏢 Seeding Suppliers...');
    for (const supplier of suppliers) {
      await upsert('suppliers', 'id', supplier.id, supplier);
    }
    console.log('');

    // 5. Seed Inventory
    console.log('📊 Seeding Inventory...');
    for (const inv of inventory) {
      await upsert('inventory', 'id', inv.id, inv);
    }
    console.log('');

    // 6. Seed Customers
    console.log('🧑‍🤝‍🧑 Seeding Customers...');
    for (const customer of customers) {
      await upsert('customers', 'id', customer.id, customer);
    }
    console.log('');

    console.log('✅ Seed completed successfully!\n');
    console.log('📝 Demo Credentials:');
    console.log('   Super Admin: admin@medcare.local / Admin@12345');
    console.log('   Shop Owner:  owner@sharmamedical.local / Shop@12345');
    console.log('   Stockist:    stockist@medcare.local / Stockist@12345');
    console.log('');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run seed
seed();
