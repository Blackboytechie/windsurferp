-- First, drop the existing check constraint
ALTER TABLE public.bills
DROP CONSTRAINT IF EXISTS bills_status_check;

-- Then add the new check constraint with the correct status values
ALTER TABLE public.bills
ADD CONSTRAINT bills_status_check 
CHECK (status IN ('pending', 'partial', 'paid', 'cancelled'));
