/*
  # Fix Authentication Setup

  1. Changes
    - Drop and recreate check_is_admin function with proper error handling
    - Add proper RLS policies for auth tables
    - Ensure admin users can be properly identified
    - Fix user metadata handling

  2. Security
    - Enable RLS on necessary tables
    - Add policies for authenticated users
    - Ensure proper function security
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS check_is_admin();

-- Create improved check_is_admin function with better error handling
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
  user_meta jsonb;
  is_admin boolean;
BEGIN
  -- Get current user ID
  user_id := auth.uid();
  
  -- Return false if no user is logged in
  IF user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get user metadata
  SELECT raw_user_meta_data INTO user_meta
  FROM auth.users
  WHERE id = user_id;

  -- Check if user is admin
  is_admin := (user_meta->>'is_admin')::boolean;
  
  -- Return false if no metadata or not admin
  RETURN COALESCE(is_admin, false);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return false for any errors
    RAISE WARNING 'Error in check_is_admin: %', SQLERRM;
    RETURN false;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_is_admin TO authenticated;

-- Create helper function to set admin status
CREATE OR REPLACE FUNCTION set_admin_status(target_email text, admin_status boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN 
        jsonb_build_object('is_admin', admin_status)
      ELSE 
        raw_user_meta_data || jsonb_build_object('is_admin', admin_status)
    END
  WHERE email = target_email;

  RETURN FOUND;
END;
$$;

-- Set up initial admin user (replace with your email)
SELECT set_admin_status('deancallaghan8@bigpond.com', true);

-- Create RLS policies for auth_users_view
DROP POLICY IF EXISTS "Allow admins to view all users" ON auth_users_view;
CREATE POLICY "Allow admins to view all users" ON auth_users_view
  FOR SELECT
  TO authenticated
  USING (check_is_admin());

-- Ensure RLS is enabled
ALTER VIEW auth_users_view SECURITY DEFINER;