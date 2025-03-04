/*
  # Fix Admin Access

  1. Changes
    - Drop and recreate admin check function with better error handling
    - Create secure view for auth users
    - Set up proper RLS policies
    - Ensure admin status is properly set
*/

-- Drop existing functions and views
DROP FUNCTION IF EXISTS check_is_admin CASCADE;
DROP VIEW IF EXISTS auth_users_view CASCADE;

-- Create a more robust admin check function
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
  is_admin boolean;
BEGIN
  -- Get current user ID
  user_id := auth.uid();
  
  -- Return false if no user is logged in
  IF user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user is admin
  SELECT COALESCE((raw_user_meta_data->>'is_admin')::boolean, false)
  INTO is_admin
  FROM auth.users
  WHERE id = user_id;
  
  RETURN is_admin;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in check_is_admin: %', SQLERRM;
    RETURN false;
END;
$$;

-- Create secure view for auth users
CREATE VIEW auth_users_view WITH (security_barrier) AS
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users;

-- Enable RLS
ALTER VIEW auth_users_view ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY admin_select_policy ON auth_users_view
  FOR SELECT
  TO authenticated
  USING (check_is_admin());

-- Grant necessary permissions
GRANT SELECT ON auth_users_view TO authenticated;
GRANT EXECUTE ON FUNCTION check_is_admin TO authenticated;

-- Ensure admin status is properly set
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object('is_admin', true)
WHERE email = 'deancallaghan8@bigpond.com'
AND (raw_user_meta_data->>'is_admin' IS NULL OR raw_user_meta_data->>'is_admin' != 'true');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_admin_status ON auth.users USING gin (raw_user_meta_data);