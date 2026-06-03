import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchInvoice, updateInvoice } from "./api";
import type { InvoiceEditValues } from "./types";

export const useInvoice = (id: string) =>
  useQuery({ queryKey: ["invoice", id], queryFn: () => fetchInvoice(id), enabled: !!id });

export function useUpdateInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: InvoiceEditValues) => updateInvoice(id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
