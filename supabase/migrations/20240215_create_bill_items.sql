-- Drop the table if it exists (to ensure a clean state)
DROP TABLE IF EXISTS public.bill_items;

-- Create bill_items table
CREATE TABLE public.bill_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    gst_rate DECIMAL(5,2) DEFAULT 0,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bill_items_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_bill_items_updated_at ON public.bill_items;

CREATE TRIGGER update_bill_items_updated_at
    BEFORE UPDATE ON public.bill_items
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_items_updated_at_column();

-- Enable RLS
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.bill_items;

CREATE POLICY "Enable all access for authenticated users" ON public.bill_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
