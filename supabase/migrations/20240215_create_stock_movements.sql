-- Drop the table if it exists
DROP TABLE IF EXISTS public.stock_movements;

-- Create stock_movements table
CREATE TABLE public.stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out')),
    quantity INTEGER NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stock_movements_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_stock_movements_updated_at ON public.stock_movements;

CREATE TRIGGER update_stock_movements_updated_at
    BEFORE UPDATE ON public.stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_movements_updated_at_column();

-- Create function to update product stock level
CREATE OR REPLACE FUNCTION update_stock_level(
    p_product_id UUID,
    p_quantity INTEGER,
    p_is_increment BOOLEAN
)
RETURNS void AS $$
BEGIN
    UPDATE products
    SET 
        stock_level = CASE 
            WHEN p_is_increment THEN stock_level + p_quantity
            ELSE stock_level - p_quantity
        END,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.stock_movements;

CREATE POLICY "Enable all access for authenticated users" ON public.stock_movements
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
