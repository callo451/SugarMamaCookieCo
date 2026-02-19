-- ============================================================
-- Comprehensive RLS Audit & Hardening
-- ============================================================
-- This migration ensures every public table has RLS enabled
-- and proper policies. It is fully idempotent (safe to re-run).
--
-- Access model:
--   anon           → can INSERT orders (QuoteBuilder), SELECT pricing_settings
--   authenticated  → admin-only via is_admin() helper for all management ops
--   service_role   → full access (edge functions for emails, etc.)
-- ============================================================

-- 1. Ensure is_admin() helper exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT coalesce(
    (SELECT (raw_user_meta_data->>'is_admin')::boolean
     FROM auth.users
     WHERE id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- ORDERS
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Clean up legacy permissive policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable public read access" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON orders;

-- Drop our own policies first (idempotent re-run)
DROP POLICY IF EXISTS "Admin full access on orders" ON orders;
DROP POLICY IF EXISTS "Public can submit orders" ON orders;

-- Admins: full CRUD
CREATE POLICY "Admin full access on orders" ON orders
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Anonymous: can submit quotes/orders via QuoteBuilder
CREATE POLICY "Public can submit orders" ON orders
    FOR INSERT TO anon
    WITH CHECK (true);

-- ============================================================
-- ORDER_ITEMS
-- ============================================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON order_items;
DROP POLICY IF EXISTS "Enable public read access" ON order_items;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can create order items" ON order_items;

DROP POLICY IF EXISTS "Admin full access on order_items" ON order_items;
DROP POLICY IF EXISTS "Public can submit order items" ON order_items;

-- Admins: full CRUD
CREATE POLICY "Admin full access on order_items" ON order_items
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Anonymous: can insert order items (QuoteBuilder / checkout)
CREATE POLICY "Public can submit order items" ON order_items
    FOR INSERT TO anon
    WITH CHECK (true);

-- ============================================================
-- PRICING_SETTINGS
-- ============================================================
ALTER TABLE IF EXISTS pricing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON pricing_settings;
DROP POLICY IF EXISTS "Enable public read access" ON pricing_settings;
DROP POLICY IF EXISTS "Public can read pricing" ON pricing_settings;
DROP POLICY IF EXISTS "Admin can modify pricing" ON pricing_settings;

-- Anyone can read pricing (QuoteBuilder needs this)
CREATE POLICY "Public can read pricing" ON pricing_settings
    FOR SELECT TO anon, authenticated
    USING (true);

-- Admins: full management
CREATE POLICY "Admin can modify pricing" ON pricing_settings
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================
-- EMAIL_TEMPLATES
-- ============================================================
ALTER TABLE IF EXISTS email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON email_templates;
DROP POLICY IF EXISTS "Enable public read access" ON email_templates;
DROP POLICY IF EXISTS "Admin full access on email_templates" ON email_templates;

-- Admin only
CREATE POLICY "Admin full access on email_templates" ON email_templates
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================
-- CUSTOMERS
-- ============================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable public read access" ON customers;
DROP POLICY IF EXISTS "Users can view own customer data" ON customers;
DROP POLICY IF EXISTS "Users can update own customer data" ON customers;
DROP POLICY IF EXISTS "Users can insert own customer data" ON customers;
DROP POLICY IF EXISTS "Admin full access on customers" ON customers;

-- Admin only
CREATE POLICY "Admin full access on customers" ON customers
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================
-- PRODUCTS (table exists but feature removed — lock it down)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;

    -- Drop all legacy policies
    EXECUTE 'DROP POLICY IF EXISTS "Enable all access for authenticated users" ON products';
    EXECUTE 'DROP POLICY IF EXISTS "Enable public read access" ON products';
    EXECUTE 'DROP POLICY IF EXISTS "Products are viewable by everyone" ON products';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can create products" ON products';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can update products" ON products';
    EXECUTE 'DROP POLICY IF EXISTS "Public can read products" ON products';
    EXECUTE 'DROP POLICY IF EXISTS "Admin can modify products" ON products';
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access on products" ON products';

    -- Admin only (table unused but locked down)
    EXECUTE 'CREATE POLICY "Admin full access on products" ON products
        FOR ALL TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin())';
  END IF;
END $$;

-- ============================================================
-- CONTACT_SUBMISSIONS
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_submissions') THEN
    ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

    -- Drop legacy
    EXECUTE 'DROP POLICY IF EXISTS "Allow anonymous contact submissions" ON contact_submissions';
    EXECUTE 'DROP POLICY IF EXISTS "Allow service role to manage submissions" ON contact_submissions';
    EXECUTE 'DROP POLICY IF EXISTS "Admin read contact submissions" ON contact_submissions';

    -- Anonymous: can submit contact forms
    EXECUTE 'CREATE POLICY "Allow anonymous contact submissions" ON contact_submissions
        FOR INSERT TO anon
        WITH CHECK (true)';

    -- Service role: edge functions process submissions (send emails, mark processed)
    EXECUTE 'CREATE POLICY "Allow service role to manage submissions" ON contact_submissions
        FOR ALL TO service_role
        USING (true)
        WITH CHECK (true)';

    -- Admins: can view submissions
    EXECUTE 'CREATE POLICY "Admin read contact submissions" ON contact_submissions
        FOR SELECT TO authenticated
        USING (public.is_admin())';
  END IF;
END $$;

-- ============================================================
-- STORAGE: Gallery bucket (public read for cookie photos)
-- ============================================================
-- Only add the policy if it doesn't already exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public gallery read'
  ) THEN
    CREATE POLICY "Public gallery read" ON storage.objects
        FOR SELECT TO anon, authenticated
        USING (bucket_id = 'Gallery');
  END IF;
END $$;

-- ============================================================
-- Verification: list all tables with RLS status
-- ============================================================
-- Run this query manually to verify:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
