CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure admin user exists with active status and admin role
INSERT INTO users (id, email, password_hash, username, full_name, role, account_status)
VALUES (
  gen_random_uuid(),
  'admin@watchy.com',
  crypt('admin123', gen_salt('bf')),
  'admin',
  'Super Admin',
  'admin',
  'active'
)
ON CONFLICT (email) DO UPDATE SET 
  password_hash = crypt('admin123', gen_salt('bf')),
  role = 'admin',
  account_status = 'active';

-- Also ensure test@test.com has admin role if already registered
UPDATE users SET role = 'admin' WHERE email = 'test@test.com';
