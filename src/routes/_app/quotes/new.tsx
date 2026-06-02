import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, PRODUCT_TYPES, UNITS, formatTND, lineTotal } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/quotes/new")({
  head: () => ({ meta: [{ title: "Nouveau devis — PVALUX" }] }),
  component: NewQuote,
});

type Line = {
  category: string; product_type: string; description: string;
  width: number; height: number; quantity: number; unit: string; unit_price: number;
};

const empty = (): Line => ({ category: "Cuisine", product_type: "fenetres", description: "", width: 0, height: 0, quantity: 1, unit: "m2", unit_price: 0 });

function NewQuote() {
  const { profile, user } = useAuth();
  const cid = profile?.company_id;
  const nav = useNavigate();

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", cid],
    enabled: !!cid,
    queryFn: async () => (await supabase.from("customers").select("id,name").eq("company_id", cid!).order("name")).data ?? [],
  });

  const [customerId, setCustomerId] = useState("");
  const [project, setProject] = useState("");
  const [notes, setNotes] = useState("");
  const [conditions, setConditions] = useState("Devis valable 30 jours. Acompte 50% à la commande.");
  const [discount, setDiscount] = useState(0);
  const [transport, setTransport] = useState(0);
  const [installation, setInstallation] = useState(0);
  const [taxRate, setTaxRate] = useState(19);
  const [lines, setLines] = useState<Line[]>([empty()]);
  const [busy, setBusy] = useState(false);

  const totals = useMemo(() => {
    const lineTotals = lines.map((l) => lineTotal(l.width, l.height, l.quantity, l.unit_price, l.unit));
    const subtotal = lineTotals.reduce((a, b) => a + b, 0);
    const base = subtotal - Number(discount || 0) + Number(transport || 0) + Number(installation || 0);
    const taxAmount = base * (Number(taxRate || 0) / 100);
    return { lineTotals, subtotal, base, taxAmount, total: base + taxAmount };
  }, [lines, discount, transport, installation, taxRate]);

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const save = async () => {
    if (!customerId) return toast.error("Sélectionnez un client");
    if (!cid) return;
    if (lines.length === 0) return toast.error("Ajoutez au moins une ligne");
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_quote_with_lines", {
        _company_id: cid,
        _customer_id: customerId,
        _project_name: project || "",
        _discount: Number(discount) || 0,
        _transport: Number(transport) || 0,
        _installation: Number(installation) || 0,
        _tax_rate: Number(taxRate) || 0,
        _notes: notes || "",
        _conditions: conditions || "",
        _lines: lines.map((l) => ({
          category: l.category,
          product_type: l.product_type,
          description: l.description,
          width: l.width,
          height: l.height,
          quantity: l.quantity,
          unit: l.unit,
          unit_price: l.unit_price,
        })) as any,
      });
      if (error) throw error;
      const result = data as { id: string; quote_number: string };
      toast.success(`Devis ${result.quote_number} créé`);
      nav({ to: "/quotes/$id", params: { id: result.id } });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Client *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
              <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Projet</Label><Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Ex: Villa Sidi Bou Saïd" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lignes</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setLines([...lines, empty()])}><Plus className="size-4 mr-1" />Ajouter</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((l, i) => (
            <div key={i} className="grid gap-2 p-3 rounded-lg border bg-muted/30">
              <div className="grid sm:grid-cols-3 gap-2">
                <Select value={l.category} onValueChange={(v) => setLine(i, { category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={l.product_type} onValueChange={(v) => setLine(i, { product_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRODUCT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={l.unit} onValueChange={(v) => setLine(i, { unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(UNITS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input placeholder="Description" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div><Label className="text-xs">Largeur (m)</Label><Input type="number" value={l.width} onChange={(e) => setLine(i, { width: +e.target.value })} /></div>
                <div><Label className="text-xs">Hauteur (m)</Label><Input type="number" value={l.height} onChange={(e) => setLine(i, { height: +e.target.value })} /></div>
                <div><Label className="text-xs">Qté</Label><Input type="number" value={l.quantity} onChange={(e) => setLine(i, { quantity: +e.target.value })} /></div>
                <div><Label className="text-xs">PU</Label><Input type="number" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: +e.target.value })} /></div>
                <div className="flex items-end gap-1">
                  <div className="flex-1 text-right font-semibold pb-2">{formatTND(totals.lineTotals[i])}</div>
                  <button onClick={() => setLines(lines.filter((_, idx) => idx !== i))} className="size-9 grid place-items-center rounded hover:bg-destructive/10 text-destructive"><Trash2 className="size-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Totaux & conditions</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Remise (TND)</Label><Input type="number" value={discount} onChange={(e) => setDiscount(+e.target.value)} /></div>
              <div><Label className="text-xs">Transport</Label><Input type="number" value={transport} onChange={(e) => setTransport(+e.target.value)} /></div>
              <div><Label className="text-xs">Pose</Label><Input type="number" value={installation} onChange={(e) => setInstallation(+e.target.value)} /></div>
              <div><Label className="text-xs">TVA %</Label><Input type="number" value={taxRate} onChange={(e) => setTaxRate(+e.target.value)} /></div>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <div><Label>Conditions</Label><Textarea rows={2} value={conditions} onChange={(e) => setConditions(e.target.value)} /></div>
          </div>
          <div className="space-y-2 text-sm bg-muted/40 rounded-lg p-4">
            <div className="flex justify-between"><span>Sous-total</span><span>{formatTND(totals.subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Remise</span><span>-{formatTND(discount)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Transport + Pose</span><span>{formatTND(Number(transport) + Number(installation))}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>TVA ({taxRate}%)</span><span>{formatTND(totals.taxAmount)}</span></div>
            <div className="flex justify-between text-lg font-bold font-display pt-2 border-t mt-2"><span>Total TTC</span><span className="text-accent">{formatTND(totals.total)}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => nav({ to: "/quotes" })}>Annuler</Button><Button onClick={save} disabled={busy}>Créer le devis</Button></div>
    </div>
  );
}
