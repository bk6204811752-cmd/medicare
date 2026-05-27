/**
 * Verify Supabase Setup
 * 
 * This script checks if Supabase is properly configured and tables exist.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables');
  console.error('   Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function verify() {
  console.log('🔍 Verifying Supabase setup...\n');
  console.log(`📍 URL: ${supabaseUrl}\n`);

  const requiredTables = [
    'tenants',
    'users',
    'auth_sessions',
    'medicines',
    'inventory_items',
    'customers',
    'suppliers',
    'sales',
    'sale_items',
    'purchase_orders',
    'purchase_order_items',
    'stock_movements',
    'parties',
    'routes',
    'salesmen',
    'b2b_sales_orders',
    'b2b_sales',
    'receipts',
  ];

  let allGood = true;
  let existingCount = 0;

  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        allGood = false;
      } else {
        console.log(`✅ ${table}`);
        existingCount++;
      }
    } catch (error: any) {
      console.log(`❌ ${table}: ${error.message}`);
      allGood = false;
    }
  }

  console.log('');
  console.log(`📊 Found ${existingCount}/${requiredTables.length} tables\n`);

  if (allGood) {
    console.log('✅ All tables exist! Database is ready.');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run seed script: npx tsx scripts/seed-supabase.ts');
    console.log('  2. Start dev server: npm run dev');
    console.log('  3. Test login at http://localhost:3000/login\n');
  } else {
    console.log('❌ Some tables are missing.');
    console.log('');
    console.log('Please run the migration:');
    console.log('  1. Open Supabase Dashboard');
    console.log('  2. Go to SQL Editor');
    console.log('  3. Paste contents of scripts/migrate-to-supabase.sql');
    console.log('  4. Click Run');
    console.log('  5. Then run this script again\n');
    console.log('See SUPABASE_MIGRATION_GUIDE.md for detailed instructions.\n');
  }
}

verify().catch(console.error);
