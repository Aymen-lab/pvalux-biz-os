import { z } from "zod";

export const paymentSchema = z.object({
  amount: z.number().positive({ message: "Montant > 0" }).max(10_000_000),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date invalide" }),
  method: z.string().max(50).default("Espèces"),
  notes: z.string().max(1000).default(""),
});

export type PaymentParsed = z.infer<typeof paymentSchema>;
