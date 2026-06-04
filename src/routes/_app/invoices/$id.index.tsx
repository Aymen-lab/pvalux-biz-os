import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Plus, Printer, Trash2, MessageCircle } from "lucide-react";
import { formatTND } from "@/lib/format";
import { format } from "date-fns";
import { toast } from "sonner";
import { PaymentDialog, type PaymentRecord } from "@/components/invoices/PaymentDialog";
import { InvoiceDocument } from "@/components/invoices/InvoiceDocument";

export const Route = createFileRoute("/_app/invoices/$id/")({
  head: () => ({ meta: [{ title: "Facture — PVALUX" }] }),
  component: InvoiceDetail,
});

const STATUS: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "Non payée", cls: "bg-muted text-muted-foreground" },
  partial: { label: "Partiellement payée", cls: "bg-warning/15 text-warning" },
  paid: { label: "Payée", cls: "bg-success/15 text-success" },
  overdue: { label: "En retard", cls: "bg-destructive/15 text-destructive" },
};

const FOLLOWUP_STATUS: Record<string, string> = {
  new: "Nouveau",
  waiting: "En attente",
  promise: "Promesse",
  partial: "Partiel",
  escalated: "Escaladé",
  closed: "Clôturé",
};

const fmtD = (d: string | null | undefined) => (d ? format(new Date(d), "dd/MM/yyyy") : "—");

