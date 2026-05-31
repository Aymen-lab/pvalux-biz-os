import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatTND, formatDate } from "@/lib/format";
import { generateFollowupMessage } from "@/lib/ai.functions";
import { AlertTriangle, Clock, FileText, MessageCircle, Sparkles, CheckCircle2, History, Flame } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/follow-ups")({
  head: () => ({ meta: [{ title: "Relances — PVALUX" }] }),
  component: FollowUpsPage,
});

type Target = {
  kind: "invoice" | "quote";
  id: string;
  ref: string;
  customer: { id: string; name: string; phone?: string | null; whatsapp?: string | null };
  amount: number;
  partialPaid?: number;
  date: string | null; // due_date or quote created
  daysOverdue: number;
  priority: "high" | "medium" | "low";
  suggested: string;
  latest?: any; // latest follow_up row
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  new: { label: "Nouveau", cls: "bg-muted text-muted-foreground" },
  waiting: { label: "En attente", cls: "bg-secondary text-secondary-foreground" },
  promise: { label: "Promesse", cls: "bg-warning/15 text-warning" },
  partial: { label: "Partiel", cls: "bg-accent/15 text-accent" },
  escalated: { label: "Escaladé", cls: "bg-destructive/15 text-destructive" },
  closed: { label: "Clôturé", cls: "bg-success/15 text-success" },
};

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  high: { label: "Haute", cls: "bg-destructive/15 text-destructive" },
  medium: { label: "Moyenne", cls: "bg-warning/15 text-warning" },
  low: { label: "Basse", cls: "bg-muted text-muted-foreground" },
};

