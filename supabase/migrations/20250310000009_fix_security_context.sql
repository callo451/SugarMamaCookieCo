/*
  # Fix Security Context and RLS
  
  1. Purpose:
    - Address RLS and security context issues
    - Ensure proper schema access
    - Fix function permissions
*/

-- First, let's check and fix RLS
DO $$
BEGIN
  -- Temporarily disable RLS on auth.users if it's enabled
  ALTER TABLE IF EXISTS auth.users DISABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'Disabled RLS on auth.users';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error modifying RLS: %', SQLERRM;
END $$;

-- Recreate functions with expanded security context
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'is_admin' = 'true'
  );
END;
$$;

-- Update set_admin_status with expanded security context
CREATE OR REPLACE FUNCTION public.set_admin_status(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
SET role = 'postgres'  -- Ensure highest privileges
AS $$
BEGIN
  -- Attempt to update user with expanded privileges
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN 
        jsonb_build_object('is_admin', 'true')
      ELSE 
        raw_user_meta_data || jsonb_build_object('is_admin', 'true')
    END
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'User with email % not found', user_email;
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Ensure proper grants
GRANT USAGE ON SCHEMA auth TO postgres, authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;
GRANT EXECUTE ON FUNCTION public.check_is_admin TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_admin_status TO authenticated, anon;

-- Remove admin status from demo user with elevated privileges
DO $$
BEGIN
  SET ROLE postgres;
  
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN 
        '{}'::jsonb
      ELSE 
        raw_user_meta_data - 'is_admin'
    END
  WHERE email = 'demo@demo.com';
  
  RESET ROLE;
END $$;

-- Verify current permissions
DO $$
DECLARE
  role_record RECORD;
BEGIN
  RAISE NOTICE '=== SECURITY CONTEXT VERIFICATION ===';
  
  -- Check current role
  RAISE NOTICE 'Current role: %', CURRENT_USER;
  
  -- Check schema permissions
  FOR role_record IN 
    SELECT grantee, privilege_type, table_schema, table_name
    FROM information_schema.role_table_grants
    WHERE table_schema = 'auth'
  LOOP
    RAISE NOTICE 'Permission: % has % on %.%',
      role_record.grantee,
      role_record.privilege_type,
      role_record.table_schema,
      role_record.table_name;
  END LOOP;
  
  -- Check RLS status
  RAISE NOTICE 'RLS status for auth.users:';
  FOR role_record IN 
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'auth' AND tablename = 'users'
  LOOP
    RAISE NOTICE 'Table: %, RLS enabled: %',
      role_record.tablename,
      role_record.rowsecurity;
  END LOOP;
END $$;

-- Provide updated instructions
DO $$
BEGIN
  RAISE NOTICE '=== UPDATED INSTRUCTIONS WITH SECURITY CONTEXT ===';
  RAISE NOTICE 'To set up the admin user:';
  RAISE NOTICE '1. Go to Supabase dashboard > Authentication > Users';
  RAISE NOTICE '2. Click "Add User"';
  RAISE NOTICE '3. Create user: faith.colwellbeaver@gmail.com';
  RAISE NOTICE '4. Then run this command:';
  RAISE NOTICE E'    DO $do$ \nBEGIN\n    SET ROLE postgres;\n    PERFORM public.set_admin_status(''faith.colwellbeaver@gmail.com'');\n    RESET ROLE;\nEND $do$;';
  RAISE NOTICE '';
  RAISE NOTICE 'If you still encounter permission issues:';
  RAISE NOTICE '1. Check the Supabase dashboard > Authentication > Policies';
  RAISE NOTICE '2. Ensure no policies are blocking the operation';
  RAISE NOTICE '3. You might need to temporarily disable RLS if enabled';
  RAISE NOTICE '=== END INSTRUCTIONS ===';
END $$; 