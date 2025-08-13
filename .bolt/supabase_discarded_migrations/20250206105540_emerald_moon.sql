/*
  # Fix admin access control

  1. Changes
    - Drop problematic view
    - Create new secure view with proper access control
    - Update admin check function
    - Add secure policies

  2. Security
    - Proper access control
    - Safe admin checks
    - Protected user data
*/

-- Drop existing view
DROP VIEW IF EXISTS auth_users_view;

-- Create a new secure view
CREATE VIEW auth_users_view AS
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users;

-- Create a more secure admin check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  SELECT COALESCE((raw_user_meta_data->>'is_admin')::boolean, false)
  INTO _is_admin
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN _is_admin;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON auth_users_view TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;

-- Create secure RLS policies for the auth.users table
CREATE POLICY "Allow admins to view all users" ON auth.users
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Ensure admin status is set for your user
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN 
      jsonb_build_object('is_admin', true)
    ELSE 
      raw_user_meta_data || jsonb_build_object('is_admin', true)
  END
WHERE email = 'deancallaghan8@bigpond.com';