import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPayment, deletePayment, updatePayment } from "./api";
import type { PaymentParsed } from "./schemas";

function invalidate(qc: ReturnType<typeof useQueryClient>, invoiceId: string) {
  qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
  qc.invalidateQueries({ queryKey: ["invoices"] });
  qc.invalidateQueries({ queryKey: ["payments", invoiceId] });
}

export function useCreatePayment(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: PaymentParsed) => createPayment(invoiceId, p),
    onSuccess: () => invalidate(qc, invoiceId),
  });
}
export function useUpdatePayment(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, p }: { id: string; p: PaymentParsed }) => updatePayment(id, p),
    onSuccess: () => invalidate(qc, invoiceId),
  });
}
export function useDeletePayment(invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePayment(id),
    onSuccess: () => invalidate(qc, invoiceId),
  });
}
