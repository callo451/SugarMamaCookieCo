-- Fix RLS policies: remove overly permissive policies and add proper access control
-- This migration replaces the dangerous USING(true) policies with proper checks

-- Helper function to check if current user is admin
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
-- ORDERS TABLE
-- ============================================================
-- Drop existing overly-permissive policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable public read access" ON orders;

-- Admins can do everything
CREATE POLICY "Admin full access on orders" ON orders
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Anonymous users can insert orders (for QuoteBuilder public submissions)
CREATE POLICY "Public can submit orders" ON orders
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- ============================================================
-- ORDER_ITEMS TABLE
-- ============================================================
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON order_items;
DROP POLICY IF EXISTS "Enable public read access" ON order_items;

-- Admins can do everything
CREATE POLICY "Admin full access on order_items" ON order_items
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Anonymous users can insert order items (for QuoteBuilder)
CREATE POLICY "Public can submit order items" ON order_items
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON customers;
DROP POLICY IF EXISTS "Enable public read access" ON customers;

-- Admin only access
CREATE POLICY "Admin full access on customers" ON customers
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================
-- PRICING_SETTINGS TABLE
-- ============================================================
-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS pricing_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON pricing_settings;
DROP POLICY IF EXISTS "Enable public read access" ON pricing_settings;

-- Public can read pricing (for QuoteBuilder)
CREATE POLICY "Public can read pricing" ON pricing_settings
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Only admins can modify pricing
CREATE POLICY "Admin can modify pricing" ON pricing_settings
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable public read access" ON products;

-- Public can read products
CREATE POLICY "Public can read products" ON products
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Only admins can modify products
CREATE POLICY "Admin can modify products" ON products
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================
-- EMAIL_TEMPLATES TABLE
-- ============================================================
ALTER TABLE IF EXISTS email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON email_templates;
DROP POLICY IF EXISTS "Enable public read access" ON email_templates;

-- Only admins can access email templates
CREATE POLICY "Admin full access on email_templates" ON email_templates
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================
-- AUTH_USERS_VIEW
-- ============================================================
-- Ensure the view is only accessible to admins via RLS on underlying function
-- The view itself queries auth.users which is already protected
