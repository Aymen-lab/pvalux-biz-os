
-- =========================================================================
-- Document counters (per company, per year, per document type)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.document_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('quote','invoice')),
  year int NOT NULL,
  next_number int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, document_type, year)
);

GRANT SELECT ON public.document_counters TO authenticated;
GRANT ALL ON public.document_counters TO service_role;

ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company read counters" ON public.document_counters;
CREATE POLICY "company read counters"
  ON public.document_counters FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());

-- =========================================================================
-- Atomic document number generator
-- =========================================================================
CREATE OR REPLACE FUNCTION public.generate_document_number(_company_id uuid, _document_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  _prefix text;
  _num int;
BEGIN
  IF _document_type = 'quote' THEN _prefix := 'DEV';
  ELSIF _document_type = 'invoice' THEN _prefix := 'FAC';
  ELSE RAISE EXCEPTION 'Invalid document_type: %', _document_type;
  END IF;

  -- Atomic upsert: insert new row with next_number=2 (reserving 1),
  -- otherwise atomically increment.
  INSERT INTO public.document_counters (company_id, document_type, year, next_number)
       VALUES (_company_id, _document_type, _year, 2)
  ON CONFLICT (company_id, document_type, year)
  DO UPDATE SET next_number = public.document_counters.next_number + 1,
                updated_at  = now()
  RETURNING next_number - 1 INTO _num;

  RETURN _prefix || '-' || _year::text || '-' || lpad(_num::text, 6, '0');
END
$$;

-- =========================================================================
-- Helper: ensure the caller belongs to a company
-- =========================================================================
CREATE OR REPLACE FUNCTION public.assert_company_member(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.companies   WHERE id = _company_id AND owner_id = _uid)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE company_id = _company_id AND user_id = _uid)
    OR public.current_company_id() = _company_id
  ) THEN
    RAISE EXCEPTION 'Access denied to company %', _company_id USING ERRCODE = '42501';
  END IF;
END
$$;

