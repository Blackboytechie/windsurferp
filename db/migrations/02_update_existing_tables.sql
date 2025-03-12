-- Add tenant_id to customers table
ALTER TABLE customers ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Add tenant_id to products table
ALTER TABLE products ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Add tenant_id to sales_orders table
ALTER TABLE sales_orders ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Add tenant_id to invoices table
ALTER TABLE invoices ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Add tenant_id to sales_returns table
ALTER TABLE sales_returns ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Add tenant_id to purchase_orders table
ALTER TABLE purchase_orders ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Add tenant_id to suppliers table
ALTER TABLE suppliers ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Add tenant_id to inventory_transactions table
ALTER TABLE inventory_transactions ADD COLUMN tenant_id UUID REFERENCES tenants(id);