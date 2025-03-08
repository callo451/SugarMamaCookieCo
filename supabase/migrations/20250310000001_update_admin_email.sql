/*
  # Update Admin User Email
  
  1. Changes:
    - Updates the admin status for the new admin email
*/

-- First, check if the new admin user exists and set admin status if they do
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN 
      jsonb_build_object('is_admin', 'true')
    ELSE 
      raw_user_meta_data || jsonb_build_object('is_admin', 'true')
  END
WHERE email = 'faith.colwellbeaver@gmail.com';

-- Remove admin status from old admin user if needed
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN 
      '{}'::jsonb
    ELSE 
      raw_user_meta_data - 'is_admin'
  END
WHERE email = 'demo@demo.com';

-- Add a comment explaining the issue
-- Note: This migration assumes the user 'faith.colwellbeaver@gmail.com' already exists.
-- If the user doesn't exist yet, you need to create it first through the Supabase Auth API
-- or the Supabase dashboard before running this migration. 