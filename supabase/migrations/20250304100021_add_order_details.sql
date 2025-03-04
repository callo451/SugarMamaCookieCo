-- Add order_details column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS order_details JSONB DEFAULT '{}'::jsonb; 