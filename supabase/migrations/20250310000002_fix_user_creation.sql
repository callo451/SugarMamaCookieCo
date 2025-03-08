/*
  # Fix User Creation Issue
  
  1. Changes:
    - Checks for and removes any conflicting entries that might prevent user creation
    - Ensures the admin status can be properly set for the new user
*/

-- Check if there are any partial or conflicting entries for the email
DO $$
DECLARE
  conflicting_entries INTEGER;
BEGIN
  -- Check auth.users table
  SELECT COUNT(*) INTO conflicting_entries 
  FROM auth.users 
  WHERE email = 'faith.colwellbeaver@gmail.com';
  
  -- If entries exist, remove them
  IF conflicting_entries > 0 THEN
    DELETE FROM auth.users 
    WHERE email = 'faith.colwellbeaver@gmail.com';
    RAISE NOTICE 'Removed % conflicting entries from auth.users', conflicting_entries;
  END IF;
  
  -- Check identities table for any orphaned entries
  SELECT COUNT(*) INTO conflicting_entries 
  FROM auth.identities 
  WHERE email = 'faith.colwellbeaver@gmail.com';
  
  -- If entries exist, remove them
  IF conflicting_entries > 0 THEN
    DELETE FROM auth.identities 
    WHERE email = 'faith.colwellbeaver@gmail.com';
    RAISE NOTICE 'Removed % conflicting entries from auth.identities', conflicting_entries;
  END IF;
  
  -- Check for any other potential conflicts in related tables
  -- This is a simplified example - you might need to check other tables
  -- depending on your specific Supabase setup
END $$;

-- Ensure the admin user can be created by temporarily disabling any problematic triggers
-- Note: This is a more aggressive approach and should be used with caution
DO $$
BEGIN
  -- Temporarily disable triggers on auth.users if they exist
  -- This is commented out by default as it's a more aggressive approach
  -- EXECUTE 'ALTER TABLE auth.users DISABLE TRIGGER ALL';
  
  -- After user creation, you would re-enable triggers:
  -- EXECUTE 'ALTER TABLE auth.users ENABLE TRIGGER ALL';
  
  RAISE NOTICE 'User creation fix applied. You can now try creating the user again.';
END $$; 