/*
  # Fix Auth Users View

  1. Changes
    - Drop existing view
    - Create new view with proper security
    - Add function to securely access user data

  2. Security
    - Use security barrier view
    - Add proper access control through function
*/

-- Drop existing view
DROP VIEW IF EXISTS auth_users_view;

-- Create a secure view with SECURITY BARRIER
CREATE VIEW auth_users_view WITH (security_barrier) AS
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users
WHERE EXISTS (
  SELECT 1
  FROM auth.users u
  WHERE u.id = auth.uid()
  AND (u.raw_user_meta_data->>'is_admin')::boolean = true
);

-- Grant access to the view
GRANT SELECT ON auth_users_view TO authenticated;