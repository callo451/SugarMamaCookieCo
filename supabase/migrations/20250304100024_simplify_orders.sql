-- Drop the foreign key constraint if it exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_user;

-- Drop the view if it exists
DROP VIEW IF EXISTS auth_users_view;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable public read access" ON orders;

-- Add customer_email column to orders if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add price_at_time to order_items if it doesn't exist
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS price_at_time DECIMAL(10,2);

-- Update RLS policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies for orders
CREATE POLICY "Enable all access for authenticated users" ON orders
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable public read access" ON orders
    FOR SELECT
    TO public
    USING (true);

-- Policies for products
CREATE POLICY "Enable all access for authenticated users" ON products
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable public read access" ON products
    FOR SELECT
    TO public
    USING (true);

-- Policies for order_items
CREATE POLICY "Enable all access for authenticated users" ON order_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable public read access" ON order_items
    FOR SELECT
    TO public
    USING (true); 