function daysBetween(from: string | null, to = new Date()) {
  if (!from) return 0;
  const ms = to.getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function FollowUpsPage() {
  const { profile } = useAuth();
  const cid = profile?.company_id;
  const qc = useQueryClient();
  const [active, setActive] = useState<Target | null>(null);

  const { data: invoices = [] } = useQuery({
    queryKey: ["fu-invoices", cid],
    enabled: !!cid,
    queryFn: async () =>
      (
        await supabase
          .from("invoices")
          .select("id, invoice_number, total, balance, paid, due_date, status, customers(id,name,phone,whatsapp)")
          .eq("company_id", cid!)
          .neq("status", "paid")
      ).data ?? [],
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["fu-quotes", cid],
    enabled: !!cid,
    queryFn: async () =>
      (
        await supabase
          .from("quotes")
          .select("id, quote_number, total, status, created_at, customers(id,name,phone,whatsapp)")
          .eq("company_id", cid!)
          .eq("status", "sent")
      ).data ?? [],
  });

  const { data: followUps = [] } = useQuery({
    queryKey: ["follow_ups", cid],
    enabled: !!cid,
    queryFn: async () =>
      ((await supabase.from("follow_ups").select("*").eq("company_id", cid!).order("created_at", { ascending: false })).data ?? []) as any[],
  });

  const targets: Target[] = useMemo(() => {
    const latestByKey = new Map<string, any>();
    for (const f of followUps) {
      const k = f.invoice_id ? `i:${f.invoice_id}` : f.quote_id ? `q:${f.quote_id}` : null;
      if (!k) continue;
      if (!latestByKey.has(k)) latestByKey.set(k, f);
    }
    const list: Target[] = [];
    for (const inv of invoices as any[]) {
      const d = daysBetween(inv.due_date);
      const overdue = inv.due_date ? d : 0;
      const priority: Target["priority"] = overdue >= 30 || Number(inv.balance) > 5000 ? "high" : overdue >= 7 ? "medium" : "low";
      const latest = latestByKey.get(`i:${inv.id}`);
      list.push({
        kind: "invoice",
        id: inv.id,
        ref: inv.invoice_number,
        customer: inv.customers,
        amount: Number(inv.balance),
        partialPaid: Number(inv.paid),
        date: inv.due_date,
        daysOverdue: overdue,
        priority,
        suggested: overdue >= 30 ? "Dernier rappel — escalade" : overdue >= 7 ? "Relance ferme" : overdue > 0 ? "Relance amicale" : "Rappel d'échéance",
        latest,
      });
    }
    for (const q of quotes as any[]) {
      const d = daysBetween(q.created_at);
      if (d < 2) continue; // too recent
      const priority: Target["priority"] = d >= 14 ? "high" : d >= 7 ? "medium" : "low";
      const latest = latestByKey.get(`q:${q.id}`);
      list.push({
        kind: "quote",
        id: q.id,
        ref: q.quote_number,
        customer: q.customers,
        amount: Number(q.total),
        date: q.created_at,
        daysOverdue: d,
        priority,
        suggested: d >= 14 ? "Demander une décision" : "Relancer le devis",
        latest,
      });
    }
    return list.sort((a, b) => {
      const pa = { high: 0, medium: 1, low: 2 }[a.priority];
      const pb = { high: 0, medium: 1, low: 2 }[b.priority];
      if (pa !== pb) return pa - pb;
      return b.daysOverdue - a.daysOverdue;
    });
  }, [invoices, quotes, followUps]);

  const today = new Date().toISOString().slice(0, 10);
  const todayList = targets.filter((t) => {
    const f = t.latest;
    if (!f) return t.priority === "high";
    if (f.status === "closed") return false;
    return !f.next_action_date || f.next_action_date <= today;
  });

  const overdueInvoices = targets.filter((t) => t.kind === "invoice" && t.daysOverdue > 0);
  const pendingQuotes = targets.filter((t) => t.kind === "quote");
  const promises = targets.filter((t) => t.latest?.status === "promise");
  const noResponse = targets.filter((t) => t.latest?.status === "waiting");

  const totalAtRisk = targets.reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Flame} label="À faire aujourd'hui" value={`${todayList.length}`} accent />
        <Kpi icon={AlertTriangle} label="Factures en retard" value={`${overdueInvoices.length}`} />
        <Kpi icon={FileText} label="Devis sans réponse" value={`${pendingQuotes.length}`} />
        <Kpi icon={Clock} label="Montant à risque" value={formatTND(totalAtRisk)} />
      </div>

      <Tabs defaultValue="today">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="today">Aujourd'hui ({todayList.length})</TabsTrigger>
          <TabsTrigger value="invoices">Factures ({overdueInvoices.length})</TabsTrigger>
          <TabsTrigger value="quotes">Devis ({pendingQuotes.length})</TabsTrigger>
          <TabsTrigger value="promise">Promesses ({promises.length})</TabsTrigger>
          <TabsTrigger value="waiting">Sans réponse ({noResponse.length})</TabsTrigger>
          <TabsTrigger value="all">Tous ({targets.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="mt-4"><List items={todayList} onPick={setActive} /></TabsContent>
        <TabsContent value="invoices" className="mt-4"><List items={overdueInvoices} onPick={setActive} /></TabsContent>
        <TabsContent value="quotes" className="mt-4"><List items={pendingQuotes} onPick={setActive} /></TabsContent>
        <TabsContent value="promise" className="mt-4"><List items={promises} onPick={setActive} /></TabsContent>
        <TabsContent value="waiting" className="mt-4"><List items={noResponse} onPick={setActive} /></TabsContent>
        <TabsContent value="all" className="mt-4"><List items={targets} onPick={setActive} /></TabsContent>
      </Tabs>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        {active && (
          <FollowUpDialog
            target={active}
            history={followUps.filter((f) => (active.kind === "invoice" ? f.invoice_id === active.id : f.quote_id === active.id))}
            onClose={() => setActive(null)}
            onSaved={() => qc.invalidateQueries({ queryKey: ["follow_ups"] })}
            companyId={cid!}
          />
        )}
      </Dialog>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className={`size-4 ${accent ? "text-accent" : ""}`} />{label}</div>
        <div className="font-display font-bold text-2xl mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function List({ items, onPick }: { items: Target[]; onPick: (t: Target) => void }) {
  if (!items.length) return <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Rien à relancer ici. Tout est sous contrôle ✨</CardContent></Card>;
  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {items.map((t) => (
          <button key={`${t.kind}-${t.id}`} onClick={() => onPick(t)} className="w-full text-left p-4 hover:bg-muted/40 flex items-center gap-3 flex-wrap">
            <div className={`size-10 rounded-md grid place-items-center ${t.kind === "invoice" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"}`}>
              {t.kind === "invoice" ? <AlertTriangle className="size-4" /> : <FileText className="size-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{t.customer?.name ?? "Client"}</span>
                <Badge className={PRIORITY_META[t.priority].cls}>{PRIORITY_META[t.priority].label}</Badge>
                {t.latest && <Badge className={STATUS_META[t.latest.status]?.cls}>{STATUS_META[t.latest.status]?.label}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {t.ref} • {t.kind === "invoice" ? `${t.daysOverdue} j de retard` : `Envoyé il y a ${t.daysOverdue} j`} • {t.suggested}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatTND(t.amount)}</div>
              {t.partialPaid ? <div className="text-[11px] text-muted-foreground">Payé {formatTND(t.partialPaid)}</div> : null}
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function FollowUpDialog({
  target,
  history,
  onClose,
  onSaved,
  companyId,
}: {
  target: Target;
  history: any[];
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
}) {
  const [tone, setTone] = useState<"friendly" | "firm" | "final">(target.priority === "high" ? "firm" : "friendly");
  const [lang, setLang] = useState<"fr" | "ar_tn" | "ar" | "en">("fr");
  const [msg, setMsg] = useState(target.latest?.message ?? "");
  const [status, setStatus] = useState<string>(target.latest?.status ?? "new");
  const [promisedDate, setPromisedDate] = useState<string>(target.latest?.promised_date ?? "");
  const [nextDate, setNextDate] = useState<string>(target.latest?.next_action_date ?? "");
  const [note, setNote] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const gen = async () => {
    setBusy(true);
    try {
      const r = await generateFollowupMessage({
        data: {
          tone, language: lang, kind: target.kind,
          customerName: target.customer?.name ?? "Client",
          invoiceNumber: target.ref,
          amount: target.amount,
          dueDate: target.date,
          daysOverdue: target.kind === "invoice" ? target.daysOverdue : null,
          partialPaid: target.partialPaid ?? null,
          history: history.slice(0, 5).map((h) => ({ date: h.created_at.slice(0, 10), status: h.status, note: h.note })),
        },
      });
      setMsg(r.message);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const persist = async (extra: Partial<any> = {}) => {
    const payload: any = {
      company_id: companyId,
      customer_id: target.customer?.id,
      invoice_id: target.kind === "invoice" ? target.id : null,
      quote_id: target.kind === "quote" ? target.id : null,
      status, language: lang, tone, message: msg, note: note || null,
      promised_date: promisedDate || null,
      next_action_date: nextDate || null,
      ...extra,
    };
    const { error } = await supabase.from("follow_ups").insert(payload);
    if (error) { toast.error(error.message); return false; }
    onSaved();
    return true;
  };

  const sendAndLog = async () => {
    if (!msg.trim()) return toast.error("Aucun message à envoyer");
    const ok = await persist({ sent_at: new Date().toISOString(), status: status === "new" ? "waiting" : status });
    if (!ok) return;
    const phone = (target.customer?.whatsapp || target.customer?.phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    toast.success("Action enregistrée");
    onClose();
  };

  const saveOnly = async () => {
    const ok = await persist();
    if (ok) { toast.success("Suivi enregistré"); onClose(); }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {target.kind === "invoice" ? <AlertTriangle className="size-4 text-destructive" /> : <FileText className="size-4 text-accent" />}
          {target.customer?.name} — {target.ref}
        </DialogTitle>
      </DialogHeader>

      <div className="grid sm:grid-cols-3 gap-2 text-sm bg-muted/40 rounded-md p-3">
        <div><div className="text-xs text-muted-foreground">Montant</div><div className="font-semibold">{formatTND(target.amount)}</div></div>
        <div><div className="text-xs text-muted-foreground">{target.kind === "invoice" ? "Retard" : "Envoyé"}</div><div className="font-semibold">{target.daysOverdue} j</div></div>
        <div><div className="text-xs text-muted-foreground">Priorité</div><Badge className={PRIORITY_META[target.priority].cls}>{PRIORITY_META[target.priority].label}</Badge></div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div><Label>Ton</Label>
          <select value={tone} onChange={(e) => setTone(e.target.value as any)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
            <option value="friendly">Amical</option><option value="firm">Ferme</option><option value="final">Dernier rappel</option>
          </select>
        </div>
        <div><Label>Langue</Label>
          <select value={lang} onChange={(e) => setLang(e.target.value as any)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
            <option value="fr">Français</option><option value="ar_tn">Derja</option><option value="ar">Arabe</option><option value="en">English</option>
          </select>
        </div>
      </div>

      <Button variant="outline" onClick={gen} disabled={busy}><Sparkles className="size-4 mr-2" />{busy ? "Génération…" : "Générer le message IA"}</Button>
      <textarea className="w-full min-h-32 rounded-md border bg-background p-3 text-sm" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Le message apparaîtra ici. Vérifiez avant d'envoyer." />

      <div className="grid sm:grid-cols-3 gap-2">
        <div><Label>Statut</Label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div><Label>Promesse de paiement</Label><Input type="date" value={promisedDate} onChange={(e) => setPromisedDate(e.target.value)} /></div>
        <div><Label>Prochaine relance</Label><Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} /></div>
      </div>
      <div><Label>Note interne</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: client demande facture en PDF" /></div>

      {!!history.length && (
        <div className="border rounded-md">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-1.5 border-b"><History className="size-3.5" />Historique ({history.length})</div>
          <div className="max-h-48 overflow-y-auto divide-y">
            {history.map((h) => (
              <div key={h.id} className="p-3 text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">{formatDate(h.created_at)}</span>
                  <Badge className={STATUS_META[h.status]?.cls}>{STATUS_META[h.status]?.label}</Badge>
                  {h.sent_at && <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="size-3" />Envoyé</span>}
                  {h.promised_date && <span>Promesse: {formatDate(h.promised_date)}</span>}
                </div>
                {h.message && <div className="text-foreground/80 whitespace-pre-wrap line-clamp-3">{h.message}</div>}
                {h.note && <div className="italic text-muted-foreground">📝 {h.note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <DialogFooter className="gap-2 flex-wrap">
        <Button variant="outline" onClick={saveOnly}>Enregistrer le suivi</Button>
        <Button onClick={sendAndLog} disabled={!msg}><MessageCircle className="size-4 mr-2" />Envoyer via WhatsApp</Button>
      </DialogFooter>
    </DialogContent>
  );
}
