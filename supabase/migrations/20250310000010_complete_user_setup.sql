/*
  # Complete User Setup
  
  1. Purpose:
    - Work with existing create_user function
    - Handle user_role enum
    - Ensure proper profile creation
*/

-- First ensure the user_role type exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
  END IF;
END $$;

-- Create a function to safely create admin user
CREATE OR REPLACE FUNCTION public.create_admin_user(
  email text,
  password text
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Call the existing create_user function with admin flag
  SELECT create_user(
    email := email,
    password := password,
    is_admin := true
  ) INTO new_user_id;
  
  RETURN new_user_id;
END;
$$;

-- Remove admin status from demo user
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'is_admin'
WHERE email = 'demo@demo.com';

-- Update profile for demo user if needed
UPDATE profiles
SET role = 'user'
WHERE id = (SELECT id FROM auth.users WHERE email = 'demo@demo.com');

-- Create new admin user
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create the admin user
  SELECT public.create_admin_user(
    'faith.colwellbeaver@gmail.com',
    'temporary_password_change_immediately'
  ) INTO new_user_id;
  
  IF new_user_id IS NOT NULL THEN
    RAISE NOTICE 'Successfully created admin user with ID: %', new_user_id;
    
    -- Verify the profile was created
    IF EXISTS (SELECT 1 FROM profiles WHERE id = new_user_id AND role = 'admin') THEN
      RAISE NOTICE 'Admin profile created successfully';
    ELSE
      RAISE NOTICE 'Warning: Profile might not have been created properly';
    END IF;
    
    -- Verify admin metadata
    IF EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = new_user_id 
      AND raw_user_meta_data->>'is_admin' = 'true'
    ) THEN
      RAISE NOTICE 'Admin metadata set successfully';
    ELSE
      RAISE NOTICE 'Warning: Admin metadata might not be set properly';
    END IF;
  ELSE
    RAISE NOTICE 'Failed to create admin user';
  END IF;
END $$;

-- Provide verification instructions
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICATION STEPS ===';
  RAISE NOTICE '1. Check if user exists:';
  RAISE NOTICE E'SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = ''faith.colwellbeaver@gmail.com'';';
  RAISE NOTICE '2. Check if profile exists:';
  RAISE NOTICE E'SELECT * FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email = ''faith.colwellbeaver@gmail.com'');';
  RAISE NOTICE '3. Try logging in with:';
  RAISE NOTICE 'Email: faith.colwellbeaver@gmail.com';
  RAISE NOTICE 'Password: temporary_password_change_immediately';
  RAISE NOTICE '=== END VERIFICATION STEPS ===';
END $$; 