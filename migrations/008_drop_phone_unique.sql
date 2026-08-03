-- Migration 008: Drop unique constraint on phone so optional profile phone does not block user registration
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;
