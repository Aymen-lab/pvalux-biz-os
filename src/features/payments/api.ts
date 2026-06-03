import { supabase } from "@/integrations/supabase/client";
import type { PaymentParsed } from "./schemas";

export async function createPayment(invoiceId: string, p: PaymentParsed) {
  const { error } = await supabase.rpc("create_payment", {
    _invoice_id: invoiceId, _amount: p.amount, _paid_at: p.paid_at, _method: p.method, _notes: p.notes,
  });
  if (error) throw error;
}

export async function updatePayment(paymentId: string, p: PaymentParsed) {
  const { error } = await supabase.rpc("update_payment", {
    _payment_id: paymentId, _amount: p.amount, _paid_at: p.paid_at, _method: p.method, _notes: p.notes,
  });
  if (error) throw error;
}

export async function deletePayment(paymentId: string) {
  const { error } = await supabase.rpc("delete_payment", { _payment_id: paymentId });
  if (error) throw error;
}
