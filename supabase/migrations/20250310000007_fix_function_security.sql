/*
  # Fix Function Security Context
  
  1. Purpose:
    - Update function security context to allow proper execution
    - Add SECURITY DEFINER to functions
    - Set proper search path for security
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS auth.create_user CASCADE;
DROP FUNCTION IF EXISTS public.check_is_admin CASCADE;
DROP FUNCTION IF EXISTS public.set_admin_status CASCADE;

-- Recreate check_is_admin function with proper security context
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

-- Recreate set_admin_status function with proper security context
CREATE OR REPLACE FUNCTION public.set_admin_status(user_email text)
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
  WHERE email = user_email;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_status TO authenticated;

-- Create a secure function to handle user creation
CREATE OR REPLACE FUNCTION public.create_admin_user(
  user_email text,
  user_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- First try to create the user
  BEGIN
    -- Call auth.create_user with proper security context
    SELECT auth.create_user(
      user_email,
      user_password,
      '{"is_admin": true}'::jsonb
    ) INTO result;
    
    RETURN json_build_object(
      'success', true,
      'message', 'User created successfully',
      'data', result
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM,
      'error', SQLSTATE
    );
  END;
END;
$$;

-- Grant execute permission on the new function
GRANT EXECUTE ON FUNCTION public.create_admin_user TO authenticated;

-- Provide instructions for using the new function
DO $$
BEGIN
  RAISE NOTICE '=== UPDATED INSTRUCTIONS ===';
  RAISE NOTICE 'To create the admin user, you can now use the following function:';
  RAISE NOTICE 'SELECT public.create_admin_user(''faith.colwellbeaver@gmail.com'', ''your_password_here'');';
  RAISE NOTICE 'Or to set admin status for an existing user:';
  RAISE NOTICE 'SELECT public.set_admin_status(''faith.colwellbeaver@gmail.com'');';
  RAISE NOTICE '=== END INSTRUCTIONS ===';
END $$; 