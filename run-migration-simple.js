#!/usr/bin/env node

/**
 * Simple SQL Migration Runner
 * Executes the disapproval feature migration
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🚀 Running Disapproval Feature Migration...\n');

  try {
    // 1. Add columns
    console.log('1️⃣  Adding disapproval tracking columns...');
    const { error: alterError } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE viral_analyses
        ADD COLUMN IF NOT EXISTS disapproval_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_disapproved_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS disapproval_reason TEXT;
      `
    });

    if (alterError && !alterError.message.includes('already exists')) {
      throw alterError;
    }
    console.log('   ✅ Columns added\n');

    // 2. Create function
    console.log('2️⃣  Creating disapprove_script() function...');
    const { error: funcError } = await supabase.rpc('exec', {
      sql: `
        CREATE OR REPLACE FUNCTION disapprove_script(
          analysis_uuid UUID,
          reason TEXT
        )
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          UPDATE viral_analyses
          SET
            status = 'PENDING',
            disapproval_count = disapproval_count + 1,
            last_disapproved_at = NOW(),
            disapproval_reason = reason,
            production_stage = CASE
              WHEN production_stage IN ('NOT_STARTED', 'PRE_PRODUCTION') THEN production_stage
              ELSE 'NOT_STARTED'
            END,
            updated_at = NOW()
          WHERE id = analysis_uuid
          AND status = 'APPROVED';

          UPDATE viral_analyses
          SET production_notes = COALESCE(production_notes || E'\\n\\n', '') ||
            '🔴 DISAPPROVED on ' || NOW()::TEXT || E'\\nReason: ' || reason
          WHERE id = analysis_uuid;
        END;
        $$;
      `
    });

    if (funcError) {
      throw funcError;
    }
    console.log('   ✅ Function created\n');

    console.log('✅ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Visit http://localhost:5173/admin/review');
    console.log('2. Find the "Approved Scripts" section');
    console.log('3. Click "View Details" on an approved script');
    console.log('4. Test the "Disapprove Script" button\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Please run manually in Supabase Dashboard:');
    console.log('Copy add-disapproval-feature.sql and run it in the SQL Editor\n');
    process.exit(1);
  }
}

runMigration();
