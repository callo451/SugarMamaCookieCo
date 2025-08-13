/*
  # Fix admin login functionality

  1. Changes
    - Drop and recreate check_is_admin function with proper error handling
    - Add proper grants for the function
    - Add index on raw_user_meta_data for better performance
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS check_is_admin();

-- Create improved check_is_admin function
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Get admin status from user metadata
  SELECT (raw_user_meta_data->>'is_admin')::boolean
  INTO is_admin
  FROM auth.users
  WHERE id = auth.uid();

  -- Return false if no user found or not admin
  RETURN COALESCE(is_admin, false);
END;
$$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_admin_status ON auth.users USING gin (raw_user_meta_data);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_is_admin TO authenticated;