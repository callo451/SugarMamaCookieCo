-- ============================================================
-- Fix Supabase Linter Warnings
-- ============================================================
-- 1. Drop remaining old permissive RLS policies (different names)
-- 2. Pin search_path on all public functions
-- 3. Drop broken trigger_admin_order_reminders function
-- ============================================================

-- ============================================================
-- 1. DROP OLD PERMISSIVE POLICIES
-- ============================================================

-- orders: old policies with different names
DROP POLICY IF EXISTS "Enable insert access for all users" ON orders;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable select for all users" ON orders;

-- order_items: old policies
DROP POLICY IF EXISTS "Users can update order items" ON order_items;
DROP POLICY IF EXISTS "Users can create order items" ON order_items;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;

-- email_templates: old permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to insert email templates" ON email_templates;
DROP POLICY IF EXISTS "Allow authenticated users to update email templates" ON email_templates;
DROP POLICY IF EXISTS "Allow authenticated users to select email templates" ON email_templates;
DROP POLICY IF EXISTS "Allow authenticated users to delete email templates" ON email_templates;

-- ============================================================
-- 2. FIX FUNCTION SEARCH PATHS
-- ============================================================

-- is_admin(): recreate with pinned search_path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT coalesce(
    (SELECT (raw_user_meta_data->>'is_admin')::boolean
     FROM auth.users
     WHERE id = auth.uid()),
    false
  );
$$;

-- update_updated_at(): recreate with pinned search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- update_updated_at_column(): recreate with pinned search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- handle_new_contact_submission(): recreate with pinned search_path
CREATE OR REPLACE FUNCTION public.handle_new_contact_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result json;
BEGIN
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/handle-contact-form',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', current_setting('app.edge_function_auth')
    )
  ) INTO result;

  RETURN new;
END;
$$;

-- set_display_order_id(): pin search_path via ALTER (body created in dashboard)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'set_display_order_id'
  ) THEN
    ALTER FUNCTION public.set_display_order_id() SET search_path = 'public';
  END IF;
END $$;

-- ============================================================
-- 3. DROP BROKEN trigger_admin_order_reminders FUNCTION
-- ============================================================
-- This function was never properly configured:
--   - Contains <YOUR_PROJECT_REF> placeholder URL
--   - References http_response type that doesn't exist
--   - References last_admin_reminder_sent_at column that doesn't exist
--   - Nothing in the app calls it
-- The admin reminder edge function (send-admin-reminder) is also orphaned.

-- Drop any cron job that might reference it
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE command LIKE '%trigger_admin_order_reminders%';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not available or no matching jobs, skip
  NULL;
END $$;

DROP FUNCTION IF EXISTS public.trigger_admin_order_reminders();
