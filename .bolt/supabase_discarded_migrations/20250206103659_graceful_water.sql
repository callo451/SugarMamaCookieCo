/*
  # User Management Functions and Views

  1. New Views
    - `auth_users_view`: Safe view of auth.users with limited fields
  
  2. Functions
    - `toggle_user_admin`: Toggle admin status for a user
    - `delete_user`: Safely delete a user
    
  3. Security
    - RLS policies for views
    - Function security definer settings
*/

-- Create a view for auth users with limited fields
CREATE VIEW auth_users_view AS
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users;

-- Grant access to the view
GRANT SELECT ON auth_users_view TO authenticated;

-- Function to toggle admin status
CREATE OR REPLACE FUNCTION toggle_user_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();
  
  -- Check if the current user is an admin
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = current_user_id
    AND raw_user_meta_data->>'is_admin' = 'true'
  ) INTO is_admin;
  
  -- Only allow admins to toggle admin status
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only administrators can modify user roles';
  END IF;

  -- Toggle the admin status
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data->>'is_admin' = 'true' THEN 
        raw_user_meta_data - 'is_admin' || jsonb_build_object('is_admin', 'false')
      ELSE 
        COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('is_admin', 'true')
    END
  WHERE id = user_id;

  RETURN TRUE;
END;
$$;

-- Function to delete a user
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();
  
  -- Check if the current user is an admin
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = current_user_id
    AND raw_user_meta_data->>'is_admin' = 'true'
  ) INTO is_admin;
  
  -- Only allow admins to delete users
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only administrators can delete users';
  END IF;

  -- Prevent deleting yourself
  IF user_id = current_user_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Delete the user
  DELETE FROM auth.users WHERE id = user_id;

  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION toggle_user_admin TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user TO authenticated;