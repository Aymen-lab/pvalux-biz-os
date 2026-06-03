import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { quoteFormSchema } from "../schemas";
import type { QuoteFormValues } from "../types";
import { QuoteLinesEditor, emptyLine } from "./QuoteLinesEditor";
import { QuoteTotalsBox } from "./QuoteTotalsBox";

interface Props {
  mode: "create" | "edit";
  customers: { id: string; name: string }[];
  initial?: Partial<QuoteFormValues>;
  /** Lock financial fields (used when quote already invoiced). */
  financialLocked?: boolean;
  /** Show warning before submit (e.g. accepted/sent quotes). */
  confirmBeforeSave?: string | null;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (v: QuoteFormValues) => Promise<void> | void;
  onCancel: () => void;
}

export function QuoteForm({
  mode, customers, initial, financialLocked, confirmBeforeSave, submitLabel, busy, onSubmit, onCancel,
}: Props) {
  const [v, setV] = useState<QuoteFormValues>({
    customer_id: initial?.customer_id ?? "",
    project_name: initial?.project_name ?? "",
    notes: initial?.notes ?? "",
    conditions: initial?.conditions ?? "Devis valable 30 jours. Acompte 50% à la commande.",
    discount: initial?.discount ?? 0,
    transport: initial?.transport ?? 0,
    installation: initial?.installation ?? 0,
    tax_rate: initial?.tax_rate ?? 19,
    lines: initial?.lines && initial.lines.length > 0 ? initial.lines : [emptyLine()],
  });

  const set = <K extends keyof QuoteFormValues>(k: K, val: QuoteFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  const submit = async () => {
    const parsed = quoteFormSchema.safeParse(v);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return toast.error(issue?.message ?? "Données invalides");
    }
    if (confirmBeforeSave && !window.confirm(confirmBeforeSave)) return;
    await onSubmit(parsed.data as QuoteFormValues);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {financialLocked && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Devis déjà facturé</AlertTitle>
          <AlertDescription>
            Les champs financiers (lignes, remise, transport, pose, TVA, client) sont verrouillés.
            Vous pouvez modifier le nom du projet, les notes et les conditions.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Client *</Label>
            <Select value={v.customer_id} onValueChange={(val) => set("customer_id", val)} disabled={financialLocked}>
              <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Projet</Label><Input value={v.project_name} onChange={(e) => set("project_name", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Lignes</CardTitle></CardHeader>
        <CardContent>
          <QuoteLinesEditor lines={v.lines} onChange={(ls) => set("lines", ls)} disabled={financialLocked} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Totaux & conditions</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Remise (TND)</Label><Input type="number" disabled={financialLocked} value={v.discount} onChange={(e) => set("discount", +e.target.value)} /></div>
              <div><Label className="text-xs">Transport</Label><Input type="number" disabled={financialLocked} value={v.transport} onChange={(e) => set("transport", +e.target.value)} /></div>
              <div><Label className="text-xs">Pose</Label><Input type="number" disabled={financialLocked} value={v.installation} onChange={(e) => set("installation", +e.target.value)} /></div>
              <div><Label className="text-xs">TVA %</Label><Input type="number" disabled={financialLocked} value={v.tax_rate} onChange={(e) => set("tax_rate", +e.target.value)} /></div>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={v.notes} onChange={(e) => set("notes", e.target.value)} /></div>
            <div><Label>Conditions</Label><Textarea rows={2} value={v.conditions} onChange={(e) => set("conditions", e.target.value)} /></div>
          </div>
          <QuoteTotalsBox values={v} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>Annuler</Button>
        <Button onClick={submit} disabled={busy}>{busy ? "Enregistrement…" : submitLabel}</Button>
      </div>
      {mode === "edit" && <p className="text-xs text-muted-foreground text-right">Numéro de devis conservé.</p>}
    </div>
  );
}
