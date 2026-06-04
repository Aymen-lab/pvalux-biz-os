import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatTND, formatDate, PRODUCT_TYPES, UNITS } from "@/lib/format";
import {
  Printer,
  MessageCircle,
  ArrowLeft,
  FileCheck,
  CalendarIcon,
  Pencil,
  Send,
  Check,
  X,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { QuoteLifecycleStepper } from "@/components/QuoteLifecycleStepper";

export const Route = createFileRoute("/_app/quotes/$id/")({
  head: () => ({ meta: [{ title: "Devis — PVALUX" }] }),
  component: QuoteDetail,
});

const STATUSES = {
  draft: "Brouillon",
  sent: "Envoyé",
  follow_up: "Relance",
  accepted: "Accepté",
  rejected: "Refusé",
} as const;

function QuoteDetail() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  const cid = profile?.company_id;
  const qc = useQueryClient();
  const nav = useNavigate();
  const [convertOpen, setConvertOpen] = useState(false);
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 30);
  const [dueDate, setDueDate] = useState<Date>(defaultDue);
  const [converting, setConverting] = useState(false);

  const { data } = useQuery({
    queryKey: ["quote", id],
    queryFn: async () => {
      const [{ data: q }, { data: lines }, { data: company }, { data: invLink }] = await Promise.all([
        supabase.from("quotes").select("*, customers(*)").eq("id", id).single(),
        supabase.from("quote_lines").select("*").eq("quote_id", id).order("position"),
        supabase.from("companies").select("*").eq("id", cid!).single(),
        supabase.from("invoices").select("id,invoice_number,status").eq("quote_id", id).limit(1),
      ]);
      return { q, lines: lines ?? [], company, invoice: invLink?.[0] ?? null };
    },
    enabled: !!cid,
  });

  if (!data?.q) return <div className="text-muted-foreground">Chargement…</div>;
  const { q, lines, company, invoice } = data;
  const hasInvoice = !!invoice;
  const invoicePaid = invoice?.status === "paid";

  const setStatus = async (status: string) => {
    const { error } = await supabase.from("quotes").update({ status: status as any }).eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["quote", id] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    }
  };

  const hasPhone = !!(q.customers?.whatsapp || q.customers?.phone);

  const whatsappMsg = () => {
    if (!hasPhone) return toast.error("Ajouter un numéro WhatsApp d'abord");
    const linesTxt = lines
      .map(
        (l: any) =>
          `• ${PRODUCT_TYPES[l.product_type]} — ${l.description || ""} (${l.quantity} ${UNITS[l.unit]}) = ${formatTND(l.total)}`,
      )
      .join("\n");
    const msg = `*Devis ${q.quote_number}*\n${company?.name ?? ""}\n\nBonjour ${q.customers?.name},\n\nVoici votre devis pour ${q.project_name || "votre projet"} :\n\n${linesTxt}\n\n*Total: ${formatTND(q.total)}*\n\nMerci pour votre confiance.`;
    const phone = (q.customers?.whatsapp || q.customers?.phone || "").replace(/\D/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    if (q.status === "draft") {
      setTimeout(() => {
        if (window.confirm("Marquer ce devis comme envoyé ?")) setStatus("sent");
      }, 600);
    }
  };

  const openConvert = () => {
    if (hasInvoice) return toast.error("Une facture existe déjà pour ce devis");
    if (q.status !== "accepted") return toast.error("Marquez le devis comme accepté d'abord");
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDueDate(d);
    setConvertOpen(true);
  };

  const convertToInvoice = async () => {
    setConverting(true);
    const { data: res, error } = await supabase.rpc("convert_quote_to_invoice", {
      _quote_id: q.id,
      _due_date: format(dueDate, "yyyy-MM-dd"),
    });
    setConverting(false);
    if (error) return toast.error(error.message);
    const result = res as { id: string; invoice_number: string };
    toast.success(`Facture ${result.invoice_number} créée`);
    setConvertOpen(false);
    nav({ to: "/invoices/$id", params: { id: result.id } });
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 no-print flex-wrap">
        <Link
          to="/quotes"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 mr-1" />
          Devis
        </Link>
        <div className="flex gap-2 flex-wrap">
          <Link to="/quotes/$id/edit" params={{ id: q.id }}>
            <Button variant="outline" size="sm">
              <Pencil className="size-4 mr-2" />
              Modifier
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4 mr-2" />
            Imprimer / PDF
          </Button>
        </div>
      </div>

      {/* Lifecycle + actions */}
      <Card className="no-print">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Devis</div>
              <div className="font-display font-bold text-xl">{q.quote_number}</div>
              <div className="text-sm text-muted-foreground">
                {q.customers?.name} • {q.project_name || "Sans projet"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total TTC</div>
              <div className="font-display font-bold text-2xl text-accent">{formatTND(q.total)}</div>
            </div>
          </div>

          <QuoteLifecycleStepper status={q.status} hasInvoice={hasInvoice} invoicePaid={invoicePaid} />

          {/* Action area — contextual */}
          <div className="flex flex-wrap gap-2 pt-2">
            {q.status === "draft" && (
              <>
                <Button onClick={whatsappMsg} disabled={!hasPhone}>
                  <MessageCircle className="size-4 mr-2" />
                  Envoyer via WhatsApp
                </Button>
                <Button variant="outline" onClick={() => setStatus("sent")}>
                  <Send className="size-4 mr-2" />
                  Marquer comme envoyé
                </Button>
              </>
            )}
            {(q.status === "sent" || q.status === "follow_up") && (
              <>
                <Button onClick={() => setStatus("accepted")}>
                  <Check className="size-4 mr-2" />
                  Marquer accepté
                </Button>
                <Button variant="outline" onClick={() => setStatus("rejected")}>
                  <X className="size-4 mr-2" />
                  Marquer refusé
                </Button>
                <Button variant="outline" onClick={whatsappMsg} disabled={!hasPhone}>
                  <MessageCircle className="size-4 mr-2" />
                  Relancer WhatsApp
                </Button>
              </>
            )}
            {q.status === "accepted" && !hasInvoice && (
              <Button onClick={openConvert}>
                <FileCheck className="size-4 mr-2" />
                Créer la facture
              </Button>
            )}
            {hasInvoice && (
              <Link to="/invoices/$id" params={{ id: invoice!.id }}>
                <Button variant="outline">
                  <Eye className="size-4 mr-2" />
                  Voir la facture {invoice!.invoice_number}
                </Button>
              </Link>
            )}
            {q.status === "rejected" && (
              <Button variant="outline" onClick={() => setStatus("draft")}>
                Réouvrir le devis
              </Button>
            )}
            {!hasPhone && (q.status === "draft" || q.status === "sent") && (
              <span className="text-xs text-muted-foreground self-center">
                Ajouter un numéro WhatsApp d'abord
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convertir en facture</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Une facture sera créée pour {formatTND(q.total)} au nom de {q.customers?.name}.
            </p>
            <div>
              <Label>Date d'échéance</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: fr }) : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(d) => d && setDueDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>
              Annuler
            </Button>
            <Button onClick={convertToInvoice} disabled={converting}>
              {converting ? "Création…" : "Créer la facture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable document */}
      <Card className="print-area">
        <CardContent className="p-8 space-y-6">
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
                  {company?.phone} {company?.email ? `• ${company.email}` : ""}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display font-bold text-xl">DEVIS</div>
              <div className="text-sm">{q.quote_number}</div>
              <div className="text-xs text-muted-foreground">{formatDate(q.created_at)}</div>
              <Badge className="mt-2">{STATUSES[q.status as keyof typeof STATUSES]}</Badge>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="text-xs uppercase text-muted-foreground mb-1">Client</div>
              <div className="font-semibold">{q.customers?.name}</div>
              <div className="text-xs">
                {q.customers?.phone} {q.customers?.whatsapp ? `• ${q.customers.whatsapp}` : ""}
              </div>
              <div className="text-xs">{q.customers?.address}</div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="text-xs uppercase text-muted-foreground mb-1">Projet</div>
              <div className="font-semibold">{q.project_name || "—"}</div>
            </div>
          </div>

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
                      {PRODUCT_TYPES[l.product_type]} — {l.category}
                    </div>
                    <div className="text-xs text-muted-foreground">{l.description}</div>
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

          <div className="flex justify-end">
            <div className="w-full sm:w-72 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Sous-total</span>
                <span>{formatTND(q.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Remise</span>
                <span>-{formatTND(q.discount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Transport</span>
                <span>{formatTND(q.transport)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Pose</span>
                <span>{formatTND(q.installation)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>TVA ({q.tax_rate}%)</span>
                <span>{formatTND(q.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold font-display pt-2 border-t">
                <span>Total TTC</span>
                <span className="text-accent">{formatTND(q.total)}</span>
              </div>
            </div>
          </div>

          {(q.notes || q.conditions) && (
            <div className="text-xs text-muted-foreground space-y-2 pt-4 border-t">
              {q.notes && (
                <div>
                  <b>Notes :</b> {q.notes}
                </div>
              )}
              {q.conditions && (
                <div>
                  <b>Conditions :</b> {q.conditions}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
