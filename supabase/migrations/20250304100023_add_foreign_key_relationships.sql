-- Drop view if it exists
DROP VIEW IF EXISTS auth_users_view;

-- Create the view
CREATE VIEW auth_users_view AS
SELECT id, email, created_at
FROM auth.users;

-- Add foreign key relationship to the actual users table
ALTER TABLE orders
ADD CONSTRAINT fk_orders_user
FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Grant necessary permissions
GRANT SELECT ON auth_users_view TO authenticated;
GRANT SELECT ON auth_users_view TO anon; 