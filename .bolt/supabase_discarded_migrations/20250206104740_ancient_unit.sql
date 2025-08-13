/*
  # Fix Auth Users View

  1. Changes
    - Drop and recreate auth_users_view without SECURITY DEFINER
    - Add proper RLS policies
    - Fix view permissions

  2. Security
    - Enable RLS on view
    - Add policies for authenticated users
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS auth_users_view;

-- Recreate the view without SECURITY DEFINER
CREATE OR REPLACE VIEW auth_users_view AS
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users;

-- Enable RLS on the view
ALTER VIEW auth_users_view ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all users
CREATE POLICY "Allow admins to view all users" ON auth_users_view
  FOR SELECT
  TO authenticated
  USING (check_is_admin());

-- Grant access to the view
GRANT SELECT ON auth_users_view TO authenticated;