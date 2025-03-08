/*
  # Initial Schema Setup
  
  1. Core Tables:
    - products: Cookie products catalog
    - customers: Customer information
    - orders: Order tracking
    - order_items: Individual items in each order
*/

-- Create products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    first_name TEXT,
    last_name TEXT,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    address JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    status TEXT NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_address JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'))
);

-- Create order_items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Products: Everyone can view, only authenticated can create/update
CREATE POLICY "Products are viewable by everyone" ON products
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create products" ON products
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update products" ON products
    FOR UPDATE TO authenticated USING (true);

-- Customers: Users can view/edit their own data
CREATE POLICY "Users can view own customer data" ON customers
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own customer data" ON customers
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own customer data" ON customers
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Orders: Users can view/manage their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (customer_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create own orders" ON orders
    FOR INSERT WITH CHECK (customer_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (customer_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
    ));

-- Order Items: Users can view/manage their own order items
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (order_id IN (
        SELECT o.id FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE c.user_id = auth.uid()
    ));

CREATE POLICY "Users can create order items" ON order_items
    FOR INSERT WITH CHECK (order_id IN (
        SELECT o.id FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE c.user_id = auth.uid()
    ));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at(); 