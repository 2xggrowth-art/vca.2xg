#!/usr/bin/env node

/**
 * Run SQL Migration Script
 * Executes the disapproval feature migration on Supabase
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

// Read the SQL file
const sqlFile = path.join(__dirname, 'add-disapproval-feature.sql');
const sqlContent = fs.readFileSync(sqlFile, 'utf8');

// Split into individual statements (simple split by semicolon)
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log('🚀 Running Disapproval Feature Migration...\n');
console.log(`📄 SQL File: ${sqlFile}`);
console.log(`🔢 Statements to execute: ${statements.length}\n`);

async function runMigration() {
  const { createClient } = require('@supabase/supabase-js');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
    },
  });

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments and verification queries for now
    if (statement.includes('SELECT column_name') ||
        statement.includes('SELECT routine_name') ||
        statement.includes('SELECT table_name')) {
      console.log(`⏭️  Skipping verification query ${i + 1}`);
      continue;
    }

    try {
      console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);

      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      }).catch(async () => {
        // If exec_sql doesn't exist, try direct execution via REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({ query: statement + ';' })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return { data: await response.json(), error: null };
      });

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Success`);
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Migration Results:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📝 Total: ${statements.length}`);

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Navigate to http://localhost:5173/admin/review');
    console.log('2. Look for the "Approved Scripts" section');
    console.log('3. Click "View Details" on any approved script');
    console.log('4. Test the "Disapprove Script" button\n');
  } else {
    console.log('\n⚠️  Migration completed with errors. Please check the logs above.\n');
    console.log('You may need to run the SQL manually in Supabase Dashboard:');
    console.log(`1. Go to ${SUPABASE_URL.replace('/v1', '')}/project/_/sql/new`);
    console.log('2. Copy and paste the contents of add-disapproval-feature.sql');
    console.log('3. Run the SQL\n');
  }
}

runMigration().catch(error => {
  console.error('\n❌ Migration failed:', error.message);
  console.log('\n📋 Manual Migration Instructions:');
  console.log('1. Open Supabase Dashboard SQL Editor');
  console.log('2. Copy the contents of add-disapproval-feature.sql');
  console.log('3. Paste and execute in the SQL editor\n');
  process.exit(1);
});
