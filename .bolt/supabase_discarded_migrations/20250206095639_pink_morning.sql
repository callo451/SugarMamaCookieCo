/*
  # Add admin check functionality

  1. New Functions
    - `check_is_admin()`: Checks if the current user is an admin

  2. Changes
    - Grant execute permission to authenticated users
    - Update specified user to be an admin
*/

-- Create function to check if user is admin
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

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_is_admin TO authenticated;

-- Update your user to be an admin (replace with your email)
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN 
      jsonb_build_object('is_admin', 'true')
    ELSE 
      raw_user_meta_data || jsonb_build_object('is_admin', 'true')
  END
WHERE email = 'deancallaghan8@bigpond.com';  -- Replace with your email