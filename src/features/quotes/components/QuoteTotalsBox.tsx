import { formatTND, lineTotal } from "@/lib/format";
import type { QuoteFormValues } from "../types";
import { useMemo } from "react";

export function computeQuoteTotals(v: Pick<QuoteFormValues, "lines" | "discount" | "transport" | "installation" | "tax_rate">) {
  const lineTotals = v.lines.map((l) => lineTotal(l.width, l.height, l.quantity, l.unit_price, l.unit));
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);
  const base = subtotal - Number(v.discount || 0) + Number(v.transport || 0) + Number(v.installation || 0);
  const taxAmount = base * (Number(v.tax_rate || 0) / 100);
  return { lineTotals, subtotal, base, taxAmount, total: base + taxAmount };
}

export function QuoteTotalsBox({ values }: { values: QuoteFormValues }) {
  const t = useMemo(() => computeQuoteTotals(values), [values]);
  return (
    <div className="space-y-2 text-sm bg-muted/40 rounded-lg p-4">
      <div className="flex justify-between"><span>Sous-total</span><span>{formatTND(t.subtotal)}</span></div>
      <div className="flex justify-between text-muted-foreground"><span>Remise</span><span>-{formatTND(values.discount)}</span></div>
      <div className="flex justify-between text-muted-foreground"><span>Transport + Pose</span><span>{formatTND(Number(values.transport) + Number(values.installation))}</span></div>
      <div className="flex justify-between text-muted-foreground"><span>TVA ({values.tax_rate}%)</span><span>{formatTND(t.taxAmount)}</span></div>
      <div className="flex justify-between text-lg font-bold font-display pt-2 border-t mt-2"><span>Total TTC</span><span className="text-accent">{formatTND(t.total)}</span></div>
    </div>
  );
}