function InvoiceDetail() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  const cid = profile?.company_id;
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<PaymentRecord | null>(null);
  const [deletePayment, setDeletePayment] = useState<PaymentRecord | null>(null);

  const { data } = useQuery({
    queryKey: ["invoice", id],
    enabled: !!cid,
    queryFn: async () => {
      const [{ data: inv }, { data: payments }, { data: followups }, { data: company }] =
        await Promise.all([
          supabase
            .from("invoices")
            .select("*, customers(*), quotes(quote_number, id)")
            .eq("id", id)
            .single(),
          supabase
            .from("payments")
            .select("*")
            .eq("invoice_id", id)
            .order("paid_at", { ascending: false }),
          supabase
            .from("follow_ups")
            .select("*")
            .eq("invoice_id", id)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase.from("companies").select("*").eq("id", cid!).single(),
        ]);

      let lines: any[] = [];
      if (inv?.quote_id) {
        const { data: ls } = await supabase
          .from("quote_lines")
          .select("*")
          .eq("quote_id", inv.quote_id)
          .order("position");
        lines = ls ?? [];
      }
      return { inv, payments: payments ?? [], followups: followups ?? [], company, lines };
    },
  });

  if (!data?.inv) return <div className="text-muted-foreground">Chargement…</div>;
  const inv = data.inv as any;
  const overdue =
    inv.status !== "paid" && inv.due_date && new Date(inv.due_date) < new Date(new Date().toDateString());
  const effectiveStatus = overdue ? "overdue" : inv.status;
  const remaining = Number(inv.balance);
  const fullyPaid = remaining <= 0.0001;
  const hasPhone = !!(inv.customers?.whatsapp || inv.customers?.phone);

  const confirmDelete = async () => {
    if (!deletePayment) return;
    const { error } = await supabase.rpc("delete_payment", { _payment_id: deletePayment.id });
    if (error) return toast.error(error.message);
    toast.success("Paiement supprimé");
    qc.invalidateQueries({ queryKey: ["invoice", id] });
    qc.invalidateQueries({ queryKey: ["invoices"] });
    setDeletePayment(null);
  };

  const sendReminder = () => {
    if (!hasPhone) return toast.error("Ajouter un numéro WhatsApp d'abord");
    const msg = `Bonjour ${inv.customers?.name},\n\nNous vous rappelons que la facture *${inv.invoice_number}* d'un montant de *${formatTND(inv.total)}* présente un reste à payer de *${formatTND(remaining)}*${inv.due_date ? ` (échéance ${fmtD(inv.due_date)})` : ""}.\n\nMerci de bien vouloir procéder au règlement.\n\n${data.company?.name ?? ""}`;
    const phone = (inv.customers?.whatsapp || inv.customers?.phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="flex items-center gap-3">
          <Link
            to="/invoices"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4 mr-1" />
            Factures
          </Link>
          <h1 className="text-lg font-display font-semibold">{inv.invoice_number}</h1>
          <Badge className={STATUS[effectiveStatus]?.cls}>{STATUS[effectiveStatus]?.label}</Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/invoices/$id/edit" params={{ id: inv.id }}>
            <Button variant="outline" size="sm">
              <Pencil className="size-4 mr-2" />
              Modifier
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4 mr-2" />
            PDF
          </Button>
          {!fullyPaid && (
            <Button variant="outline" size="sm" onClick={sendReminder} disabled={!hasPhone}>
              <MessageCircle className="size-4 mr-2" />
              Relancer WhatsApp
            </Button>
          )}
          {!fullyPaid && (
            <Button
              size="sm"
              onClick={() => {
                setEditPayment(null);
                setPayOpen(true);
              }}
            >
              <Plus className="size-4 mr-2" />
              Enregistrer un paiement
            </Button>
          )}
          {fullyPaid && (
            <Badge className="bg-success/15 text-success self-center px-3 py-1.5">Facture soldée ✓</Badge>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total TTC</div>
            <div className="text-lg font-semibold mt-1">{formatTND(inv.total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Montant payé</div>
            <div className="text-lg font-semibold mt-1 text-success">{formatTND(inv.paid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Reste à payer</div>
            <div
              className={`text-lg font-semibold mt-1 ${fullyPaid ? "text-success" : overdue ? "text-destructive" : "text-accent"}`}
            >
              {formatTND(remaining)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Date d'échéance</div>
            <div className={`text-lg font-semibold mt-1 ${overdue ? "text-destructive" : ""}`}>
              {fmtD(inv.due_date)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quote link */}
      {inv.quote_id && (
        <div className="text-sm text-muted-foreground no-print">
          Devis source :{" "}
          <Link
            to="/quotes/$id"
            params={{ id: inv.quote_id }}
            className="text-primary hover:underline font-medium"
          >
            {inv.quotes?.quote_number ?? "Voir le devis"}
          </Link>
        </div>
      )}

      {/* Payments table */}
      <Card className="no-print">
        <CardContent className="p-0">
          <div className="p-4 border-b font-medium text-sm">Historique des paiements</div>
          {data.payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aucun paiement enregistré pour cette facture.
            </div>
          ) : (
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
                  {data.payments.map((p: any) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3">{fmtD(p.paid_at)}</td>
                      <td className="p-3">{p.method ?? "—"}</td>
                      <td className="p-3 text-right font-medium">{formatTND(p.amount)}</td>
                      <td className="p-3 text-muted-foreground">{p.notes ?? "—"}</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            className="size-8 grid place-items-center rounded hover:bg-muted"
                            onClick={() => {
                              setEditPayment(p);
                              setPayOpen(true);
                            }}
                            aria-label="Modifier"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            className="size-8 grid place-items-center rounded hover:bg-muted text-destructive"
                            onClick={() => setDeletePayment(p)}
                            aria-label="Supprimer"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-medium">
                    <td className="p-3" colSpan={2}>
                      Total payé
                    </td>
                    <td className="p-3 text-right">{formatTND(inv.paid)}</td>
                    <td className="p-3 text-muted-foreground">Reste à payer</td>
                    <td className="p-3 text-right">{formatTND(remaining)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Follow-ups */}
      <Card className="no-print">
        <CardContent className="p-0">
          <div className="p-4 border-b font-medium text-sm">Historique des relances</div>
          {data.followups.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Aucune relance enregistrée.</div>
          ) : (
            <div className="divide-y">
              {data.followups.map((f: any) => (
                <div key={f.id} className="p-3 text-sm flex gap-3">
                  <div className="text-muted-foreground w-24 shrink-0">{fmtD(f.created_at)}</div>
                  <div className="w-28 shrink-0">
                    <Badge variant="secondary">{FOLLOWUP_STATUS[f.status] ?? f.status}</Badge>
                  </div>
                  <div className="flex-1 text-muted-foreground truncate">
                    {(f.message ?? "").slice(0, 80)}
                    {(f.message?.length ?? 0) > 80 ? "…" : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="p-3 border-t text-right">
            <Link to="/follow-ups" className="text-sm text-primary hover:underline">
              Voir toutes les relances →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Printable invoice document */}
      <InvoiceDocument
        invoice={inv}
        customer={inv.customers}
        company={data.company}
        lines={data.lines}
        payments={data.payments}
        effectiveStatus={effectiveStatus}
      />

      <PaymentDialog
        invoice={{ id: inv.id, total: Number(inv.total), paid: Number(inv.paid) }}
        payment={editPayment ?? undefined}
        open={payOpen}
        onOpenChange={(o) => {
          setPayOpen(o);
          if (!o) setEditPayment(null);
        }}
      />

      <AlertDialog open={!!deletePayment} onOpenChange={(o) => !o && setDeletePayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le solde et le statut de la facture seront recalculés automatiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
