/**
 * Execute SQL Migration Directly
 * Runs the disapproval feature migration using Supabase client
 */

const fs = require('fs');
const path = require('path');

// Load env from backend directory
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSqlStatements() {
  console.log('🚀 Executing Disapproval Feature Migration...\n');

  const statements = [
    {
      name: '1. Add disapproval_count column',
      sql: `ALTER TABLE viral_analyses ADD COLUMN IF NOT EXISTS disapproval_count INTEGER DEFAULT 0;`
    },
    {
      name: '2. Add last_disapproved_at column',
      sql: `ALTER TABLE viral_analyses ADD COLUMN IF NOT EXISTS last_disapproved_at TIMESTAMPTZ;`
    },
    {
      name: '3. Add disapproval_reason column',
      sql: `ALTER TABLE viral_analyses ADD COLUMN IF NOT EXISTS disapproval_reason TEXT;`
    },
    {
      name: '4. Create disapprove_script function',
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
            disapproval_count = COALESCE(disapproval_count, 0) + 1,
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
    },
    {
      name: '5. Add function comment',
      sql: `
        COMMENT ON FUNCTION disapprove_script IS
        'Allows admin to disapprove an already-approved script and send it back to PENDING status. Increments disapproval counter and resets production stage if needed.';
      `
    },
    {
      name: '6. Create index on disapproval_count',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_viral_analyses_disapproval
        ON viral_analyses(disapproval_count)
        WHERE disapproval_count > 0;
      `
    },
    {
      name: '7. Create disapproved_scripts view',
      sql: `
        CREATE OR REPLACE VIEW disapproved_scripts AS
        SELECT
          va.id,
          va.content_id,
          va.title,
          va.status,
          va.disapproval_count,
          va.rejection_count,
          va.last_disapproved_at,
          va.disapproval_reason,
          va.production_stage,
          p.full_name as script_writer_name,
          p.email as script_writer_email,
          va.created_at,
          va.updated_at
        FROM viral_analyses va
        LEFT JOIN profiles p ON va.user_id = p.id
        WHERE va.disapproval_count > 0
        ORDER BY va.last_disapproved_at DESC;
      `
    },
    {
      name: '8. Grant execute permission on function',
      sql: `GRANT EXECUTE ON FUNCTION disapprove_script TO authenticated;`
    },
    {
      name: '9. Grant select permission on view',
      sql: `GRANT SELECT ON disapproved_scripts TO authenticated;`
    }
  ];

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const { name, sql } of statements) {
    try {
      console.log(`⚙️  ${name}...`);

      // Execute using RPC call to a custom function, or use direct SQL via REST API
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: sql })
      }).catch(() => null);

      // If that doesn't work, try using supabase-js query method
      if (!response || !response.ok) {
        // For ALTER TABLE and CREATE statements, we need to use the SQL editor or direct connection
        // This is a limitation of Supabase's REST API - DDL statements need special handling
        console.log('   ⚠️  Cannot execute via REST API (normal for DDL statements)');
        console.log('   ℹ️  This statement needs to run in Supabase Dashboard');
        errorCount++;
        errors.push({ name, message: 'DDL statement requires Supabase Dashboard' });
        continue;
      }

      console.log('   ✅ Success\n');
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      errorCount++;
      errors.push({ name, message: error.message });
    }
  }

  console.log('='.repeat(60));
  console.log('\n📊 Migration Results:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed/Skipped: ${errorCount}`);
  console.log(`   📝 Total: ${statements.length}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some statements could not be executed via API.');
    console.log('   This is normal for DDL statements (ALTER TABLE, CREATE FUNCTION, etc.)\n');
    console.log('📋 Please run the migration in Supabase Dashboard:\n');
    console.log('   1. Open: https://supabase.com/dashboard/project/ckfbjsphyasborpnwbyy/sql/new');
    console.log('   2. Copy and paste the SQL from: MIGRATION-TO-RUN.sql');
    console.log('   3. Click "RUN"\n');
  } else {
    console.log('\n🎉 Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Visit http://localhost:5173/admin/review');
    console.log('2. Look for "Approved Scripts" section');
    console.log('3. Click "View Details" on an approved script');
    console.log('4. Test the "Disapprove Script" button\n');
  }
}

// Alternative: Check if columns already exist
async function checkMigrationStatus() {
  console.log('🔍 Checking migration status...\n');

  try {
    const { data, error } = await supabase
      .from('viral_analyses')
      .select('id, disapproval_count, last_disapproved_at, disapproval_reason')
      .limit(1)
      .maybeSingle();

    if (!error) {
      console.log('✅ Migration already applied!');
      console.log('   All disapproval fields exist in the database.\n');
      console.log('🎉 The disapproval feature is ready to use!\n');
      console.log('Test it now:');
      console.log('1. Visit http://localhost:5173/admin/review');
      console.log('2. Look for "Approved Scripts" section');
      console.log('3. Click "View Details" on an approved script');
      console.log('4. You should see the "Disapprove Script" button\n');
      return true;
    }

    console.log('⚠️  Migration not yet applied.\n');
    return false;
  } catch (err) {
    console.log('⚠️  Could not check migration status.\n');
    return false;
  }
}

async function main() {
  const isApplied = await checkMigrationStatus();

  if (!isApplied) {
    console.log('📋 Manual Migration Instructions:\n');
    console.log('Since Supabase REST API cannot execute DDL statements directly,');
    console.log('you need to run the migration through the Dashboard:\n');
    console.log('Step 1: Open Supabase SQL Editor');
    console.log('   https://supabase.com/dashboard/project/ckfbjsphyasborpnwbyy/sql/new\n');
    console.log('Step 2: Copy and paste the SQL from:');
    console.log('   File: MIGRATION-TO-RUN.sql (in project root)\n');
    console.log('Step 3: Click "RUN" button\n');
    console.log('Step 4: Run this script again to verify: node run-sql-migration.js\n');
  }
}

main().catch(console.error);
