import { supabase } from "@/integrations/supabase/client";
import type { QuoteFormValues } from "./types";

export async function fetchQuote(id: string, companyId: string) {
  const [{ data: q, error: qErr }, { data: lines, error: lErr }, { data: company }, { data: invoiceLink }] = await Promise.all([
    supabase.from("quotes").select("*, customers(*)").eq("id", id).single(),
    supabase.from("quote_lines").select("*").eq("quote_id", id).order("position"),
    supabase.from("companies").select("*").eq("id", companyId).single(),
    supabase.from("invoices").select("id").eq("quote_id", id).limit(1),
  ]);
  if (qErr) throw qErr;
  if (lErr) throw lErr;
  return { q, lines: lines ?? [], company, hasInvoice: (invoiceLink ?? []).length > 0 };
}

export async function listCustomers(companyId: string) {
  const { data, error } = await supabase
    .from("customers").select("id,name").eq("company_id", companyId).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createQuoteWithLines(companyId: string, v: QuoteFormValues) {
  const { data, error } = await supabase.rpc("create_quote_with_lines", {
    _company_id: companyId,
    _customer_id: v.customer_id,
    _project_name: v.project_name,
    _discount: v.discount,
    _transport: v.transport,
    _installation: v.installation,
    _tax_rate: v.tax_rate,
    _notes: v.notes,
    _conditions: v.conditions,
    _lines: v.lines as any,
  });
  if (error) throw error;
  return data as { id: string; quote_number: string };
}

export async function updateQuoteWithLines(quoteId: string, v: QuoteFormValues) {
  const { data, error } = await supabase.rpc("update_quote_with_lines", {
    _quote_id: quoteId,
    _customer_id: v.customer_id,
    _project_name: v.project_name,
    _discount: v.discount,
    _transport: v.transport,
    _installation: v.installation,
    _tax_rate: v.tax_rate,
    _notes: v.notes,
    _conditions: v.conditions,
    _lines: v.lines as any,
  });
  if (error) throw error;
  return data as { id: string; quote_number: string; financial_locked: boolean };
}

export async function updateQuoteStatus(id: string, status: string) {
  const { error } = await supabase.from("quotes").update({ status: status as any }).eq("id", id);
  if (error) throw error;
}
