/**
 * Run Disapproval Feature Migration
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🚀 Running Disapproval Feature Migration...\n');

  try {
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('viral_analyses')
      .select('count')
      .limit(1);

    if (testError) {
      throw new Error(`Connection test failed: ${testError.message}`);
    }

    console.log('✅ Connected to Supabase\n');

    // Since Supabase doesn't have a direct SQL execution endpoint via the client,
    // we'll use the SQL execution approach through the REST API
    const sqlStatements = [
      {
        name: 'Add disapproval_count column',
        sql: `ALTER TABLE viral_analyses ADD COLUMN IF NOT EXISTS disapproval_count INTEGER DEFAULT 0;`
      },
      {
        name: 'Add last_disapproved_at column',
        sql: `ALTER TABLE viral_analyses ADD COLUMN IF NOT EXISTS last_disapproved_at TIMESTAMPTZ;`
      },
      {
        name: 'Add disapproval_reason column',
        sql: `ALTER TABLE viral_analyses ADD COLUMN IF NOT EXISTS disapproval_reason TEXT;`
      }
    ];

    console.log('⚠️  Note: Direct SQL execution requires Supabase Dashboard access\n');
    console.log('📋 Please run the following in Supabase SQL Editor:\n');
    console.log('1. Go to your Supabase Dashboard > SQL Editor');
    console.log('2. Copy and paste the SQL from: add-disapproval-feature.sql');
    console.log('3. Click "Run"\n');

    // Alternative: Show instructions to verify if migration already ran
    console.log('🔍 Checking if migration already exists...\n');

    // Try to query a script to see if the field exists
    const { data: sample, error: sampleError } = await supabase
      .from('viral_analyses')
      .select('id, disapproval_count, last_disapproved_at, disapproval_reason')
      .limit(1)
      .maybeSingle();

    if (!sampleError) {
      console.log('✅ Migration appears to be already applied!');
      console.log('   The disapproval fields exist in the database.\n');
      console.log('🎉 You can now use the disapproval feature!\n');
      console.log('Next steps:');
      console.log('1. Visit http://localhost:5173/admin/review');
      console.log('2. Look for the "Approved Scripts" section');
      console.log('3. Click "View Details" on any approved script');
      console.log('4. Test the "Disapprove Script" button\n');
      return;
    }

    console.log('⚠️  Migration not yet applied.\n');
    console.log('To apply the migration:');
    console.log('1. Open Supabase Dashboard SQL Editor');
    console.log('2. Copy the contents of ../add-disapproval-feature.sql');
    console.log('3. Paste and execute\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Manual Migration Required:');
    console.log('1. Open Supabase Dashboard > SQL Editor');
    console.log('2. Copy contents from: add-disapproval-feature.sql');
    console.log('3. Run the SQL\n');
  }
}

runMigration();
