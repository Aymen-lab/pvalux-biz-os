export type InvoiceStatus = "unpaid" | "partial" | "paid" | "overdue";

export interface InvoiceEditValues {
  due_date: string | null; // YYYY-MM-DD
  notes: string;
}

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; cls: string }> = {
  unpaid: { label: "Non payée", cls: "bg-muted text-muted-foreground" },
  partial: { label: "Partiel", cls: "bg-warning/15 text-warning" },
  paid: { label: "Payée", cls: "bg-success/15 text-success" },
  overdue: { label: "En retard", cls: "bg-destructive/15 text-destructive" },
};

export function isInvoiceOverdue(inv: { status: string; due_date?: string | null }) {
  return inv.status !== "paid" && !!inv.due_date && new Date(inv.due_date) < new Date(new Date().toDateString());
}

export function canEditInvoiceFinancials(inv: { status: string; paid: number | string }) {
  return inv.status === "unpaid" && Number(inv.paid) === 0;
}
