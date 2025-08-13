-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Enable all access for authenticated users" ON orders
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable public read access" ON orders
    FOR SELECT
    TO public
    USING (true);

-- Create policies for customers
CREATE POLICY "Enable all access for authenticated users" ON customers
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable public read access" ON customers
    FOR SELECT
    TO public
    USING (true);

-- Create policies for order_items
CREATE POLICY "Enable all access for authenticated users" ON order_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable public read access" ON order_items
    FOR SELECT
    TO public
    USING (true); 