import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { QuoteForm } from "@/features/quotes/components/QuoteForm";
import { useCreateQuote, useCustomers } from "@/features/quotes/hooks";

export const Route = createFileRoute("/_app/quotes/new")({
  head: () => ({ meta: [{ title: "Nouveau devis — PVALUX" }] }),
  component: NewQuote,
});

function NewQuote() {
  const { profile } = useAuth();
  const cid = profile?.company_id;
  const nav = useNavigate();
  const { data: customers = [] } = useCustomers(cid);
  const create = useCreateQuote(cid ?? "");

  if (!cid) return <div className="text-muted-foreground">Chargement…</div>;

  return (
    <QuoteForm
      mode="create"
      customers={customers}
      submitLabel="Créer le devis"
      busy={create.isPending}
      onCancel={() => nav({ to: "/quotes" })}
      onSubmit={async (v) => {
        try {
          const r = await create.mutateAsync(v);
          toast.success(`Devis ${r.quote_number} créé`);
          nav({ to: "/quotes/$id", params: { id: r.id } });
        } catch (e: any) {
          toast.error(e?.message ?? "Erreur");
        }
      }}
    />
  );
}
