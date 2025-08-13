/*
  # Direct User Creation Attempt
  
  1. Purpose:
    - Attempt to directly create a user with admin privileges
    - Bypass normal user creation flow to diagnose issues
    - WARNING: This is for diagnostic purposes only and should be used with caution
*/

-- First, run the diagnostics to understand the current state
DO $$
DECLARE
  user_exists BOOLEAN;
  user_id UUID;
  error_message TEXT;
BEGIN
  RAISE NOTICE '=== DIRECT USER CREATION ATTEMPT ===';
  
  -- Check if the user already exists
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE email = 'faith.colwellbeaver@gmail.com'
    ) INTO user_exists;
  EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;
    RAISE NOTICE 'Error checking if user exists: %', error_message;
    user_exists := FALSE;
  END;
  
  IF user_exists THEN
    RAISE NOTICE 'User already exists, updating admin status...';
    
    -- Update admin status
    BEGIN
      UPDATE auth.users
      SET raw_user_meta_data = 
        CASE 
          WHEN raw_user_meta_data IS NULL THEN 
            jsonb_build_object('is_admin', 'true')
          ELSE 
            raw_user_meta_data || jsonb_build_object('is_admin', 'true')
        END
      WHERE email = 'faith.colwellbeaver@gmail.com'
      RETURNING id INTO user_id;
      
      RAISE NOTICE 'Admin status updated successfully for user ID: %', user_id;
    EXCEPTION WHEN OTHERS THEN
      error_message := SQLERRM;
      RAISE NOTICE 'Error updating admin status: %', error_message;
    END;
  ELSE
    RAISE NOTICE 'User does not exist. Attempting alternative approaches...';
    
    -- IMPORTANT NOTE: The following approaches are for diagnostic purposes only
    -- They may not work in all Supabase setups and should be used with caution
    
    -- Approach 1: Try to use auth.create_user function if it exists
    BEGIN
      RAISE NOTICE 'Attempting to use auth.create_user function...';
      
      -- Check if the function exists
      IF EXISTS (
        SELECT 1 FROM pg_proc 
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE nspname = 'auth' AND proname = 'create_user'
      ) THEN
        -- Try to determine the correct parameters for the function
        BEGIN
          -- First attempt with standard parameters
          PERFORM auth.create_user(
            'faith.colwellbeaver@gmail.com',
            'temporary_password_change_immediately',
            '{"is_admin": "true"}'::jsonb
          );
          RAISE NOTICE 'User creation attempt using auth.create_user completed.';
        EXCEPTION WHEN OTHERS THEN
          error_message := SQLERRM;
          RAISE NOTICE 'Error with first parameter set: %', error_message;
          
          -- Second attempt with different parameters
          BEGIN
            PERFORM auth.create_user(
              email := 'faith.colwellbeaver@gmail.com',
              password := 'temporary_password_change_immediately',
              metadata := '{"is_admin": "true"}'::jsonb
            );
            RAISE NOTICE 'User creation attempt using named parameters completed.';
          EXCEPTION WHEN OTHERS THEN
            error_message := SQLERRM;
            RAISE NOTICE 'Error with named parameters: %', error_message;
          END;
        END;
      ELSE
        RAISE NOTICE 'auth.create_user function not found.';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      error_message := SQLERRM;
      RAISE NOTICE 'Error using auth.create_user: %', error_message;
    END;
    
    -- Approach 2: Try direct insertion (this may not work due to triggers/constraints)
    BEGIN
      RAISE NOTICE 'Attempting direct insertion into auth.users...';
      
      -- This is unlikely to work due to password hashing and other constraints
      -- But it's included for diagnostic purposes
      INSERT INTO auth.users (
        email,
        raw_user_meta_data,
        created_at,
        updated_at
      ) VALUES (
        'faith.colwellbeaver@gmail.com',
        jsonb_build_object('is_admin', 'true'),
        NOW(),
        NOW()
      )
      RETURNING id INTO user_id;
      
      RAISE NOTICE 'Direct insertion completed. User ID: %', user_id;
    EXCEPTION WHEN OTHERS THEN
      error_message := SQLERRM;
      RAISE NOTICE 'Error with direct insertion: %', error_message;
      
      -- Try with more fields
      BEGIN
        RAISE NOTICE 'Attempting insertion with more fields...';
        
        INSERT INTO auth.users (
          email,
          raw_user_meta_data,
          created_at,
          updated_at,
          email_confirmed_at,
          is_sso_user,
          banned_until,
          reauthentication_token,
          is_anonymous
        ) VALUES (
          'faith.colwellbeaver@gmail.com',
          jsonb_build_object('is_admin', 'true'),
          NOW(),
          NOW(),
          NOW(),
          FALSE,
          NULL,
          NULL,
          FALSE
        )
        RETURNING id INTO user_id;
        
        RAISE NOTICE 'Insertion with more fields completed. User ID: %', user_id;
      EXCEPTION WHEN OTHERS THEN
        error_message := SQLERRM;
        RAISE NOTICE 'Error with expanded insertion: %', error_message;
      END;
    END;
  END IF;
  
  -- Final check to see if the user exists now
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE email = 'faith.colwellbeaver@gmail.com'
    ) INTO user_exists;
    
    IF user_exists THEN
      RAISE NOTICE 'SUCCESS: User faith.colwellbeaver@gmail.com now exists in the database.';
      
      -- Get the user ID
      SELECT id INTO user_id FROM auth.users WHERE email = 'faith.colwellbeaver@gmail.com';
      RAISE NOTICE 'User ID: %', user_id;
      
      -- Check admin status
      IF EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email = 'faith.colwellbeaver@gmail.com' 
        AND raw_user_meta_data->>'is_admin' = 'true'
      ) THEN
        RAISE NOTICE 'User has admin privileges.';
      ELSE
        RAISE NOTICE 'User does NOT have admin privileges.';
      END IF;
    ELSE
      RAISE NOTICE 'FAILURE: User faith.colwellbeaver@gmail.com still does not exist in the database.';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;
    RAISE NOTICE 'Error in final check: %', error_message;
  END;
  
  RAISE NOTICE 'Direct user creation attempt completed.';
  RAISE NOTICE 'IMPORTANT: If these approaches failed, you should:';
  RAISE NOTICE '1. Check the Supabase logs for detailed error messages';
  RAISE NOTICE '2. Try creating the user through the Supabase dashboard';
  RAISE NOTICE '3. Contact Supabase support if the issue persists';
  RAISE NOTICE '=== END OF DIRECT USER CREATION ATTEMPT ===';
END $$; 