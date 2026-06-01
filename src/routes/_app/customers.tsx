import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/customers")({
  head: () => ({ meta: [{ title: "Clients — PVALUX" }] }),
  component: CustomersPage,
});

type Cust = { id: string; name: string; phone: string | null; whatsapp: string | null; address: string | null; notes: string | null; status: string; risk_level: string };

const STATUS_LABEL: Record<string, string> = { lead: "Prospect", active: "Actif", inactive: "Inactif" };
const RISK_LABEL: Record<string, string> = { low: "Faible", medium: "Moyen", high: "Élevé" };
const RISK_COLOR: Record<string, string> = { low: "bg-success/15 text-success", medium: "bg-warning/15 text-warning", high: "bg-destructive/15 text-destructive" };

function CustomersPage() {
  const { profile } = useAuth();
  const cid = profile?.company_id;
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cust | null>(null);

  const { data: list = [] } = useQuery({
    queryKey: ["customers", cid],
    enabled: !!cid,
    queryFn: async () => (await supabase.from("customers").select("*").eq("company_id", cid!).order("created_at", { ascending: false })).data as Cust[],
  });

  const filtered = list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone?.includes(q));

  const refresh = () => qc.invalidateQueries({ queryKey: ["customers"] });

  const onDelete = async (id: string) => {
    if (!confirm("Supprimer ce client ?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Supprimé"); refresh(); }
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Input placeholder="Rechercher par nom ou téléphone…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-sm" />
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-2" />Nouveau client</Button></DialogTrigger>
          <CustomerDialog cid={cid!} editing={editing} open={open} onSaved={() => { setOpen(false); setEditing(null); refresh(); }} />
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Aucun client. Ajoutez votre premier.</div>
          ) : (
            <div className="divide-y">
              {filtered.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-4">
                  <div className="size-10 rounded-full bg-primary/10 grid place-items-center font-semibold text-primary">{c.name.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{c.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{STATUS_LABEL[c.status]}</Badge>
                      <span className={`text-[10px] rounded px-1.5 py-0.5 ${RISK_COLOR[c.risk_level]}`}>Risque: {RISK_LABEL[c.risk_level]}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{c.phone || c.whatsapp || "—"} {c.address ? `• ${c.address}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {c.phone && <a href={`tel:${c.phone}`} className="size-8 grid place-items-center rounded hover:bg-muted"><Phone className="size-4" /></a>}
                    {c.whatsapp && <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="size-8 grid place-items-center rounded hover:bg-muted text-success"><MessageCircle className="size-4" /></a>}
                    <button onClick={() => { setEditing(c); setOpen(true); }} className="size-8 grid place-items-center rounded hover:bg-muted"><Pencil className="size-4" /></button>
                    <button onClick={() => onDelete(c.id)} className="size-8 grid place-items-center rounded hover:bg-muted text-destructive"><Trash2 className="size-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const BLANK = { name: "", phone: "", whatsapp: "", address: "", notes: "", status: "lead", risk_level: "low" };

function CustomerDialog({ cid, editing, open, onSaved }: { cid: string; editing: Cust | null; open: boolean; onSaved: () => void }) {
  const [f, setF] = useState<any>(BLANK);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && editing) {
      setF({
        name: editing.name ?? "",
        phone: editing.phone ?? "",
        whatsapp: editing.whatsapp ?? "",
        address: editing.address ?? "",
        notes: editing.notes ?? "",
        status: editing.status ?? "lead",
        risk_level: editing.risk_level ?? "low",
      });
    }
    if (!open) setF(BLANK);
  }, [open, editing]);

  const save = async () => {
    if (!f.name.trim()) return toast.error("Nom requis");
    setBusy(true);
    const payload = { ...f, company_id: cid } as any;
    const op = editing ? supabase.from("customers").update(payload).eq("id", editing.id) : supabase.from("customers").insert(payload);
    const { error } = await op;
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Modifié" : "Client ajouté");
    onSaved();
  };
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{editing ? "Modifier le client" : "Nouveau client"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div><Label>Nom *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Téléphone</Label><Input value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><Label>WhatsApp</Label><Input value={f.whatsapp ?? ""} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="+216…" /></div>
        </div>
        <div><Label>Adresse</Label><Input value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Statut</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Niveau de risque</Label>
            <Select value={f.risk_level} onValueChange={(v) => setF({ ...f, risk_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(RISK_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Notes</Label><Textarea value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={3} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={busy}>{editing ? "Enregistrer" : "Ajouter"}</Button></DialogFooter>
    </DialogContent>
  );
}
