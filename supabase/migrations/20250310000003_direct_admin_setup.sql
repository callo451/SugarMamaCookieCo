/*
  # Direct Admin User Setup
  
  1. Changes:
    - Provides a direct SQL approach to ensure the admin user exists and has admin privileges
    - Handles both the case where the user exists and where it doesn't
*/

-- First, ensure the demo user is no longer an admin
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN 
      '{}'::jsonb
    ELSE 
      raw_user_meta_data - 'is_admin'
  END
WHERE email = 'demo@demo.com';

-- Now, handle the new admin user
DO $$
DECLARE
  user_exists BOOLEAN;
  user_id UUID;
BEGIN
  -- Check if the user exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'faith.colwellbeaver@gmail.com'
  ) INTO user_exists;
  
  IF user_exists THEN
    -- User exists, update admin status
    UPDATE auth.users
    SET raw_user_meta_data = 
      CASE 
        WHEN raw_user_meta_data IS NULL THEN 
          jsonb_build_object('is_admin', 'true')
        ELSE 
          raw_user_meta_data || jsonb_build_object('is_admin', 'true')
      END
    WHERE email = 'faith.colwellbeaver@gmail.com';
    
    RAISE NOTICE 'Updated existing user to have admin privileges';
  ELSE
    -- User doesn't exist, we need to handle this differently
    -- Note: We can't directly create a user with password here as it requires hashing
    -- Instead, we'll provide instructions
    RAISE NOTICE 'The user does not exist. Please create the user through the Supabase dashboard or API first.';
    RAISE NOTICE 'After creating the user, run this SQL to grant admin privileges:';
    RAISE NOTICE 'UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(''is_admin'', ''true'') WHERE email = ''faith.colwellbeaver@gmail.com'';';
  END IF;
END $$; 