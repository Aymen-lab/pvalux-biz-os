import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTND } from "@/lib/format";
import { format } from "date-fns";
import { Receipt, Plus } from "lucide-react";
import { PaymentDialog } from "@/components/invoices/PaymentDialog";

export const Route = createFileRoute("/_app/invoices/")({
  head: () => ({ meta: [{ title: "Factures — PVALUX" }] }),
  component: InvoicesList,
});

const STATUS: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "Non payée", cls: "bg-muted text-muted-foreground" },
  partial: { label: "Partiel", cls: "bg-warning/15 text-warning" },
  paid: { label: "Payée", cls: "bg-success/15 text-success" },
  overdue: { label: "En retard", cls: "bg-destructive/15 text-destructive" },
};

const isOverdue = (inv: any) =>
  inv.status !== "paid" && inv.due_date && new Date(inv.due_date) < new Date(new Date().toDateString());

function fmtD(d: string | null) {
  return d ? format(new Date(d), "dd/MM/yyyy") : "—";
}

function InvoicesList() {
  const { profile } = useAuth();
  const cid = profile?.company_id;
  const nav = useNavigate();
  const [payFor, setPayFor] = useState<any>(null);

  const { data = [] } = useQuery({
    queryKey: ["invoices", cid],
    enabled: !!cid,
    queryFn: async () =>
      (await supabase.from("invoices").select("*, customers(name)").eq("company_id", cid!).order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-5 max-w-6xl">
      <Card>
        <CardContent className="p-0">
          {!data.length ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Aucune facture. Convertissez un devis accepté.</div>
          ) : (
            <div className="divide-y">
              {data.map((inv: any) => {
                const overdue = isOverdue(inv);
                const effectiveStatus = overdue ? "overdue" : inv.status;
                return (
                  <div
                    key={inv.id}
                    role="button"
                    onClick={() => nav({ to: "/invoices/$id", params: { id: inv.id } })}
                    className="flex items-center gap-3 p-4 flex-wrap cursor-pointer hover:bg-muted/30"
                  >
                    <div className="size-10 rounded-md bg-accent/10 text-accent grid place-items-center"><Receipt className="size-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{inv.invoice_number}</span>
                        <Badge className={STATUS[effectiveStatus]?.cls}>{STATUS[effectiveStatus]?.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {inv.customers?.name} • Émise {fmtD(inv.created_at)} • Échéance{" "}
                        <span className={overdue ? "text-destructive font-medium" : ""}>{fmtD(inv.due_date)}</span>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold">{formatTND(inv.total)}</div>
                      <div className="text-xs text-muted-foreground">
                        Payé {formatTND(inv.paid)} • Reste{" "}
                        <span className={overdue ? "text-destructive" : ""}>{formatTND(inv.balance)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" onClick={() => setPayFor(inv)}>
                        <Plus className="size-4 mr-1" />Paiement
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {payFor && (
        <PaymentDialog
          invoice={{ id: payFor.id, total: Number(payFor.total), paid: Number(payFor.paid) }}
          open={!!payFor}
          onOpenChange={(o) => !o && setPayFor(null)}
        />
      )}
    </div>
  );
}
