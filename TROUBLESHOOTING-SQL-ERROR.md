# Troubleshooting: "relation viral_analyses does not exist" Error

## The Error You're Seeing

```
Error: Failed to run sql query: ERROR: 42P01: relation "viral_analyses" does not exist
LINE 12: FROM viral_analyses
```

## What This Means

The database can't find the `viral_analyses` table. This happens for one of these reasons:

### 1. Wrong Database Selected
You might be running the SQL in the wrong Supabase project.

**Fix**:
- Verify you're in the correct project at: https://supabase.com/dashboard
- Check the project name matches your app

### 2. Table is in a Different Schema
PostgreSQL uses schemas, and the table might not be in `public` schema.

**Fix**: Use the diagnostic SQL first (see below)

### 3. Table Hasn't Been Created Yet
The initial setup SQL hasn't been run.

**Fix**: Run `supabase-setup.sql` first

## Step-by-Step Fix

### Step 1: Run Diagnostic First

**File**: `DIAGNOSTIC-CHECK-DATABASE.sql`

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `DIAGNOSTIC-CHECK-DATABASE.sql`
3. Paste and click **Run**
4. This will show you:
   - ✅ All tables that exist
   - ✅ Whether viral_analyses exists
   - ✅ What columns it has
   - ✅ Current schema

### Step 2: Based on Diagnostic Results

#### If viral_analyses DOES exist:
Use **`FIX-DUPLICATE-CONTENT-IDS-V2.sql`** (improved version)
- This version explicitly uses `public.` schema prefix
- Better error handling
- More detailed logging

#### If viral_analyses DOES NOT exist:
Run the initial setup first:
1. Open `supabase-setup.sql`
2. Copy all contents
3. Paste in Supabase SQL Editor
4. Click **Run**
5. Then run `FIX-DUPLICATE-CONTENT-IDS-V2.sql`

### Step 3: Run the Fix

Once you confirm the table exists, run:

**File**: `FIX-DUPLICATE-CONTENT-IDS-V2.sql`

This version:
- ✅ Checks if table exists first
- ✅ Uses explicit schema prefixes (`public.`)
- ✅ Better error messages
- ✅ More detailed logging

## What Each File Does

### `DIAGNOSTIC-CHECK-DATABASE.sql`
**Purpose**: Diagnose what's in your database
**When to use**: When you get "relation does not exist" errors
**Safe to run**: Yes, read-only queries

### `FIX-DUPLICATE-CONTENT-IDS-V2.sql`
**Purpose**: Fix duplicate content_ids and prevent future duplicates
**When to use**: After confirming viral_analyses table exists
**Safe to run**: Yes, but backs up by keeping oldest records

### `supabase-setup.sql`
**Purpose**: Initial database setup
**When to use**: First time setup or if tables are missing
**Safe to run**: Yes, uses `CREATE TABLE IF NOT EXISTS`

## Expected Output (V2)

When you run `FIX-DUPLICATE-CONTENT-IDS-V2.sql` successfully, you should see:

```
CURRENT DUPLICATES:
content_id | count | analysis_ids | created_dates
BCH-1001   | 2     | {uuid1,uuid2} | {16/01/2026,18/01/2026}

NOTICE: Processing duplicate content_id: BCH-1001
NOTICE: Keeping original ID for analysis: uuid1
NOTICE: Updated analysis uuid2 with new content_id: BCH-1002
NOTICE: Total rows updated: 1

VERIFICATION - REMAINING DUPLICATES:
(empty)

TRIGGER VERIFICATION:
trigger_name: auto_generate_content_id
event_manipulation: INSERT
event_object_table: viral_analyses

SUMMARY:
total_scripts: 50
unique_content_ids: 50
duplicate_count: 0
null_content_ids: 0
```

## Still Getting Errors?

If you still get errors after running the diagnostic:

### Check 1: Verify Project Connection
```sql
-- Run this to see current database
SELECT current_database();
```

### Check 2: List All Schemas
```sql
-- See all schemas
SELECT schema_name FROM information_schema.schemata;
```

### Check 3: Search All Schemas for viral_analyses
```sql
-- Find viral_analyses in any schema
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name LIKE '%viral%';
```

### Check 4: View Current User Permissions
```sql
-- Check your permissions
SELECT * FROM information_schema.table_privileges
WHERE table_name = 'viral_analyses';
```

## Quick Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `DIAGNOSTIC-CHECK-DATABASE.sql` | Check what exists | First - always run this |
| `FIX-DUPLICATE-CONTENT-IDS-V2.sql` | Fix duplicates | After confirming table exists |
| `supabase-setup.sql` | Create tables | If diagnostic shows no tables |

## Next Steps

1. ✅ Run `DIAGNOSTIC-CHECK-DATABASE.sql`
2. ✅ Share the output here
3. ✅ Based on output, I'll tell you exactly which file to run next
