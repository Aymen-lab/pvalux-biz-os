import { Badge } from "@/components/ui/badge";
import { INVOICE_STATUS, isInvoiceOverdue, type InvoiceStatus } from "../types";

export function InvoiceStatusBadge({ inv }: { inv: { status: string; due_date?: string | null } }) {
  const effective = (isInvoiceOverdue(inv) ? "overdue" : inv.status) as InvoiceStatus;
  const s = INVOICE_STATUS[effective];
  return <Badge className={s?.cls}>{s?.label ?? inv.status}</Badge>;
}
