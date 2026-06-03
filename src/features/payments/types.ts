export interface PaymentRecord {
  id: string;
  amount: number;
  paid_at: string;
  method: string | null;
  notes: string | null;
}

export const PAYMENT_METHODS = [
  "Espèces", "Chèque", "Virement bancaire", "Traite", "Carte bancaire", "Autre",
] as const;
