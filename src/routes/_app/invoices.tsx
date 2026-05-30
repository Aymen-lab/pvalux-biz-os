import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatTND, formatDate } from "@/lib/format";
import { MessageCircle, Receipt, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateFollowupMessage } from "@/lib/ai.functions";

export const Route = createFileRoute("/_app/invoices")({
  head: () => ({ meta: [{ title: "Factures — PVALUX" }] }),
  component: InvoicesPage,
});

const STATUS: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "Non payée", cls: "bg-muted text-muted-foreground" },
  partial: { label: "Partiel", cls: "bg-warning/15 text-warning" },
  paid: { label: "Payée", cls: "bg-success/15 text-success" },
  overdue: { label: "En retard", cls: "bg-destructive/15 text-destructive" },
};

function InvoicesPage() {
  const { profile } = useAuth();
  const cid = profile?.company_id;
  const qc = useQueryClient();
  const [payFor, setPayFor] = useState<any>(null);
  const [aiFor, setAiFor] = useState<any>(null);

  const { data = [] } = useQuery({
    queryKey: ["invoices", cid],
    enabled: !!cid,
    queryFn: async () => (await supabase.from("invoices").select("*, customers(name, whatsapp, phone)").eq("company_id", cid!).order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-5 max-w-6xl">
      <Card>
        <CardContent className="p-0">
          {!data.length ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Aucune facture. Convertissez un devis accepté.</div>
          ) : (
            <div className="divide-y">
              {data.map((inv: any) => (
                <div key={inv.id} className="flex items-center gap-3 p-4 flex-wrap">
                  <div className="size-10 rounded-md bg-accent/10 text-accent grid place-items-center"><Receipt className="size-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{inv.invoice_number}</span>
                      <Badge className={STATUS[inv.status]?.cls}>{STATUS[inv.status]?.label}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{inv.customers?.name} • Échéance {formatDate(inv.due_date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatTND(inv.total)}</div>
                    <div className="text-xs text-muted-foreground">Reste {formatTND(inv.balance)}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setAiFor(inv)}><Sparkles className="size-4" /></Button>
                    <Button size="sm" onClick={() => setPayFor(inv)}>Paiement</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        {payFor && <PaymentDialog inv={payFor} onSaved={() => { setPayFor(null); qc.invalidateQueries({ queryKey: ["invoices"] }); }} />}
      </Dialog>

      <Dialog open={!!aiFor} onOpenChange={(o) => !o && setAiFor(null)}>
        {aiFor && <AIDialog inv={aiFor} onClose={() => setAiFor(null)} />}
      </Dialog>
    </div>
  );
}

function PaymentDialog({ inv, onSaved }: { inv: any; onSaved: () => void }) {
  const [amount, setAmount] = useState<number>(Number(inv.balance));
  const [method, setMethod] = useState("Espèces");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("payments").insert({ invoice_id: inv.id, amount, method });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Paiement enregistré");
    onSaved();
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Enregistrer un paiement — {inv.invoice_number}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div><Label>Montant (TND)</Label><Input type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} /></div>
        <div><Label>Méthode</Label><Input value={method} onChange={(e) => setMethod(e.target.value)} /></div>
        <p className="text-xs text-muted-foreground">Reste à payer : {formatTND(inv.balance)}</p>
      </div>
      <DialogFooter><Button onClick={save} disabled={busy}>Enregistrer</Button></DialogFooter>
    </DialogContent>
  );
}

function AIDialog({ inv, onClose }: { inv: any; onClose: () => void }) {
  const [tone, setTone] = useState<"friendly" | "firm" | "final">("friendly");
  const [lang, setLang] = useState<"fr" | "ar" | "ar_tn" | "en">("fr");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const gen = async () => {
    setBusy(true);
    try {
      const r = await generateFollowupMessage({ data: { tone, language: lang, customerName: inv.customers?.name ?? "Client", invoiceNumber: inv.invoice_number, amount: Number(inv.balance), dueDate: inv.due_date } });
      setMsg(r.message);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const send = () => {
    const phone = (inv.customers?.whatsapp || inv.customers?.phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    onClose();
  };
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Relance IA — {inv.invoice_number}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Ton</Label>
            <select value={tone} onChange={(e) => setTone(e.target.value as any)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="friendly">Amical</option><option value="firm">Ferme</option><option value="final">Dernier rappel</option>
            </select>
          </div>
          <div><Label>Langue</Label>
            <select value={lang} onChange={(e) => setLang(e.target.value as any)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="fr">Français</option><option value="ar_tn">Arabe tunisien</option><option value="ar">Arabe</option><option value="en">English</option>
            </select>
          </div>
        </div>
        <Button variant="outline" onClick={gen} disabled={busy}><Sparkles className="size-4 mr-2" />{busy ? "Génération…" : "Générer le message"}</Button>
        <textarea className="w-full min-h-40 rounded-md border bg-background p-3 text-sm" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Le message apparaîtra ici. Vérifiez avant d'envoyer." />
      </div>
      <DialogFooter><Button onClick={send} disabled={!msg}><MessageCircle className="size-4 mr-2" />Envoyer via WhatsApp</Button></DialogFooter>
    </DialogContent>
  );
}
