/*
  # Fix Auth Functions
  
  1. Purpose:
    - Correct the function signatures to match Supabase's auth system
    - Provide proper admin status management
    - Remove attempts to directly create users via SQL
*/

-- Drop our previous attempt at user creation
DROP FUNCTION IF EXISTS public.create_admin_user CASCADE;

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

-- Remove admin status from demo user
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN 
      '{}'::jsonb
    ELSE 
      raw_user_meta_data - 'is_admin'
  END
WHERE email = 'demo@demo.com';

-- Provide updated instructions
DO $$
BEGIN
  RAISE NOTICE '=== UPDATED INSTRUCTIONS ===';
  RAISE NOTICE 'To set up the admin user, follow these steps:';
  RAISE NOTICE '1. Go to the Supabase dashboard';
  RAISE NOTICE '2. Navigate to Authentication > Users';
  RAISE NOTICE '3. Click "Add User"';
  RAISE NOTICE '4. Create user with email: faith.colwellbeaver@gmail.com';
  RAISE NOTICE '5. After the user is created, run this command to grant admin privileges:';
  RAISE NOTICE 'SELECT public.set_admin_status(''faith.colwellbeaver@gmail.com'');';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: User creation must be done through the Supabase dashboard or API';
  RAISE NOTICE 'because it requires proper password hashing and auth setup.';
  RAISE NOTICE '=== END INSTRUCTIONS ===';
END $$; 