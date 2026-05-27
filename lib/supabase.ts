/**
 * Supabase Client Utilities
 * 
 * This module provides Supabase client instances for both server-side and client-side usage.
 * - Server-side: Uses service role key to bypass RLS for trusted operations
 * - Client-side: Uses anon key with RLS enforcement
 * 
 * Note: Primary database operations use Prisma ORM (see lib/prisma.ts).
 * Supabase SDK is available for Storage, Realtime, Edge Functions, etc.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Server-side Supabase client with service role key
 * Bypasses RLS - use only in trusted server-side code
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Client-side Supabase client with anon key
 * RLS policies enforced - safe for browser usage
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });
}

/**
 * Type-safe query helper with error handling
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<T> {
  const { data, error } = await queryFn();
  
  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(error.message || 'Database query failed');
  }
  
  if (!data) {
    throw new Error('No data returned from query');
  }
  
  return data;
}
