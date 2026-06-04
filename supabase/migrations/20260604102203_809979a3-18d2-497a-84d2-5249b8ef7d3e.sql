-- Prevent duplicate invoices from the same quote (one invoice per quote).
CREATE UNIQUE INDEX IF NOT EXISTS invoices_quote_id_unique
  ON public.invoices(quote_id) WHERE quote_id IS NOT NULL;

-- Update RPC: raise a friendly error if an invoice already exists for the quote.
CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(_quote_id uuid, _due_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _q          record;
  _iid        uuid;
  _inum       text;
  _existing   uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _q FROM public.quotes WHERE id = _quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Devis introuvable'; END IF;

  PERFORM public.assert_company_member(_q.company_id);

  -- Block duplicate invoice creation from same quote
  SELECT id INTO _existing FROM public.invoices WHERE quote_id = _quote_id LIMIT 1;
  IF _existing IS NOT NULL THEN
    RAISE EXCEPTION 'Une facture existe déjà pour ce devis' USING ERRCODE = 'unique_violation';
  END IF;

  _inum := public.generate_document_number(_q.company_id, 'invoice');

  INSERT INTO public.invoices (
    company_id, quote_id, customer_id, invoice_number,
    due_date, total, balance, paid, status
  ) VALUES (
    _q.company_id, _q.id, _q.customer_id, _inum,
    _due_date, _q.total, _q.total, 0, 'unpaid'
  ) RETURNING id INTO _iid;

  RETURN jsonb_build_object('id', _iid, 'invoice_number', _inum);
END
$function$;