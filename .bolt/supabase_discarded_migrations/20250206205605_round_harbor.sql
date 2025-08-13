/*
  # Fix Auth Users View

  1. Changes
    - Drop existing view and recreate with security barrier
    - Update admin check function
    - Set up proper access control
*/

-- Drop existing view and function
DROP VIEW IF EXISTS auth_users_view CASCADE;
DROP FUNCTION IF EXISTS check_is_admin CASCADE;

-- Create improved admin check function
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

-- Create secure view with built-in access control
CREATE OR REPLACE VIEW auth_users_view 
WITH (security_barrier) 
AS
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users
WHERE check_is_admin();  -- Built-in access control

-- Grant necessary permissions
GRANT SELECT ON auth_users_view TO authenticated;
GRANT EXECUTE ON FUNCTION check_is_admin TO authenticated;

-- Ensure admin status is properly set
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object('is_admin', true)
WHERE email = 'deancallaghan8@bigpond.com'
AND (raw_user_meta_data->>'is_admin' IS NULL OR raw_user_meta_data->>'is_admin' != 'true');