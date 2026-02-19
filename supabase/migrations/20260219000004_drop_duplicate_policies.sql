-- ============================================================
-- Drop duplicate permissive policies causing performance warnings
-- ============================================================

-- email_templates: old policy duplicating admin access
DROP POLICY IF EXISTS "Allow authenticated users to read email templates" ON email_templates;

-- order_items: old policy duplicating admin access
DROP POLICY IF EXISTS "Users can view order items" ON order_items;

-- pricing_settings: "Admin can modify pricing" (FOR ALL) already covers
-- authenticated SELECT, so the dual SELECT from "Public can read pricing"
-- for authenticated is redundant. However "Public can read pricing" also
-- serves anon, so we need to split it into anon-only SELECT + keep admin ALL.
DROP POLICY IF EXISTS "Public can read pricing" ON pricing_settings;

CREATE POLICY "Anon can read pricing" ON pricing_settings
    FOR SELECT TO anon
    USING (true);
