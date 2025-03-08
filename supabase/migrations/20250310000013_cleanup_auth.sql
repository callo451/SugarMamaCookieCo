/*
  # Clean Up Auth System
  
  1. Purpose:
    - Remove all custom auth functions
    - Remove custom user roles
    - Clean up any auth-related tables
    - Reset to basic Supabase auth
*/

-- Drop all custom auth functions
DROP FUNCTION IF EXISTS public.create_user CASCADE;
DROP FUNCTION IF EXISTS public.create_admin_user CASCADE;
DROP FUNCTION IF EXISTS public.check_is_admin CASCADE;
DROP FUNCTION IF EXISTS public.set_admin_status CASCADE;
DROP FUNCTION IF EXISTS public.toggle_user_admin CASCADE;
DROP FUNCTION IF EXISTS public.delete_user CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS user_role CASCADE;

-- Remove custom metadata from users
UPDATE auth.users
SET raw_user_meta_data = '{}'::jsonb
WHERE raw_user_meta_data IS NOT NULL;

-- Drop any custom auth-related tables (except core Supabase tables)
DROP TABLE IF EXISTS profiles CASCADE;

-- Remove any custom policies
DROP POLICY IF EXISTS "Allow admins to view all users" ON auth.users;
DROP POLICY IF EXISTS "Allow users to view own profile" ON auth.users;

-- Reset RLS on auth.users to Supabase defaults
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY; 