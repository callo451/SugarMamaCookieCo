/*
  # Fix admin view and access control

  1. Changes
    - Drop and recreate auth_users_view with proper security
    - Add function to safely check admin status
    - Add policies for admin access
    - Fix user metadata handling

  2. Security
    - Proper row level security
    - Safe admin checks
    - Protected metadata access
*/

-- Drop existing view
DROP VIEW IF EXISTS auth_users_view;

-- Create a more secure view
CREATE VIEW auth_users_view AS
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users;

-- Enable RLS
ALTER TABLE auth_users_view ENABLE ROW LEVEL SECURITY;

-- Create a more robust admin check function
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;

-- Create policy for admin access
CREATE POLICY admin_select_policy ON auth_users_view
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Ensure your admin status is set
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN 
      jsonb_build_object('is_admin', true)
    ELSE 
      raw_user_meta_data || jsonb_build_object('is_admin', true)
  END
WHERE email = 'deancallaghan8@bigpond.com';