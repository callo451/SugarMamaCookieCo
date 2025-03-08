/*
  # Fix Auth Policies
  
  1. Purpose:
    - Add default Supabase auth policies
    - Enable proper user creation
    - Maintain security while allowing auth operations
*/

-- First disable RLS temporarily to ensure we can apply changes
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- Add default policies for auth.users
DROP POLICY IF EXISTS "Can view own user data." ON auth.users;
DROP POLICY IF EXISTS "Can update own user data." ON auth.users;

CREATE POLICY "Can view own user data." ON auth.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Can update own user data." ON auth.users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create policy for service role to manage users
CREATE POLICY "Service role can manage users." ON auth.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant necessary permissions to the auth system
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO service_role;

-- Ensure authenticated users can access their own data
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT, UPDATE ON auth.users TO authenticated;

-- Allow the auth API to manage users
GRANT USAGE ON SCHEMA auth TO anon;
GRANT SELECT ON auth.users TO anon;

-- Re-enable RLS now that policies are in place
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY; 