/*
  # Simplify Admin Authentication

  1. Changes
    - Remove all complex views and functions
    - Create simple admin check function
    - Set up basic admin flag in user metadata
*/

-- Drop all existing admin-related objects
DROP VIEW IF EXISTS auth_users_view CASCADE;
DROP FUNCTION IF EXISTS check_is_admin CASCADE;
DROP FUNCTION IF EXISTS is_admin CASCADE;
DROP FUNCTION IF EXISTS toggle_user_admin CASCADE;
DROP FUNCTION IF EXISTS delete_user CASCADE;
DROP FUNCTION IF EXISTS set_admin_status CASCADE;

-- Create simple admin check function
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_is_admin TO authenticated;

-- Set admin status for initial user
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object('is_admin', true)
WHERE email = 'deancallaghan8@bigpond.com';