-- ============================================================
-- Purge ALL existing policies and recreate from scratch
-- ============================================================
-- Previous migrations tried to drop policies by name, but
-- dashboard-created policies had unknown names. This migration
-- drops every policy on each table, then recreates only what's needed.
-- ============================================================

-- Helper: drop all policies on a given table
CREATE OR REPLACE FUNCTION _temp_drop_all_policies(p_schema text, p_table text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = p_schema AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, p_schema, p_table);
  END LOOP;
END;
$$;

-- ============================================================
-- ORDERS: purge and recreate
-- ============================================================
SELECT _temp_drop_all_policies('public', 'orders');

CREATE POLICY "Admin full access on orders" ON orders
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Public can submit orders" ON orders
    FOR INSERT TO anon
    WITH CHECK (status = 'pending');

-- ============================================================
-- ORDER_ITEMS: purge and recreate
-- ============================================================
SELECT _temp_drop_all_policies('public', 'order_items');

CREATE POLICY "Admin full access on order_items" ON order_items
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================
-- PRICING_SETTINGS: purge and recreate
-- ============================================================
SELECT _temp_drop_all_policies('public', 'pricing_settings');

CREATE POLICY "Anon can read pricing" ON pricing_settings
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Admin can modify pricing" ON pricing_settings
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================
-- EMAIL_TEMPLATES: purge and recreate
-- ============================================================
SELECT _temp_drop_all_policies('public', 'email_templates');

CREATE POLICY "Admin full access on email_templates" ON email_templates
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================
-- CUSTOMERS: purge and recreate
-- ============================================================
SELECT _temp_drop_all_policies('public', 'customers');

CREATE POLICY "Admin full access on customers" ON customers
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================
-- CONTACT_SUBMISSIONS: purge and recreate
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_submissions') THEN
    PERFORM _temp_drop_all_policies('public', 'contact_submissions');

    EXECUTE 'CREATE POLICY "Allow anonymous contact submissions" ON contact_submissions
        FOR INSERT TO anon WITH CHECK (true)';

    EXECUTE 'CREATE POLICY "Allow service role to manage submissions" ON contact_submissions
        FOR ALL TO service_role USING (true) WITH CHECK (true)';

    EXECUTE 'CREATE POLICY "Admin read contact submissions" ON contact_submissions
        FOR SELECT TO authenticated USING (public.is_admin())';
  END IF;
END $$;

-- ============================================================
-- PRODUCTS: purge and recreate
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    PERFORM _temp_drop_all_policies('public', 'products');

    EXECUTE 'CREATE POLICY "Admin full access on products" ON products
        FOR ALL TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin())';
  END IF;
END $$;

-- Clean up temp function
DROP FUNCTION _temp_drop_all_policies(text, text);
