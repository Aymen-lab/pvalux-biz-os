import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { formatTND } from "@/lib/format";
import type { PaymentRecord } from "../types";

const fmtD = (d: string | null | undefined) => (d ? format(new Date(d), "dd/MM/yyyy") : "—");

interface Props {
  payments: PaymentRecord[];
  totalPaid: number;
  remaining: number;
  onEdit: (p: PaymentRecord) => void;
  onDelete: (p: PaymentRecord) => void;
}

export function PaymentHistoryTable({ payments, totalPaid, remaining, onEdit, onDelete }: Props) {
  if (payments.length === 0) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Aucun paiement enregistré</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left p-3">Date</th>
            <th className="text-left p-3">Méthode</th>
            <th className="text-right p-3">Montant</th>
            <th className="text-left p-3">Note</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-3">{fmtD(p.paid_at)}</td>
              <td className="p-3">{p.method ?? "—"}</td>
              <td className="p-3 text-right font-medium">{formatTND(p.amount)}</td>
              <td className="p-3 text-muted-foreground">{p.notes ?? "—"}</td>
              <td className="p-3 text-right">
                <div className="inline-flex gap-1">
                  <button className="size-8 grid place-items-center rounded hover:bg-muted" onClick={() => onEdit(p)}>
                    <Pencil className="size-4" />
                  </button>
                  <button className="size-8 grid place-items-center rounded hover:bg-muted text-destructive" onClick={() => onDelete(p)}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/30 font-medium">
            <td className="p-3" colSpan={2}>Total payé</td>
            <td className="p-3 text-right">{formatTND(totalPaid)}</td>
            <td className="p-3 text-muted-foreground">Reste à payer</td>
            <td className="p-3 text-right">{formatTND(remaining)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
