-- Enable Row Level Security on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Create a function to get the current user's tenant IDs
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies for each table
-- Tenants policy
CREATE POLICY tenant_isolation_policy ON tenants
  USING (id IN (SELECT get_user_tenant_ids()));

-- Tenant users policy
CREATE POLICY tenant_users_isolation_policy ON tenant_users
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Tenant invitations policy
CREATE POLICY tenant_invitations_isolation_policy ON tenant_invitations
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Customers policy
CREATE POLICY customers_isolation_policy ON customers
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Products policy
CREATE POLICY products_isolation_policy ON products
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Sales orders policy
CREATE POLICY sales_orders_isolation_policy ON sales_orders
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Invoices policy
CREATE POLICY invoices_isolation_policy ON invoices
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Sales returns policy
CREATE POLICY sales_returns_isolation_policy ON sales_returns
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Purchase orders policy
CREATE POLICY purchase_orders_isolation_policy ON purchase_orders
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Suppliers policy
CREATE POLICY suppliers_isolation_policy ON suppliers
  USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Inventory transactions policy
CREATE POLICY inventory_transactions_isolation_policy ON inventory_transactions
  USING (tenant_id IN (SELECT get_user_tenant_ids()));