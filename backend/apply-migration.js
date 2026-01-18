/**
 * Apply Disapproval Feature Migration
 * Directly executes the SQL migration using Supabase Management API
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extract project reference from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

async function executeSql(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({})
  });

  return response;
}

async function applyMigration() {
  console.log('🚀 Applying Disapproval Feature Migration...\n');

  // Read the SQL file
  const sqlPath = path.join(__dirname, '..', 'add-disapproval-feature.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('📄 SQL File loaded\n');
  console.log('Project:', projectRef || 'Unknown');
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('\n' + '='.repeat(60) + '\n');

  // Instructions for manual execution
  console.log('📋 MANUAL MIGRATION INSTRUCTIONS:\n');
  console.log('Since Supabase doesn\'t allow direct SQL execution via REST API,');
  console.log('you need to run the migration through the Dashboard:\n');

  console.log('Step 1: Open Supabase SQL Editor');
  console.log(`   → https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);

  console.log('Step 2: Copy the SQL below and paste it in the editor:\n');
  console.log('─'.repeat(60));
  console.log(sqlContent);
  console.log('─'.repeat(60));

  console.log('\nStep 3: Click "RUN" button\n');

  console.log('Step 4: Verify the migration succeeded');
  console.log('   You should see:');
  console.log('   ✅ ALTER TABLE');
  console.log('   ✅ CREATE FUNCTION');
  console.log('   ✅ CREATE VIEW');
  console.log('   ✅ GRANT statements\n');

  console.log('After running the migration:');
  console.log('1. Visit http://localhost:5173/admin/review');
  console.log('2. Look for "Approved Scripts" section');
  console.log('3. Click "View Details" on an approved script');
  console.log('4. You should see the "Disapprove Script" button\n');

  // Save a copy for easy access
  const outputPath = path.join(__dirname, '..', 'MIGRATION-TO-RUN.sql');
  fs.writeFileSync(outputPath, sqlContent);
  console.log(`💾 SQL also saved to: ${outputPath}\n`);
}

applyMigration().catch(console.error);
