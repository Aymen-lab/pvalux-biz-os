import { supabase } from "@/integrations/supabase/client";
import type { InvoiceEditValues } from "./types";

export async function fetchInvoice(id: string) {
  const [{ data: inv, error }, { data: payments }, { data: followups }] = await Promise.all([
    supabase.from("invoices").select("*, customers(name, phone), quotes(quote_number)").eq("id", id).single(),
    supabase.from("payments").select("*").eq("invoice_id", id).order("paid_at", { ascending: false }),
    supabase.from("follow_ups").select("*").eq("invoice_id", id).order("created_at", { ascending: false }).limit(5),
  ]);
  if (error) throw error;
  return { inv, payments: payments ?? [], followups: followups ?? [] };
}

export async function updateInvoice(id: string, v: InvoiceEditValues) {
  const { data, error } = await supabase.rpc("update_invoice", {
    _invoice_id: id,
    _due_date: v.due_date as any,
    _notes: v.notes,
  });
  if (error) throw error;
  return data as { id: string; invoice_number: string };
}
