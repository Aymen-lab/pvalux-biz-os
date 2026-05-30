import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTND, formatDate } from "@/lib/format";
import { Plus, FileText } from "lucide-react";

export const Route = createFileRoute("/_app/quotes/")({
  head: () => ({ meta: [{ title: "Devis — PVALUX" }] }),
  component: QuotesList,
});

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-muted text-muted-foreground" },
  sent: { label: "Envoyé", cls: "bg-primary/10 text-primary" },
  follow_up: { label: "Relance", cls: "bg-warning/15 text-warning" },
  accepted: { label: "Accepté", cls: "bg-success/15 text-success" },
  rejected: { label: "Refusé", cls: "bg-destructive/15 text-destructive" },
};

function QuotesList() {
  const { profile } = useAuth();
  const cid = profile?.company_id;
  const { data = [] } = useQuery({
    queryKey: ["quotes", cid],
    enabled: !!cid,
    queryFn: async () => (await supabase.from("quotes").select("*, customers(name)").eq("company_id", cid!).order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex justify-end">
        <Link to="/quotes/new"><Button><Plus className="size-4 mr-2" />Nouveau devis</Button></Link>
      </div>
      <Card>
        <CardContent className="p-0">
          {!data.length ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Aucun devis. Créez votre premier.</div>
          ) : (
            <div className="divide-y">
              {data.map((q: any) => (
                <Link key={q.id} to="/quotes/$id" params={{ id: q.id }} className="flex items-center gap-3 p-4 hover:bg-muted/30">
                  <div className="size-10 rounded-md bg-primary/10 text-primary grid place-items-center"><FileText className="size-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{q.quote_number}</span>
                      <Badge className={STATUS[q.status]?.cls}>{STATUS[q.status]?.label}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{q.customers?.name} • {q.project_name || "—"} • {formatDate(q.created_at)}</div>
                  </div>
                  <div className="font-semibold text-right">{formatTND(q.total)}</div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
