export type QuoteStatus = "draft" | "sent" | "follow_up" | "accepted" | "rejected";

export interface QuoteLineInput {
  category: string;
  product_type: string;
  description: string;
  width: number;
  height: number;
  quantity: number;
  unit: string;
  unit_price: number;
}

export interface QuoteFormValues {
  customer_id: string;
  project_name: string;
  notes: string;
  conditions: string;
  discount: number;
  transport: number;
  installation: number;
  tax_rate: number;
  lines: QuoteLineInput[];
}

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  follow_up: "Relance",
  accepted: "Accepté",
  rejected: "Refusé",
};
