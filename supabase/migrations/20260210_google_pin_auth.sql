-- Add Google Sign-In and PIN auth columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Index for Google ID lookups
CREATE INDEX IF NOT EXISTS idx_profiles_google_id ON profiles(google_id);

-- Drop password reset tokens table (no longer needed)
DROP TABLE IF EXISTS password_reset_tokens;
