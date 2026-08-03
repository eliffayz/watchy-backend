-- Migration 007: Add missing columns for OAuth and user profile
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_genres JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_sub TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_apple_sub ON users(apple_sub);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
