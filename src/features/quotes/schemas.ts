import { z } from "zod";

export const quoteLineSchema = z.object({
  category: z.string().max(50).default("Autre"),
  product_type: z.string().min(1).max(50),
  description: z.string().max(500).default(""),
  width: z.number().min(0).max(100).default(0),
  height: z.number().min(0).max(100).default(0),
  quantity: z.number().positive({ message: "Quantité > 0" }).max(100000),
  unit: z.string().min(1).max(20),
  unit_price: z.number().min(0, { message: "PU >= 0" }).max(1_000_000),
});

export const quoteFormSchema = z.object({
  customer_id: z.string().uuid({ message: "Client requis" }),
  project_name: z.string().max(200).default(""),
  notes: z.string().max(2000).default(""),
  conditions: z.string().max(2000).default(""),
  discount: z.number().min(0).max(10_000_000).default(0),
  transport: z.number().min(0).max(10_000_000).default(0),
  installation: z.number().min(0).max(10_000_000).default(0),
  tax_rate: z.number().min(0).max(100).default(19),
  lines: z.array(quoteLineSchema).min(1, { message: "Au moins une ligne" }),
});

export type QuoteFormParsed = z.infer<typeof quoteFormSchema>;
