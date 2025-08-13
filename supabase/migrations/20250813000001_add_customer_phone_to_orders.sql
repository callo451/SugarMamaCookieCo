-- Add optional customer_phone column to orders table
-- Safe to run multiple times using IF NOT EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE public.orders
      ADD COLUMN customer_phone text NULL;
  END IF;
END $$;

-- Optional: comment for documentation
COMMENT ON COLUMN public.orders.customer_phone IS 'Optional customer phone number for the order';
