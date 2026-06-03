import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { InvoiceEditForm } from "@/features/invoices/components/InvoiceEditForm";
import { useInvoice, useUpdateInvoice } from "@/features/invoices/hooks";

export const Route = createFileRoute("/_app/invoices/$id/edit")({
  head: () => ({ meta: [{ title: "Modifier facture — PVALUX" }] }),
  component: EditInvoice,
});

function EditInvoice() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { data } = useInvoice(id);
  const update = useUpdateInvoice(id);

  if (!data?.inv) return <div className="text-muted-foreground">Chargement…</div>;
  const inv = data.inv as any;

  return (
    <div className="space-y-4 max-w-2xl">
      <Link to="/invoices/$id" params={{ id }} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 mr-1" />Retour à la facture {inv.invoice_number}
      </Link>
      <InvoiceEditForm
        initial={{ due_date: inv.due_date, notes: inv.notes, status: inv.status, paid: inv.paid }}
        busy={update.isPending}
        onCancel={() => nav({ to: "/invoices/$id", params: { id } })}
        onSubmit={async (v) => {
          try {
            await update.mutateAsync(v);
            toast.success("Facture mise à jour");
            nav({ to: "/invoices/$id", params: { id } });
          } catch (e: any) {
            toast.error(e?.message ?? "Erreur");
          }
        }}
      />
    </div>
  );
}
