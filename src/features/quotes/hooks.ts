import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createQuoteWithLines, fetchQuote, listCustomers, updateQuoteStatus, updateQuoteWithLines } from "./api";
import type { QuoteFormValues } from "./types";

export const useCustomers = (companyId?: string | null) =>
  useQuery({
    queryKey: ["customers", companyId],
    enabled: !!companyId,
    queryFn: () => listCustomers(companyId!),
  });

export const useQuote = (id: string, companyId?: string | null) =>
  useQuery({
    queryKey: ["quote", id],
    enabled: !!companyId && !!id,
    queryFn: () => fetchQuote(id, companyId!),
  });

export function useCreateQuote(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: QuoteFormValues) => createQuoteWithLines(companyId, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}

export function useUpdateQuote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: QuoteFormValues) => updateQuoteWithLines(id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote", id] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

export function useUpdateQuoteStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: string) => updateQuoteStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote", id] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}
