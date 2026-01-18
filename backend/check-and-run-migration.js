/**
 * Check and Run Disapproval Feature Migration
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🚀 Disapproval Feature Migration Tool\n');
  console.log('='.repeat(60));

  // Check if migration is already applied
  console.log('\n🔍 Checking migration status...\n');

  try {
    const { data, error } = await supabase
      .from('viral_analyses')
      .select('id, disapproval_count, last_disapproved_at, disapproval_reason')
      .limit(1)
      .maybeSingle();

    if (!error) {
      console.log('✅ MIGRATION ALREADY APPLIED!\n');
      console.log('   All disapproval fields exist in the database.');
      console.log('   The feature is ready to use!\n');
      console.log('='.repeat(60));
      console.log('\n🎉 You can now test the disapproval feature:\n');
      console.log('   1. Open: http://localhost:5173/admin/review');
      console.log('   2. Scroll to "Approved Scripts" section');
      console.log('   3. Click "View Details" on any approved script');
      console.log('   4. Look for the "Disapprove Script" button (orange color)');
      console.log('   5. Click it, enter a reason, and submit\n');
      console.log('The script should move back to PENDING status! ✨\n');
      return;
    }

    // Migration not applied yet
    console.log('⚠️  MIGRATION NOT YET APPLIED\n');
    console.log('   The disapproval fields do not exist in the database.');
    console.log('   Error:', error.message, '\n');

    console.log('='.repeat(60));
    console.log('\n📋 TO APPLY THE MIGRATION:\n');

    const projectRef = process.env.SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

    console.log('Option 1: Via Supabase Dashboard (RECOMMENDED)');
    console.log('─'.repeat(60));
    console.log('   Step 1: Open SQL Editor');
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);
    console.log('   Step 2: Copy SQL from this file:');
    console.log('   → MIGRATION-TO-RUN.sql (in project root)\n');
    console.log('   Step 3: Paste into SQL Editor and click "RUN"\n');
    console.log('   Step 4: Run this script again to verify:\n');
    console.log('   node check-and-run-migration.js\n');

    console.log('\nOption 2: Copy SQL directly from terminal');
    console.log('─'.repeat(60));
    console.log('   The SQL is printed below. Copy it and paste in Supabase SQL Editor:\n');

    // Print the actual SQL
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, '..', 'MIGRATION-TO-RUN.sql');

    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log('─'.repeat(60));
      console.log(sql);
      console.log('─'.repeat(60));
    } else {
      console.log('   ⚠️  MIGRATION-TO-RUN.sql not found');
      console.log('   Use add-disapproval-feature.sql instead\n');
    }

  } catch (err) {
    console.error('\n❌ Error checking migration status:', err.message);
    console.log('\nPlease check:');
    console.log('1. SUPABASE_URL is set correctly in .env');
    console.log('2. SUPABASE_SERVICE_ROLE_KEY is set correctly in .env');
    console.log('3. Database is accessible\n');
  }
}

main();
