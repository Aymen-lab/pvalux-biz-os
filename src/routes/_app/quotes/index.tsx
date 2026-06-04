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
import { formatTND, formatDate } from "@/lib/format";
import { Plus, FileText, Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

const searchSchema = z.object({
  status: fallback(z.enum(["all", "draft", "sent", "follow_up", "accepted", "rejected"]), "all").default("all"),
  sort: fallback(z.enum(["new", "old", "high", "low"]), "new").default("new"),
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_app/quotes/")({
  head: () => ({ meta: [{ title: "Devis — PVALUX" }] }),
  validateSearch: zodValidator(searchSchema),
  component: QuotesList,
});

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-muted text-muted-foreground" },
  sent: { label: "Envoyé", cls: "bg-primary/10 text-primary" },
  follow_up: { label: "Relance", cls: "bg-warning/15 text-warning" },
  accepted: { label: "Accepté", cls: "bg-success/15 text-success" },
  rejected: { label: "Refusé", cls: "bg-destructive/15 text-destructive" },
};

const NEXT_ACTION: Record<string, string> = {
  draft: "À envoyer au client",
  sent: "En attente de réponse",
  follow_up: "Relancer le client",
  accepted: "Créer la facture",
  rejected: "Clôturé",
};

function QuotesList() {
  const { profile } = useAuth();
  const cid = profile?.company_id;
  const nav = useNavigate();
  const { status, sort, q } = Route.useSearch();
  const [localQ, setLocalQ] = useState(q);

  const { data = [] } = useQuery({
    queryKey: ["quotes", cid],
    enabled: !!cid,
    queryFn: async () =>
      (
        await supabase
          .from("quotes")
          .select("*, customers(name, phone), invoices(id)")
          .eq("company_id", cid!)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const filtered = useMemo(() => {
    const search = localQ.trim().toLowerCase();
    let r = data.filter((it: any) => {
      if (status !== "all" && it.status !== status) return false;
      if (!search) return true;
      return (
        it.quote_number?.toLowerCase().includes(search) ||
        it.project_name?.toLowerCase().includes(search) ||
        it.customers?.name?.toLowerCase().includes(search) ||
        it.customers?.phone?.includes(search)
      );
    });
    r = [...r];
    if (sort === "old") r.sort((a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at));
    else if (sort === "high") r.sort((a: any, b: any) => Number(b.total) - Number(a.total));
    else if (sort === "low") r.sort((a: any, b: any) => Number(a.total) - Number(b.total));
    return r;
  }, [data, status, sort, localQ]);

  const setSearch = (patch: Partial<{ status: string; sort: string; q: string }>) =>
    nav({ to: "/quotes", search: (prev: any) => ({ ...prev, ...patch }) });

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Numéro, client, projet, téléphone…"
            value={localQ}
            onChange={(e) => {
              setLocalQ(e.target.value);
              setSearch({ q: e.target.value });
            }}
            className="pl-9"
          />
        </div>
        <Link to="/quotes/new">
          <Button>
            <Plus className="size-4 mr-2" />
            Nouveau devis
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={status} onValueChange={(v) => setSearch({ status: v })}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="sent">Envoyé</SelectItem>
            <SelectItem value="follow_up">En relance</SelectItem>
            <SelectItem value="accepted">Accepté</SelectItem>
            <SelectItem value="rejected">Refusé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSearch({ sort: v })}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Plus récents</SelectItem>
            <SelectItem value="old">Plus anciens</SelectItem>
            <SelectItem value="high">Montant décroissant</SelectItem>
            <SelectItem value="low">Montant croissant</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground self-center">
          {filtered.length} {filtered.length > 1 ? "devis" : "devis"}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {!data.length ? (
            <EmptyState
              icon={FileText}
              title="Aucun devis créé"
              description="Commencez par créer un devis pour un client existant."
              action={
                <Link to="/quotes/new">
                  <Button>
                    <Plus className="size-4 mr-2" />
                    Créer un devis
                  </Button>
                </Link>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Aucun résultat"
              description="Aucun devis ne correspond à votre recherche ou filtre."
            />
          ) : (
            <div className="divide-y">
              {filtered.map((q: any) => {
                const hasInv = (q.invoices ?? []).length > 0;
                return (
                  <Link
                    key={q.id}
                    to="/quotes/$id"
                    params={{ id: q.id }}
                    className="flex items-center gap-3 p-4 hover:bg-muted/30"
                  >
                    <div className="size-10 rounded-md bg-primary/10 text-primary grid place-items-center">
                      <FileText className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{q.quote_number}</span>
                        <Badge className={STATUS[q.status]?.cls}>{STATUS[q.status]?.label}</Badge>
                        {hasInv && (
                          <Badge className="bg-accent/15 text-accent">Facturé</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {q.customers?.name} • {q.project_name || "—"} • {formatDate(q.created_at)}
                      </div>
                      <div className="text-xs text-primary mt-0.5">
                        {hasInv ? "Voir la facture" : NEXT_ACTION[q.status]}
                      </div>
                    </div>
                    <div className="font-semibold text-right">{formatTND(q.total)}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
