/*
  # Simplify Admin Management
  
  1. Purpose:
    - Remove complex user creation code
    - Keep only admin status management
    - Clean up old functions
*/

-- Drop old functions we don't need anymore
DROP FUNCTION IF EXISTS public.create_user CASCADE;
DROP FUNCTION IF EXISTS public.create_admin_user CASCADE;

-- Keep only the admin check function
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

-- Keep a simple function to set admin status
CREATE OR REPLACE FUNCTION public.set_admin_status(user_email text, is_admin boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN is_admin THEN
        CASE 
          WHEN raw_user_meta_data IS NULL THEN 
            jsonb_build_object('is_admin', true)
          ELSE 
            raw_user_meta_data || jsonb_build_object('is_admin', true)
        END
      ELSE
        CASE 
          WHEN raw_user_meta_data IS NULL THEN 
            '{}'::jsonb
          ELSE 
            raw_user_meta_data - 'is_admin'
        END
    END
  WHERE email = user_email;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_status TO authenticated;

-- Remove admin status from demo user
SELECT public.set_admin_status('demo@demo.com', false);

-- Instructions for setting up new admin
DO $$
BEGIN
  RAISE NOTICE '=== SIMPLIFIED ADMIN SETUP ===';
  RAISE NOTICE '1. Create the user through Supabase dashboard';
  RAISE NOTICE '2. After creating user, run this command:';
  RAISE NOTICE E'SELECT public.set_admin_status(''faith.colwellbeaver@gmail.com'', true);';
  RAISE NOTICE '=== END INSTRUCTIONS ===';
END $$; 