/*
  # Add admin check function and initial admin user

  1. New Functions
    - `check_is_admin`: Function to check if a user is an admin
    - `set_admin_status`: Function to set admin status for a user
  
  2. Security
    - Grant admin role to specific user
    - Set up admin check functionality
*/

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.check_is_admin()
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

-- Create function to set admin status for a user
CREATE OR REPLACE FUNCTION public.set_admin_status(user_id uuid)
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
        jsonb_build_object('is_admin', 'true')
      ELSE 
        raw_user_meta_data || jsonb_build_object('is_admin', 'true')
    END
  WHERE id = user_id;
  
  RETURN true;
END;
$$;

-- Grant execute permission on the functions
GRANT EXECUTE ON FUNCTION public.check_is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_status(uuid) TO authenticated;

-- Update demo user to be an admin
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN 
      jsonb_build_object('is_admin', 'true')
    ELSE 
      raw_user_meta_data || jsonb_build_object('is_admin', 'true')
  END
WHERE email = 'demo@demo.com';