-- Drop the table if it exists (to ensure a clean state)
DROP TABLE IF EXISTS public.payments;

-- Create payments table
CREATE TABLE public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'upi', 'other')),
    reference_number VARCHAR(255),
    reference_id UUID,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Add type column to payments table
ALTER TABLE public.payments
ADD COLUMN type VARCHAR(20) NOT NULL CHECK (type IN ('invoice', 'payment', 'refund'));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at_column();

-- Create function to update bill paid amount and status
CREATE OR REPLACE FUNCTION update_bill_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid DECIMAL(10,2);
    bill_total DECIMAL(10,2);
BEGIN
    -- Calculate total paid amount for the bill
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments
    WHERE bill_id = NEW.bill_id;

    -- Get bill total amount
    SELECT total_amount INTO bill_total
    FROM bills
    WHERE id = NEW.bill_id;

    -- Update bill paid_amount and status
    UPDATE bills
    SET 
        paid_amount = total_paid,
        status = CASE 
            WHEN total_paid >= bill_total THEN 'paid'
            WHEN total_paid > 0 THEN 'partial'
            ELSE 'pending'
        END
    WHERE id = NEW.bill_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment insert/update/delete
DROP TRIGGER IF EXISTS update_bill_payment_status_trigger ON public.payments;

CREATE TRIGGER update_bill_payment_status_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_payment_status();

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.payments;

CREATE POLICY "Enable all access for authenticated users" ON public.payments
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