-- =========================================================================
-- Onboarding (company + owner role + profile.company_id) in one txn
-- =========================================================================
CREATE OR REPLACE FUNCTION public.create_company_onboarding(
  _name text,
  _phone text DEFAULT NULL,
  _address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _cid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF coalesce(btrim(_name), '') = '' THEN RAISE EXCEPTION 'Company name is required'; END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  INSERT INTO public.companies (name, phone, address, email, owner_id)
    VALUES (btrim(_name), _phone, _address, _email, _uid)
    RETURNING id INTO _cid;

  INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (_uid, _cid, 'owner');

  UPDATE public.profiles SET company_id = _cid WHERE id = _uid;

  RETURN _cid;
END
$$;

-- =========================================================================
-- Create quote + lines (atomic; server-side numbering, validation, totals)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.create_quote_with_lines(
  _company_id   uuid,
  _customer_id  uuid,
  _project_name text,
  _discount     numeric,
  _transport    numeric,
  _installation numeric,
  _tax_rate     numeric,
  _notes        text,
  _conditions   text,
  _lines        jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid       uuid := auth.uid();
  _qid       uuid;
  _qnum      text;
  _line      jsonb;
  _subtotal  numeric := 0;
  _line_tot  numeric;
  _base      numeric;
  _qty       numeric; _up numeric; _w numeric; _h numeric;
  _u         text;
  _tax       numeric;
  _total     numeric;
  _pos       int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.assert_company_member(_company_id);

  IF _customer_id IS NULL THEN RAISE EXCEPTION 'Customer is required'; END IF;
  IF _lines IS NULL OR jsonb_typeof(_lines) <> 'array' OR jsonb_array_length(_lines) = 0 THEN
    RAISE EXCEPTION 'At least one quote line is required';
  END IF;

  -- Verify customer belongs to same company
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = _customer_id AND company_id = _company_id) THEN
    RAISE EXCEPTION 'Customer does not belong to this company';
  END IF;

  -- Validate + compute subtotal
  FOR _line IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    _qty := coalesce((_line->>'quantity')::numeric, 0);
    _up  := coalesce((_line->>'unit_price')::numeric, 0);
    _w   := coalesce((_line->>'width')::numeric, 0);
    _h   := coalesce((_line->>'height')::numeric, 0);
    _u   := coalesce(_line->>'unit', 'piece');

    IF _qty <= 0 THEN RAISE EXCEPTION 'Quantity must be > 0'; END IF;
    IF _up  <  0 THEN RAISE EXCEPTION 'Unit price must be >= 0'; END IF;

    IF _u = 'm2' THEN _base := _w * _h;
    ELSIF _u = 'ml' THEN _base := _w;
    ELSE _base := 1;
    END IF;

    _line_tot := _base * _qty * _up;
    _subtotal := _subtotal + _line_tot;
  END LOOP;

  _discount     := coalesce(_discount, 0);
  _transport    := coalesce(_transport, 0);
  _installation := coalesce(_installation, 0);
  _tax_rate     := coalesce(_tax_rate, 0);

  IF _discount < 0 OR _transport < 0 OR _installation < 0 OR _tax_rate < 0 THEN
    RAISE EXCEPTION 'Charges and tax rate must be >= 0';
  END IF;
  IF _discount > _subtotal + _transport + _installation THEN
    RAISE EXCEPTION 'Discount exceeds quote total';
  END IF;

  _base  := _subtotal - _discount + _transport + _installation;
  _tax   := round(_base * _tax_rate / 100, 3);
  _total := _base + _tax;

  _qnum := public.generate_document_number(_company_id, 'quote');

  INSERT INTO public.quotes (
    company_id, customer_id, quote_number, project_name, subtotal,
    discount, transport, installation, tax_rate, tax_amount, total,
    notes, conditions, created_by
  ) VALUES (
    _company_id, _customer_id, _qnum, _project_name, _subtotal,
    _discount, _transport, _installation, _tax_rate, _tax, _total,
    _notes, _conditions, _uid
  ) RETURNING id INTO _qid;

  FOR _line IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    _qty := (_line->>'quantity')::numeric;
    _up  := (_line->>'unit_price')::numeric;
    _w   := coalesce((_line->>'width')::numeric, 0);
    _h   := coalesce((_line->>'height')::numeric, 0);
    _u   := coalesce(_line->>'unit', 'piece');

    IF _u = 'm2' THEN _base := _w * _h;
    ELSIF _u = 'ml' THEN _base := _w;
    ELSE _base := 1;
    END IF;
    _line_tot := _base * _qty * _up;

    INSERT INTO public.quote_lines (
      quote_id, category, product_type, description,
      width, height, quantity, unit, unit_price, total, position
    ) VALUES (
      _qid,
      _line->>'category',
      (coalesce(_line->>'product_type', 'autre'))::public.product_type,
      _line->>'description',
      _w, _h, _qty,
      (_u)::public.pricing_unit,
      _up, _line_tot, _pos
    );
    _pos := _pos + 1;
  END LOOP;

  RETURN jsonb_build_object('id', _qid, 'quote_number', _qnum);
END
$$;

-- =========================================================================
-- Convert quote -> invoice (atomic, server-side numbering)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(
  _quote_id uuid,
  _due_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _q    record;
  _iid  uuid;
  _inum text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _q FROM public.quotes WHERE id = _quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;

  PERFORM public.assert_company_member(_q.company_id);

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
$$;

-- =========================================================================
-- Payments: create / update / delete with validation
-- Invoice paid/balance/status are maintained by the existing
-- recalc_invoice() trigger on public.payments.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.create_payment(
  _invoice_id uuid,
  _amount     numeric,
  _paid_at    date,
  _method     text,
  _notes      text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv      record;
  _new_paid numeric;
  _pid      uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;
  IF _paid_at IS NULL THEN RAISE EXCEPTION 'Payment date is required'; END IF;

  SELECT * INTO _inv FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  PERFORM public.assert_company_member(_inv.company_id);

  _new_paid := _inv.paid + _amount;
  IF _new_paid > _inv.total + 0.0001 THEN
    RAISE EXCEPTION 'Payment exceeds invoice total (remaining: %)', _inv.total - _inv.paid;
  END IF;

  INSERT INTO public.payments (invoice_id, amount, paid_at, method, notes)
    VALUES (_invoice_id, _amount, _paid_at, _method, _notes)
    RETURNING id INTO _pid;

  RETURN _pid;
END
$$;

CREATE OR REPLACE FUNCTION public.update_payment(
  _payment_id uuid,
  _amount     numeric,
  _paid_at    date,
  _method     text,
  _notes      text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p       record;
  _inv     record;
  _ceiling numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;
  IF _paid_at IS NULL THEN RAISE EXCEPTION 'Payment date is required'; END IF;

  SELECT * INTO _p FROM public.payments WHERE id = _payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;

  SELECT * INTO _inv FROM public.invoices WHERE id = _p.invoice_id FOR UPDATE;
  PERFORM public.assert_company_member(_inv.company_id);

  _ceiling := _inv.total - (_inv.paid - _p.amount);
  IF _amount > _ceiling + 0.0001 THEN
    RAISE EXCEPTION 'Payment exceeds remaining balance (max: %)', _ceiling;
  END IF;

  UPDATE public.payments
     SET amount = _amount, paid_at = _paid_at, method = _method, notes = _notes
   WHERE id = _payment_id;
END
$$;

CREATE OR REPLACE FUNCTION public.delete_payment(_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p   record;
  _inv record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _p FROM public.payments WHERE id = _payment_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO _inv FROM public.invoices WHERE id = _p.invoice_id FOR UPDATE;
  PERFORM public.assert_company_member(_inv.company_id);

  DELETE FROM public.payments WHERE id = _payment_id;
END
$$;
