import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTND, formatDate, PRODUCT_TYPES, UNITS } from "@/lib/format";
import { format } from "date-fns";

const fmtD = (d: string | null | undefined) => (d ? format(new Date(d), "dd/MM/yyyy") : "—");

const STATUS_LABEL: Record<string, string> = {
  unpaid: "Non payée",
  partial: "Partiellement payée",
  paid: "Payée",
  overdue: "En retard",
};

interface Props {
  invoice: any;
  customer: any;
  company: any;
  lines: any[]; // pulled from source quote_lines if available
  payments: any[];
  effectiveStatus: string;
}

export function InvoiceDocument({ invoice, customer, company, lines, payments, effectiveStatus }: Props) {
  const paid = Number(invoice.paid);
  const remaining = Number(invoice.balance);

  return (
    <Card className="print-area">
      <CardContent className="p-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start gap-6 flex-wrap">
          <div className="flex items-start gap-3">
            {company?.logo_url && (
              <img src={company.logo_url} alt="" className="size-14 rounded object-contain" />
            )}
            <div>
              <div className="text-2xl font-display font-bold text-primary">{company?.name}</div>
              <div className="text-xs text-muted-foreground whitespace-pre-line">
                {company?.address}
                <br />
                {company?.phone}
                {company?.email ? ` • ${company.email}` : ""}
                {company?.tax_id ? ` • MF: ${company.tax_id}` : ""}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display font-bold text-xl">FACTURE</div>
            <div className="text-sm">{invoice.invoice_number}</div>
            <div className="text-xs text-muted-foreground">Émise le {formatDate(invoice.created_at)}</div>
            {invoice.quotes?.quote_number && (
              <div className="text-xs text-muted-foreground">Réf. devis : {invoice.quotes.quote_number}</div>
            )}
            <Badge className="mt-2">{STATUS_LABEL[effectiveStatus] ?? effectiveStatus}</Badge>
          </div>
        </div>

        {/* Client & dates */}
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-muted/40 rounded-lg p-3">
            <div className="text-xs uppercase text-muted-foreground mb-1">Client</div>
            <div className="font-semibold">{customer?.name}</div>
            {customer?.phone && <div className="text-xs">{customer.phone}</div>}
            {customer?.email && <div className="text-xs">{customer.email}</div>}
            {customer?.address && <div className="text-xs">{customer.address}</div>}
          </div>
          <div className="bg-muted/40 rounded-lg p-3">
            <div className="text-xs uppercase text-muted-foreground mb-1">Échéance</div>
            <div className="font-semibold">{fmtD(invoice.due_date)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Date de facturation : {fmtD(invoice.created_at)}
            </div>
          </div>
        </div>

        {/* Lines */}
        {lines && lines.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="p-2 text-left">Désignation</th>
                <th className="p-2 text-right">Dim.</th>
                <th className="p-2 text-right">Qté</th>
                <th className="p-2 text-right">PU</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l: any) => (
                <tr key={l.id} className="border-b">
                  <td className="p-2">
                    <div className="font-medium">
                      {PRODUCT_TYPES[l.product_type] ?? l.product_type} — {l.category}
                    </div>
                    {l.description && <div className="text-xs text-muted-foreground">{l.description}</div>}
                  </td>
                  <td className="p-2 text-right text-xs">
                    {l.unit === "m2" ? `${l.width}×${l.height}` : l.unit === "ml" ? `${l.width}m` : "—"}
                  </td>
                  <td className="p-2 text-right">
                    {l.quantity} {UNITS[l.unit]}
                  </td>
                  <td className="p-2 text-right">{formatTND(l.unit_price)}</td>
                  <td className="p-2 text-right font-medium">{formatTND(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Totals + paid summary */}
        <div className="flex justify-end">
          <div className="w-full sm:w-80 text-sm space-y-1">
            <div className="flex justify-between text-lg font-bold font-display pt-2 border-t">
              <span>Total TTC</span>
              <span>{formatTND(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-success pt-2 border-t">
              <span>Montant payé</span>
              <span>{formatTND(paid)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold font-display">
              <span>Reste à payer</span>
              <span className={remaining === 0 ? "text-success" : "text-accent"}>{formatTND(remaining)}</span>
            </div>
          </div>
        </div>

        {/* Payment history */}
        {payments && payments.length > 0 && (
          <div className="pt-4 border-t">
            <div className="text-xs uppercase text-muted-foreground mb-2">Historique des paiements</div>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="text-left p-1.5">Date</th>
                  <th className="text-left p-1.5">Méthode</th>
                  <th className="text-left p-1.5">Note</th>
                  <th className="text-right p-1.5">Montant</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-1.5">{fmtD(p.paid_at)}</td>
                    <td className="p-1.5">{p.method ?? "—"}</td>
                    <td className="p-1.5 text-muted-foreground">{p.notes ?? "—"}</td>
                    <td className="p-1.5 text-right font-medium">{formatTND(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes / payment terms */}
        {(invoice.notes || company?.payment_terms) && (
          <div className="text-xs text-muted-foreground space-y-2 pt-4 border-t">
            {invoice.notes && (
              <div>
                <b>Notes :</b> {invoice.notes}
              </div>
            )}
            {company?.payment_terms && (
              <div>
                <b>Conditions de paiement :</b> {company.payment_terms}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          Merci pour votre confiance — {company?.name}
        </div>
      </CardContent>
    </Card>
  );
}
