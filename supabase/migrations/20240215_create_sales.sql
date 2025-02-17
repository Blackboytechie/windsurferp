-- Drop tables if they exist (in correct order)
DROP TABLE IF EXISTS public.sale_payments CASCADE;
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.sales_orders CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.sales_order_items CASCADE;
DROP TABLE IF EXISTS public.sales_orders CASCADE;

-- Create sales table
CREATE TABLE public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(255) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid', 'partial', 'cancelled')),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create sale_items table
CREATE TABLE public.sale_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    gst_rate DECIMAL(5,2) DEFAULT 0,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create sale_payments table
CREATE TABLE public.sale_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'upi', 'other')),
    reference_number VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create sales_orders table
CREATE TABLE public.sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivery_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    shipping_address TEXT,
    billing_address TEXT,
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sales_order_items table
CREATE TABLE public.sales_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    discount_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create invoices table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    invoice_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending',
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    paid_amount NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_sales_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for each table
DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
DROP TRIGGER IF EXISTS update_sale_items_updated_at ON public.sale_items;
DROP TRIGGER IF EXISTS update_sale_payments_updated_at ON public.sale_payments;

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_updated_at_column();

CREATE TRIGGER update_sale_items_updated_at
    BEFORE UPDATE ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_updated_at_column();

CREATE TRIGGER update_sale_payments_updated_at
    BEFORE UPDATE ON public.sale_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_updated_at_column();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sales_orders_updated_at
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_order_items_updated_at
    BEFORE UPDATE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update sale payment status
CREATE OR REPLACE FUNCTION update_sale_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(10,2);
    sale_total DECIMAL(10,2);
BEGIN
    -- Calculate total paid amount for the sale
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM sale_payments
    WHERE sale_id = NEW.sale_id;

    -- Get sale total amount
    SELECT total_amount INTO sale_total
    FROM sales
    WHERE id = NEW.sale_id;

    -- Update sale paid_amount and status
    UPDATE sales
    SET 
        paid_amount = total_paid,
        status = CASE 
            WHEN total_paid >= sale_total THEN 'paid'
            WHEN total_paid > 0 THEN 'partial'
            ELSE status
        END
    WHERE id = NEW.sale_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment updates
DROP TRIGGER IF EXISTS update_sale_payment_status_trigger ON public.sale_payments;

CREATE TRIGGER update_sale_payment_status_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.sale_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_sale_payment_status();

-- Create function to update stock on sale confirmation
CREATE OR REPLACE FUNCTION update_stock_on_sale_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' AND OLD.status = 'draft' THEN
        -- Create stock movements and update stock levels for each item
        INSERT INTO stock_movements (
            product_id,
            type,
            quantity,
            reference_type,
            reference_id,
            notes
        )
        SELECT 
            product_id,
            'out',
            quantity,
            'sale',
            NEW.id,
            'Sale: ' || NEW.invoice_number
        FROM sale_items
        WHERE sale_id = NEW.id;

        -- Update product stock levels
        UPDATE products p
        SET stock_level = p.stock_level - si.quantity
        FROM sale_items si
        WHERE si.sale_id = NEW.id AND si.product_id = p.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sale confirmation
DROP TRIGGER IF EXISTS update_stock_on_sale_confirmation_trigger ON public.sales;

CREATE TRIGGER update_stock_on_sale_confirmation_trigger
    AFTER UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_sale_confirmation();

-- Create function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    sequence_number INT;
BEGIN
    -- Get the current year as prefix
    year_prefix := to_char(CURRENT_DATE, 'YY');
    
    -- Get the next sequence number for this year
    WITH RECURSIVE sequence_numbers AS (
        SELECT 1 as seq_num
        UNION ALL
        SELECT seq_num + 1
        FROM sequence_numbers
        WHERE seq_num < 99999
    ),
    used_numbers AS (
        SELECT SUBSTRING(order_number FROM 6)::INT as used_num
        FROM sales_orders
        WHERE order_number LIKE 'SO' || year_prefix || '-%'
    )
    SELECT MIN(s.seq_num) INTO sequence_number
    FROM sequence_numbers s
    WHERE s.seq_num NOT IN (SELECT used_num FROM used_numbers)
    LIMIT 1;

    -- Format the order number
    NEW.order_number := 'SO' || year_prefix || '-' || LPAD(sequence_number::TEXT, 5, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order number generation
CREATE TRIGGER generate_sales_order_number
    BEFORE INSERT ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- Create function to update order totals
CREATE OR REPLACE FUNCTION update_sales_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the order totals
    WITH order_totals AS (
        SELECT 
            order_id,
            SUM(total_amount) as total,
            SUM(tax_amount) as tax,
            SUM(discount_amount) as discount,
            SUM(total_amount - tax_amount + discount_amount) as subtotal
        FROM sales_order_items
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        GROUP BY order_id
    )
    UPDATE sales_orders
    SET 
        subtotal = COALESCE(order_totals.subtotal, 0),
        tax_amount = COALESCE(order_totals.tax, 0),
        discount_amount = COALESCE(order_totals.discount, 0),
        total_amount = COALESCE(order_totals.total, 0)
    FROM order_totals
    WHERE sales_orders.id = order_totals.order_id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating order totals
CREATE TRIGGER update_sales_order_totals_on_item_insert
    AFTER INSERT ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_order_totals();

CREATE TRIGGER update_sales_order_totals_on_item_update
    AFTER UPDATE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_order_totals();

CREATE TRIGGER update_sales_order_totals_on_item_delete
    AFTER DELETE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_order_totals();

-- Enable RLS for all tables
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable all access for authenticated users" ON public.sales
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users" ON public.sale_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users" ON public.sale_payments
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create policies for sales_orders
CREATE POLICY "Enable read access for authenticated users" ON sales_orders
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON sales_orders
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON sales_orders
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON sales_orders
    FOR DELETE
    TO authenticated
    USING (true);

-- Create policies for sales_order_items
CREATE POLICY "Enable read access for authenticated users" ON sales_order_items
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON sales_order_items
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON sales_order_items
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON sales_order_items
    FOR DELETE
    TO authenticated
    USING (true);

-- Create policies for invoices
CREATE POLICY "Enable read access for authenticated users" ON invoices
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON invoices
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON invoices
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON invoices
    FOR DELETE
    TO authenticated
    USING (true);

-- Create indexes
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_dates ON sales_orders(order_date, delivery_date);
CREATE INDEX idx_sales_order_items_order ON sales_order_items(order_id);
CREATE INDEX idx_sales_order_items_product ON sales_order_items(product_id);
CREATE INDEX idx_invoices_order ON invoices(order_id);
