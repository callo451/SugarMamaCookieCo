/*
  # Add CRM Tables

  1. New Tables
    - `customers`
      - Extended customer information
      - Contact details
      - Preferences
      - Notes
    - `customer_interactions`
      - Track all customer interactions
      - Support for different interaction types
    - `customer_tags`
      - Organize customers with tags

  2. Security
    - Enable RLS on all new tables
    - Add policies for admin access
*/

-- Create customers table
CREATE TABLE customers (
  id uuid PRIMARY KEY REFERENCES auth.users,
  first_name text,
  last_name text,
  email text UNIQUE NOT NULL,
  phone text,
  address jsonb,
  preferences jsonb DEFAULT '{}',
  notes text,
  total_orders integer DEFAULT 0,
  lifetime_value decimal(10,2) DEFAULT 0,
  last_order_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customer interactions table
CREATE TABLE customer_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers ON DELETE CASCADE,
  type text NOT NULL, -- 'order', 'support', 'feedback', etc.
  details jsonb NOT NULL,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now()
);

-- Create customer tags table
CREATE TABLE customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  color text,
  created_at timestamptz DEFAULT now()
);

-- Create customer_tags_junction table
CREATE TABLE customer_tags_junction (
  customer_id uuid REFERENCES customers ON DELETE CASCADE,
  tag_id uuid REFERENCES customer_tags ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (customer_id, tag_id)
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tags_junction ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin full access to customers"
  ON customers
  TO admin
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin full access to customer_interactions"
  ON customer_interactions
  TO admin
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin full access to customer_tags"
  ON customer_tags
  TO admin
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin full access to customer_tags_junction"
  ON customer_tags_junction
  TO admin
  USING (true)
  WITH CHECK (true);

-- Create function to update customer stats
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET total_orders = (
    SELECT COUNT(*)
    FROM orders
    WHERE user_id = NEW.user_id
    AND status = 'completed'
  ),
  lifetime_value = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM orders
    WHERE user_id = NEW.user_id
    AND status = 'completed'
  ),
  last_order_date = NEW.created_at
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating customer stats
CREATE TRIGGER update_customer_stats_on_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_customer_stats();

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_customer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
CREATE TRIGGER update_customer_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_updated_at();