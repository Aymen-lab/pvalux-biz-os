
-- 1) Add notes column to invoices (safe non-financial field)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes text;

-- 2) update_quote_with_lines: safely edit a quote
CREATE OR REPLACE FUNCTION public.update_quote_with_lines(
  _quote_id uuid,
  _customer_id uuid,
  _project_name text,
  _discount numeric,
  _transport numeric,
  _installation numeric,
  _tax_rate numeric,
  _notes text,
  _conditions text,
  _lines jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid       uuid := auth.uid();
  _q         record;
  _has_inv   boolean;
  _financial_changed boolean;
  _line      jsonb;
  _subtotal  numeric := 0;
  _line_tot  numeric;
  _base      numeric;
  _qty numeric; _up numeric; _w numeric; _h numeric;
  _u text;
  _tax numeric;
  _total numeric;
  _pos int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;
  PERFORM public.assert_company_member(_q.company_id);

  IF _customer_id IS NULL THEN RAISE EXCEPTION 'Customer is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = _customer_id AND company_id = _q.company_id) THEN
    RAISE EXCEPTION 'Customer does not belong to this company';
  END IF;
  IF _lines IS NULL OR jsonb_typeof(_lines) <> 'array' OR jsonb_array_length(_lines) = 0 THEN
    RAISE EXCEPTION 'At least one quote line is required';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.invoices WHERE quote_id = _quote_id) INTO _has_inv;

  -- compute totals
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
    ELSE _base := 1; END IF;
    _subtotal := _subtotal + (_base * _qty * _up);
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
  IF _total < 0 THEN RAISE EXCEPTION 'Total cannot be negative'; END IF;

  -- Detect whether financial fields would change vs current quote
  _financial_changed := (
    _q.customer_id IS DISTINCT FROM _customer_id
    OR _q.subtotal IS DISTINCT FROM _subtotal
    OR _q.discount IS DISTINCT FROM _discount
    OR _q.transport IS DISTINCT FROM _transport
    OR _q.installation IS DISTINCT FROM _installation
    OR _q.tax_rate IS DISTINCT FROM _tax_rate
    OR _q.total IS DISTINCT FROM _total
  );

  IF _has_inv AND _financial_changed THEN
    RAISE EXCEPTION 'Quote already invoiced: financial fields cannot be changed';
  END IF;

  -- Replace lines only if financial edit is allowed
  IF NOT _has_inv THEN
    DELETE FROM public.quote_lines WHERE quote_id = _quote_id;
    FOR _line IN SELECT * FROM jsonb_array_elements(_lines) LOOP
      _qty := (_line->>'quantity')::numeric;
      _up  := (_line->>'unit_price')::numeric;
      _w   := coalesce((_line->>'width')::numeric, 0);
      _h   := coalesce((_line->>'height')::numeric, 0);
      _u   := coalesce(_line->>'unit', 'piece');
      IF _u = 'm2' THEN _base := _w * _h;
      ELSIF _u = 'ml' THEN _base := _w;
      ELSE _base := 1; END IF;
      _line_tot := _base * _qty * _up;
      INSERT INTO public.quote_lines (
        quote_id, category, product_type, description,
        width, height, quantity, unit, unit_price, total, position
      ) VALUES (
        _quote_id,
        _line->>'category',
        (coalesce(_line->>'product_type','autre'))::public.product_type,
        _line->>'description',
        _w, _h, _qty, (_u)::public.pricing_unit, _up, _line_tot, _pos
      );
      _pos := _pos + 1;
    END LOOP;

    UPDATE public.quotes SET
      customer_id = _customer_id,
      project_name = _project_name,
      subtotal = _subtotal,
      discount = _discount,
      transport = _transport,
      installation = _installation,
      tax_rate = _tax_rate,
      tax_amount = _tax,
      total = _total,
      notes = _notes,
      conditions = _conditions,
      updated_at = now()
    WHERE id = _quote_id;
  ELSE
    -- Non-financial fields only
    UPDATE public.quotes SET
      project_name = _project_name,
      notes = _notes,
      conditions = _conditions,
      updated_at = now()
    WHERE id = _quote_id;
  END IF;

  RETURN jsonb_build_object('id', _quote_id, 'quote_number', _q.quote_number, 'financial_locked', _has_inv);
END $$;

REVOKE ALL ON FUNCTION public.update_quote_with_lines(uuid, uuid, text, numeric, numeric, numeric, numeric, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_quote_with_lines(uuid, uuid, text, numeric, numeric, numeric, numeric, text, text, jsonb) TO authenticated;

-- 3) update_invoice: edit safe non-financial fields (due_date, notes)
CREATE OR REPLACE FUNCTION public.update_invoice(
  _invoice_id uuid,
  _due_date date,
  _notes text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _inv record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _inv FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  PERFORM public.assert_company_member(_inv.company_id);

  -- All current statuses (unpaid/partial/paid/overdue) allow due_date + notes edits.
  -- Cancelled status is not modeled yet; if added later, block here.

  UPDATE public.invoices
     SET due_date = _due_date,
         notes = _notes,
         updated_at = now(),
         status = CASE
           WHEN paid >= total THEN 'paid'::public.invoice_status
           WHEN paid > 0 THEN 'partial'::public.invoice_status
           WHEN _due_date IS NOT NULL AND _due_date < current_date THEN 'overdue'::public.invoice_status
           ELSE 'unpaid'::public.invoice_status
         END
   WHERE id = _invoice_id;

  RETURN jsonb_build_object('id', _invoice_id, 'invoice_number', _inv.invoice_number);
END $$;

REVOKE ALL ON FUNCTION public.update_invoice(uuid, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_invoice(uuid, date, text) TO authenticated;
