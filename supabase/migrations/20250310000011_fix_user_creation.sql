/*
  # Fix User Creation with UUID
  
  1. Purpose:
    - Fix the ID generation for auth.users
    - Ensure proper UUID handling
    - Maintain all required fields
*/

-- Recreate the create_user function with proper UUID handling
CREATE OR REPLACE FUNCTION public.create_user(
  email text,
  password text,
  is_admin boolean DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_user_id UUID;
  user_role user_role;
BEGIN
  -- Generate new UUID
  new_user_id := gen_random_uuid();
  
  -- Set role based on is_admin parameter
  IF is_admin THEN
    user_role := 'admin'::user_role;
  ELSE
    user_role := 'user'::user_role;
  END IF;

  -- Create user in auth.users with explicit ID
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    email_confirmed_at,
    encrypted_password,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud,
    role
  ) VALUES (
    new_user_id,                                    -- id
    '00000000-0000-0000-0000-000000000000',        -- instance_id (default)
    email,                                          -- email
    now(),                                          -- email_confirmed_at
    crypt(password, gen_salt('bf')),               -- encrypted_password
    jsonb_build_object('is_admin', is_admin),      -- raw_user_meta_data
    now(),                                          -- created_at
    now(),                                          -- updated_at
    'authenticated',                                -- aud
    'authenticated'                                 -- role
  );

  -- Create profile for the user
  INSERT INTO profiles (id, role)
  VALUES (new_user_id, user_role);

  RETURN new_user_id;
END;
$$;

-- Create a wrapper function for admin user creation
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