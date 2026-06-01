ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS due_date date;

UPDATE public.invoices
  SET due_date = (created_at::date + INTERVAL '30 days')
  WHERE due_date IS NULL;