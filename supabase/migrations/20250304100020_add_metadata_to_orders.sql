-- Add metadata column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb; 