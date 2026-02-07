#!/usr/bin/env node
/**
 * Apply RLS Policies for app-v2 anon access
 *
 * Usage:
 *   node apply-rls-policies.js <database-password>
 *
 * Or set environment variable:
 *   SUPABASE_DB_PASSWORD=<password> node apply-rls-policies.js
 */

const { Client } = require('pg');

const PROJECT_REF = 'ckfbjsphyasborpnwbyy';
const DB_PASSWORD = process.argv[2] || process.env.SUPABASE_DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('❌ Database password required');
  console.error('');
  console.error('Usage:');
  console.error('  node apply-rls-policies.js <your-supabase-db-password>');
  console.error('');
  console.error('Or set environment variable:');
  console.error('  SUPABASE_DB_PASSWORD=<password> node apply-rls-policies.js');
  console.error('');
  console.error('Find your password at:');
  console.error(`  https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database`);
  console.error('  (Under "Connection string" > "Database password")');
  process.exit(1);
}

// Use Supabase connection pooler (session mode - better for DDL)
const connectionString = `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`;

const SQL = `
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CREATE PASSWORD RESET TOKENS TABLE (for forgot password flow)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON public.password_reset_tokens(user_email);

-- RLS policies - allow backend service role to manage tokens
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on password_reset_tokens" ON public.password_reset_tokens;
CREATE POLICY "Service role full access on password_reset_tokens"
  ON public.password_reset_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. RLS POLICIES FOR ANON ACCESS (needed for app-v2 which uses Authentik auth)
-- ═══════════════════════════════════════════════════════════════════════════

-- Allow anon to read profiles (needed for user counts, team listing)
DROP POLICY IF EXISTS "Anon can read profiles" ON public.profiles;
CREATE POLICY "Anon can read profiles"
  ON public.profiles FOR SELECT TO anon
  USING (true);

-- Allow anon to read profile_list (needed for profile dropdowns)
DROP POLICY IF EXISTS "Anon can read profile_list" ON public.profile_list;
CREATE POLICY "Anon can read profile_list"
  ON public.profile_list FOR SELECT TO anon
  USING (true);

-- Allow anon to read industries (needed for industry dropdowns)
DROP POLICY IF EXISTS "Anon can read industries" ON public.industries;
CREATE POLICY "Anon can read industries"
  ON public.industries FOR SELECT TO anon
  USING (true);

-- Allow anon to read project_assignments (needed for assignments)
DROP POLICY IF EXISTS "Anon can read project_assignments" ON public.project_assignments;
CREATE POLICY "Anon can read project_assignments"
  ON public.project_assignments FOR SELECT TO anon
  USING (true);
`;

async function applyPolicies() {
  console.log('🔄 Connecting to Supabase database...');

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    console.log('🔄 Applying RLS policies...');
    await client.query(SQL);

    console.log('✅ RLS policies applied successfully!');
    console.log('');
    console.log('The admin dashboard should now load correctly at:');
    console.log('  http://192.168.68.125:5175/');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('password authentication failed')) {
      console.error('');
      console.error('Wrong password. Find your password at:');
      console.error(`  https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyPolicies();
