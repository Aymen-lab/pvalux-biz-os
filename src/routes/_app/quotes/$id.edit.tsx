import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { QuoteForm } from "@/features/quotes/components/QuoteForm";
import { useCustomers, useQuote, useUpdateQuote } from "@/features/quotes/hooks";
import type { QuoteFormValues } from "@/features/quotes/types";

export const Route = createFileRoute("/_app/quotes/$id/edit")({
  head: () => ({ meta: [{ title: "Modifier devis — PVALUX" }] }),
  component: EditQuote,
});

function EditQuote() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  const cid = profile?.company_id;
  const nav = useNavigate();
  const { data: customers = [] } = useCustomers(cid);
  const { data } = useQuote(id, cid);
  const update = useUpdateQuote(id);

  if (!data?.q) return <div className="text-muted-foreground">Chargement…</div>;
  const { q, lines, hasInvoice } = data;

  const initial: QuoteFormValues = {
    customer_id: q.customer_id,
    project_name: q.project_name ?? "",
    notes: q.notes ?? "",
    conditions: q.conditions ?? "",
    discount: Number(q.discount),
    transport: Number(q.transport),
    installation: Number(q.installation),
    tax_rate: Number(q.tax_rate),
    lines: lines.map((l: any) => ({
      category: l.category ?? "Autre",
      product_type: l.product_type,
      description: l.description ?? "",
      width: Number(l.width ?? 0),
      height: Number(l.height ?? 0),
      quantity: Number(l.quantity),
      unit: l.unit,
      unit_price: Number(l.unit_price),
    })),
  };

  const warn =
    q.status === "accepted"
      ? "Ce devis est accepté. Modifier les données peut créer un écart avec le client. Continuer ?"
      : q.status === "sent" || q.status === "follow_up"
      ? "Ce devis a déjà été envoyé. Continuer la modification ?"
      : null;

  return (
    <div className="space-y-4">
      <Link to="/quotes/$id" params={{ id }} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 mr-1" />Retour au devis {q.quote_number}
      </Link>
      <QuoteForm
        mode="edit"
        customers={customers}
        initial={initial}
        financialLocked={hasInvoice}
        confirmBeforeSave={warn}
        submitLabel="Enregistrer les modifications"
        busy={update.isPending}
        onCancel={() => nav({ to: "/quotes/$id", params: { id } })}
        onSubmit={async (v) => {
          try {
            await update.mutateAsync(v);
            toast.success("Devis mis à jour");
            nav({ to: "/quotes/$id", params: { id } });
          } catch (e: any) {
            toast.error(e?.message ?? "Erreur");
          }
        }}
      />
    </div>
  );
}
