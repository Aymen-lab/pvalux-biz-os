import { z } from "zod";

export const invoiceEditSchema = z.object({
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date invalide" }).nullable(),
  notes: z.string().max(2000).default(""),
});

export type InvoiceEditParsed = z.infer<typeof invoiceEditSchema>;
