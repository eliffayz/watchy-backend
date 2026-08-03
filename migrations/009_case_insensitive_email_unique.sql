-- Migration 009: Add unique index for case-insensitive email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_email ON users(LOWER(email));
