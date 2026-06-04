import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatTND } from "@/lib/format";
import { format } from "date-fns";
import { Receipt, Plus, Search } from "lucide-react";
import { PaymentDialog } from "@/components/invoices/PaymentDialog";
import { EmptyState } from "@/components/EmptyState";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

const searchSchema = z.object({
  status: fallback(z.enum(["all", "unpaid", "partial", "paid", "overdue"]), "all").default("all"),
  sort: fallback(z.enum(["new", "old", "high", "overdue"]), "new").default("new"),
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_app/invoices/")({
  head: () => ({ meta: [{ title: "Factures — PVALUX" }] }),
  validateSearch: zodValidator(searchSchema),
  component: InvoicesList,
});

const STATUS: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "Non payée", cls: "bg-muted text-muted-foreground" },
  partial: { label: "Partiellement payée", cls: "bg-warning/15 text-warning" },
  paid: { label: "Payée", cls: "bg-success/15 text-success" },
  overdue: { label: "En retard", cls: "bg-destructive/15 text-destructive" },
};

const NEXT_ACTION: Record<string, string> = {
  unpaid: "Enregistrer un paiement",
  partial: "Encaisser le solde restant",
  overdue: "Envoyer une relance",
  paid: "Terminé",
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
  const { status, sort, q } = Route.useSearch();
  const [localQ, setLocalQ] = useState(q);
  const [payFor, setPayFor] = useState<any>(null);

  const { data = [] } = useQuery({
    queryKey: ["invoices", cid],
    enabled: !!cid,
    queryFn: async () =>
      (
        await supabase
          .from("invoices")
          .select("*, customers(name, phone)")
          .eq("company_id", cid!)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const enriched = useMemo(
    () =>
      data.map((inv: any) => ({
        ...inv,
        effectiveStatus: isOverdue(inv) ? "overdue" : inv.status,
      })),
    [data],
  );

  const filtered = useMemo(() => {
    const search = localQ.trim().toLowerCase();
    let r = enriched.filter((it: any) => {
      if (status !== "all" && it.effectiveStatus !== status) return false;
      if (!search) return true;
      return (
        it.invoice_number?.toLowerCase().includes(search) ||
        it.customers?.name?.toLowerCase().includes(search) ||
        it.customers?.phone?.includes(search)
      );
    });
    r = [...r];
    if (sort === "old") r.sort((a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at));
    else if (sort === "high") r.sort((a: any, b: any) => Number(b.total) - Number(a.total));
    else if (sort === "overdue")
      r.sort((a: any, b: any) => {
        const da = a.due_date ? +new Date(a.due_date) : Infinity;
        const db = b.due_date ? +new Date(b.due_date) : Infinity;
        return da - db;
      });
    return r;
  }, [enriched, status, sort, localQ]);

  const setSearch = (patch: Partial<{ status: string; sort: string; q: string }>) =>
    nav({ to: "/invoices", search: (prev: any) => ({ ...prev, ...patch }) });

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Numéro, client, téléphone…"
            value={localQ}
            onChange={(e) => {
              setLocalQ(e.target.value);
              setSearch({ q: e.target.value });
            }}
            className="pl-9"
          />
        </div>
        <Link to="/quotes" search={{ status: "accepted", sort: "new", q: "" }}>
          <Button variant="outline">Voir devis acceptés</Button>
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={status} onValueChange={(v) => setSearch({ status: v })}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="unpaid">Non payée</SelectItem>
            <SelectItem value="partial">Partiellement payée</SelectItem>
            <SelectItem value="paid">Payée</SelectItem>
            <SelectItem value="overdue">En retard</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSearch({ sort: v })}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Plus récentes</SelectItem>
            <SelectItem value="old">Plus anciennes</SelectItem>
            <SelectItem value="high">Montant décroissant</SelectItem>
            <SelectItem value="overdue">Échéance la plus proche</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground self-center">{filtered.length} factures</div>
      </div>

      <Card>
        <CardContent className="p-0">
          {!data.length ? (
            <EmptyState
              icon={Receipt}
              title="Aucune facture pour le moment"
              description="Les factures sont créées depuis les devis acceptés."
              action={
                <Link to="/quotes" search={{ status: "accepted", sort: "new", q: "" }}>
                  <Button>Voir devis acceptés</Button>
                </Link>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Aucun résultat"
              description="Aucune facture ne correspond à votre recherche."
            />
          ) : (
            <div className="divide-y">
              {filtered.map((inv: any) => {
                const overdue = inv.effectiveStatus === "overdue";
                const fullyPaid = inv.effectiveStatus === "paid";
                return (
                  <div
                    key={inv.id}
                    role="button"
                    onClick={() => nav({ to: "/invoices/$id", params: { id: inv.id } })}
                    className="flex items-center gap-3 p-4 flex-wrap cursor-pointer hover:bg-muted/30"
                  >
                    <div className="size-10 rounded-md bg-accent/10 text-accent grid place-items-center">
                      <Receipt className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{inv.invoice_number}</span>
                        <Badge className={STATUS[inv.effectiveStatus]?.cls}>
                          {STATUS[inv.effectiveStatus]?.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {inv.customers?.name} • Émise {fmtD(inv.created_at)} • Échéance{" "}
                        <span className={overdue ? "text-destructive font-medium" : ""}>{fmtD(inv.due_date)}</span>
                      </div>
                      <div className="text-xs text-primary mt-0.5">{NEXT_ACTION[inv.effectiveStatus]}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold">{formatTND(inv.total)}</div>
                      <div className="text-xs text-muted-foreground">
                        Payé {formatTND(inv.paid)} • Reste{" "}
                        <span className={overdue ? "text-destructive" : ""}>{formatTND(inv.balance)}</span>
                      </div>
                    </div>
                    {!fullyPaid && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" onClick={() => setPayFor(inv)}>
                          <Plus className="size-4 mr-1" />
                          Paiement
                        </Button>
                      </div>
                    )}
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
