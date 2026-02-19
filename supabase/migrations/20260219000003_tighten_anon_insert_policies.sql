-- ============================================================
-- Tighten anonymous INSERT policies
-- ============================================================
-- 1. Remove anon INSERT on order_items (only admins insert items)
-- 2. Constrain anon INSERT on orders to status = 'pending' only
-- ============================================================

-- order_items: remove unnecessary anon INSERT
DROP POLICY IF EXISTS "Public can submit order items" ON order_items;

-- orders: replace blanket INSERT with constrained version
DROP POLICY IF EXISTS "Public can submit orders" ON orders;

CREATE POLICY "Public can submit orders" ON orders
    FOR INSERT TO anon
    WITH CHECK (status = 'pending');
