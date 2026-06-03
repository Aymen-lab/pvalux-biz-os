import { Card, CardContent } from "@/components/ui/card";
import { formatTND } from "@/lib/format";
import { format } from "date-fns";
import { isInvoiceOverdue } from "../types";

const fmtD = (d: string | null | undefined) => (d ? format(new Date(d), "dd/MM/yyyy") : "—");

export function InvoiceSummaryCard({ inv }: { inv: any }) {
  const overdue = isInvoiceOverdue(inv);
  const remaining = Number(inv.balance);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card><CardContent className="p-4">
        <div className="text-xs text-muted-foreground">Total TTC</div>
        <div className="text-lg font-semibold mt-1">{formatTND(inv.total)}</div>
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <div className="text-xs text-muted-foreground">Montant payé</div>
        <div className="text-lg font-semibold mt-1">{formatTND(inv.paid)}</div>
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <div className="text-xs text-muted-foreground">Reste à payer</div>
        <div className={`text-lg font-semibold mt-1 ${remaining === 0 ? "text-success" : overdue ? "text-destructive" : ""}`}>
          {formatTND(remaining)}
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <div className="text-xs text-muted-foreground">Date d'échéance</div>
        <div className={`text-lg font-semibold mt-1 ${overdue ? "text-destructive" : ""}`}>{fmtD(inv.due_date)}</div>
      </CardContent></Card>
    </div>
  );
}
