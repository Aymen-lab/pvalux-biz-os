
REVOKE EXECUTE ON FUNCTION public.generate_document_number(uuid, text)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assert_company_member(uuid)                 FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_company_onboarding(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_quote_with_lines(uuid, uuid, text, numeric, numeric, numeric, numeric, text, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.convert_quote_to_invoice(uuid, date)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_payment(uuid, numeric, date, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_payment(uuid, numeric, date, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_payment(uuid)                        FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.generate_document_number(uuid, text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_company_member(uuid)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_company_onboarding(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_quote_with_lines(uuid, uuid, text, numeric, numeric, numeric, numeric, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_invoice(uuid, date)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment(uuid, numeric, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_payment(uuid, numeric, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_payment(uuid)                        TO authenticated;
