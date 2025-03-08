/*
  # Admin User Solution Based on Reddit Thread
  
  1. Purpose:
    - Implement the solution from Reddit for admin user creation
    - Update admin status for existing users
    - Provide clear instructions for manual steps
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

-- Check if the target user exists
DO $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'faith.colwellbeaver@gmail.com'
  ) INTO user_exists;
  
  IF user_exists THEN
    -- Update admin status for existing user
    UPDATE auth.users
    SET raw_user_meta_data = 
      CASE 
        WHEN raw_user_meta_data IS NULL THEN 
          jsonb_build_object('is_admin', 'true')
        ELSE 
          raw_user_meta_data || jsonb_build_object('is_admin', 'true')
      END
    WHERE email = 'faith.colwellbeaver@gmail.com';
    
    RAISE NOTICE 'User already exists. Admin status updated.';
  ELSE
    -- Provide instructions for manual steps
    RAISE NOTICE '=== MANUAL STEPS REQUIRED ===';
    RAISE NOTICE 'The user does not exist yet. Based on the Reddit thread, you need to:';
    RAISE NOTICE '1. Go to the Supabase dashboard';
    RAISE NOTICE '2. Navigate to Authentication > Settings';
    RAISE NOTICE '3. Temporarily disable "Enable email confirmations" if it''s enabled';
    RAISE NOTICE '4. Then go to Authentication > Users and click "Add User"';
    RAISE NOTICE '5. Create the user with email: faith.colwellbeaver@gmail.com';
    RAISE NOTICE '6. After creating the user, run this SQL to grant admin privileges:';
    RAISE NOTICE 'UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(''is_admin'', ''true'') WHERE email = ''faith.colwellbeaver@gmail.com'';';
    RAISE NOTICE '7. Re-enable email confirmations if you disabled them';
    RAISE NOTICE '=== END OF MANUAL STEPS ===';
  END IF;
END $$; 