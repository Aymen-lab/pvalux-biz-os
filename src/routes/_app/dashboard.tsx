import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTND } from "@/lib/format";
import { FileText, TrendingUp, AlertCircle, Wallet, Users, Receipt } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — PVALUX" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { profile } = useAuth();
  const cid = profile?.company_id;

  const { data: stats } = useQuery({
    queryKey: ["dashboard", cid],
    enabled: !!cid,
    queryFn: async () => {
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
      const [quotesAll, quotesMonth, invoices, payments] = await Promise.all([
        supabase.from("quotes").select("id,status").eq("company_id", cid!),
        supabase.from("quotes").select("id").eq("company_id", cid!).gte("created_at", start.toISOString()),
        supabase.from("invoices").select("id,status,total,balance,due_date").eq("company_id", cid!),
        supabase.from("payments").select("amount, paid_at, invoice_id, invoices!inner(company_id)").eq("invoices.company_id", cid!).gte("paid_at", start.toISOString().slice(0, 10)),
      ]);
      const accepted = (quotesAll.data ?? []).filter((q) => q.status === "accepted").length;
      const openInv = (invoices.data ?? []).filter((i) => i.status !== "paid");
      const overdueAmt = (invoices.data ?? []).filter((i) => i.due_date && new Date(i.due_date) < new Date() && i.status !== "paid").reduce((s, i) => s + Number(i.balance || 0), 0);
      const cash = (payments.data ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      return {
        monthQuotes: quotesMonth.data?.length ?? 0,
        accepted,
        openCount: openInv.length,
        openAmount: openInv.reduce((s, i) => s + Number(i.balance || 0), 0),
        overdueAmt,
        cash,
      };
    },
  });

  const { data: followups } = useQuery({
    queryKey: ["followups", cid],
    enabled: !!cid,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("invoices").select("id, invoice_number, balance, due_date, customers(name, whatsapp, phone)").eq("company_id", cid!).neq("status", "paid").lte("due_date", today).order("due_date");
      return data ?? [];
    },
  });

  const tiles = [
    { label: "Devis ce mois", value: stats?.monthQuotes ?? 0, icon: FileText, hint: "Nouveaux devis créés" },
    { label: "Devis acceptés", value: stats?.accepted ?? 0, icon: TrendingUp, hint: "Au total" },
    { label: "Factures ouvertes", value: stats?.openCount ?? 0, icon: Receipt, hint: formatTND(stats?.openAmount ?? 0) },
    { label: "Montant en retard", value: formatTND(stats?.overdueAmt ?? 0), icon: AlertCircle, hint: "À relancer" },
    { label: "Encaissé ce mois", value: formatTND(stats?.cash ?? 0), icon: Wallet, hint: "Paiements reçus" },
    { label: "Clients à relancer", value: followups?.length ?? 0, icon: Users, hint: "Aujourd'hui" },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.label} className="border-border/60">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.label}</CardTitle>
                <div className="size-9 rounded-md bg-secondary grid place-items-center text-primary"><Icon className="size-4" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-display font-bold">{t.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{t.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Clients à relancer aujourd'hui</CardTitle></CardHeader>
        <CardContent>
          {!followups?.length && <p className="text-sm text-muted-foreground">Aucune relance à faire. 👌</p>}
          <div className="divide-y">
            {followups?.map((f: any) => (
              <Link key={f.id} to="/invoices" className="flex items-center justify-between py-3 hover:bg-muted/40 px-2 rounded">
                <div>
                  <div className="font-medium">{f.customers?.name}</div>
                  <div className="text-xs text-muted-foreground">{f.invoice_number} • Échéance {new Date(f.due_date).toLocaleDateString("fr-FR")}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-accent">{formatTND(f.balance)}</div>
                  <div className="text-xs text-muted-foreground">{f.customers?.whatsapp || f.customers?.phone}</div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
