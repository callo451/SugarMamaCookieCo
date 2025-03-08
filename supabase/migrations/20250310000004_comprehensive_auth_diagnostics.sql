/*
  # Comprehensive Auth Diagnostics
  
  1. Purpose:
    - Diagnose issues preventing user creation
    - Check for constraints, triggers, and permissions
    - Provide detailed information about the auth schema
*/

-- Output diagnostic information
DO $$
DECLARE
  trigger_record RECORD;
  constraint_record RECORD;
  policy_record RECORD;
  function_record RECORD;
  permission_record RECORD;
  setting_record RECORD;
BEGIN
  RAISE NOTICE '=== SUPABASE AUTH DIAGNOSTICS ===';
  
  -- Check for triggers on auth.users
  RAISE NOTICE 'Checking triggers on auth.users:';
  FOR trigger_record IN 
    SELECT trigger_name, event_manipulation, action_statement 
    FROM information_schema.triggers 
    WHERE event_object_table = 'users' 
    AND event_object_schema = 'auth'
  LOOP
    RAISE NOTICE 'Trigger: % | Event: % | Action: %', 
      trigger_record.trigger_name, 
      trigger_record.event_manipulation, 
      trigger_record.action_statement;
  END LOOP;
  
  -- Check for constraints on auth.users
  RAISE NOTICE 'Checking constraints on auth.users:';
  FOR constraint_record IN 
    SELECT tc.constraint_name, constraint_type, check_clause 
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.check_constraints cc 
      ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'users' 
    AND tc.table_schema = 'auth'
  LOOP
    RAISE NOTICE 'Constraint: % | Type: % | Check: %', 
      constraint_record.constraint_name, 
      constraint_record.constraint_type, 
      constraint_record.check_clause;
  END LOOP;
  
  -- Check for RLS policies on auth.users
  RAISE NOTICE 'Checking RLS policies on auth.users:';
  FOR policy_record IN 
    SELECT polname, polcmd, polpermissive, polroles::text, polqual::text 
    FROM pg_policy 
    WHERE polrelid = 'auth.users'::regclass
  LOOP
    RAISE NOTICE 'Policy: % | Command: % | Permissive: % | Roles: % | Qualifier: %', 
      policy_record.polname, 
      policy_record.polcmd, 
      policy_record.polpermissive, 
      policy_record.polroles, 
      policy_record.polqual;
  END LOOP;
  
  -- Check for functions that might affect user creation
  RAISE NOTICE 'Checking functions in auth schema:';
  FOR function_record IN 
    SELECT proname, prosrc 
    FROM pg_proc 
    JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
    WHERE nspname = 'auth' 
    AND prosrc ILIKE '%user%'
  LOOP
    RAISE NOTICE 'Function: % | Source contains user references', function_record.proname;
  END LOOP;
  
  -- Check for permissions
  RAISE NOTICE 'Checking permissions on auth.users:';
  FOR permission_record IN 
    SELECT grantee, privilege_type 
    FROM information_schema.role_table_grants 
    WHERE table_name = 'users' 
    AND table_schema = 'auth'
  LOOP
    RAISE NOTICE 'Grantee: % | Privilege: %', 
      permission_record.grantee, 
      permission_record.privilege_type;
  END LOOP;
  
  -- Check for relevant database settings
  RAISE NOTICE 'Checking relevant database settings:';
  FOR setting_record IN 
    SELECT name, setting, category 
    FROM pg_settings 
    WHERE name LIKE '%auth%' OR category = 'Authentication'
  LOOP
    RAISE NOTICE 'Setting: % | Value: % | Category: %', 
      setting_record.name, 
      setting_record.setting, 
      setting_record.category;
  END LOOP;
  
  -- Try to identify if the email domain is restricted
  RAISE NOTICE 'Checking for email domain restrictions:';
  BEGIN
    -- This is a simplified check - actual implementation might vary
    PERFORM 1 FROM pg_proc 
    JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
    WHERE nspname = 'auth' 
    AND prosrc ILIKE '%gmail.com%' 
    AND prosrc ILIKE '%restrict%';
    
    IF FOUND THEN
      RAISE NOTICE 'Potential email domain restriction found for gmail.com';
    ELSE
      RAISE NOTICE 'No obvious email domain restrictions found';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error checking email restrictions: %', SQLERRM;
  END;
  
  -- Provide a summary of auth.users table structure
  RAISE NOTICE 'Structure of auth.users table:';
  FOR constraint_record IN 
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'users' 
    AND table_schema = 'auth'
  LOOP
    RAISE NOTICE 'Column: % | Type: % | Nullable: % | Default: %', 
      constraint_record.column_name, 
      constraint_record.data_type, 
      constraint_record.is_nullable, 
      constraint_record.column_default;
  END LOOP;
  
  -- Check if the user already exists
  RAISE NOTICE 'Checking if the target user already exists:';
  BEGIN
    PERFORM 1 FROM auth.users WHERE email = 'faith.colwellbeaver@gmail.com';
    IF FOUND THEN
      RAISE NOTICE 'User faith.colwellbeaver@gmail.com already exists in the database';
    ELSE
      RAISE NOTICE 'User faith.colwellbeaver@gmail.com does NOT exist in the database';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error checking if user exists: %', SQLERRM;
  END;
  
  -- Check for any auth.users entries with similar emails
  RAISE NOTICE 'Checking for similar email addresses:';
  BEGIN
    FOR constraint_record IN 
      SELECT id, email, created_at
      FROM auth.users
      WHERE email ILIKE '%faith%' OR email ILIKE '%colwell%' OR email ILIKE '%beaver%'
    LOOP
      RAISE NOTICE 'Similar user found: % | % | Created: %', 
        constraint_record.id, 
        constraint_record.email, 
        constraint_record.created_at;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error checking for similar emails: %', SQLERRM;
  END;
  
  RAISE NOTICE '=== END OF DIAGNOSTICS ===';
END $$; 