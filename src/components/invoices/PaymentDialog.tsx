import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatTND } from "@/lib/format";

export interface PaymentRecord {
  id: string;
  amount: number;
  paid_at: string;
  method: string | null;
  notes: string | null;
}

interface Props {
  invoice: { id: string; total: number; paid: number };
  payment?: PaymentRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const METHODS = ["Espèces", "Chèque", "Virement bancaire", "Traite", "Carte bancaire", "Autre"];

export function PaymentDialog({ invoice, payment, open, onOpenChange, onSuccess }: Props) {
  const qc = useQueryClient();
  const isEdit = !!payment;
  const ceiling = isEdit
    ? Number(invoice.total) - (Number(invoice.paid) - Number(payment!.amount))
    : Number(invoice.total) - Number(invoice.paid);

  const [amount, setAmount] = useState<number>(0);
  const [paidAt, setPaidAt] = useState<Date>(new Date());
  const [method, setMethod] = useState<string>("Espèces");
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (payment) {
      setAmount(Number(payment.amount));
      setPaidAt(new Date(payment.paid_at));
      setMethod(payment.method ?? "Espèces");
      setNote(payment.notes ?? "");
    } else {
      setAmount(Math.max(0, Number(invoice.total) - Number(invoice.paid)));
      setPaidAt(new Date());
      setMethod("Espèces");
      setNote("");
    }
    setError(null);
  }, [open, payment, invoice.total, invoice.paid]);

  const validate = () => {
    if (!amount || amount <= 0) return "Le montant doit être supérieur à 0";
    if (amount > ceiling + 0.0001) return `Le montant dépasse le reste à payer (${formatTND(ceiling)})`;
    return null;
  };

  const save = async () => {
    const v = validate();
    if (v) return setError(v);
    setBusy(true);
    const paid_at = format(paidAt, "yyyy-MM-dd");
    const { error: err } = isEdit
      ? await supabase.from("payments").update({ amount, paid_at, method, notes: note }).eq("id", payment!.id)
      : await supabase.from("payments").insert({ invoice_id: invoice.id, amount, paid_at, method, notes: note });
    setBusy(false);
    if (err) return toast.error(err.message);
    toast.success("Paiement enregistré");
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["invoice", invoice.id] });
    qc.invalidateQueries({ queryKey: ["payments", invoice.id] });
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le paiement" : "Enregistrer un paiement"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Montant (TND)</Label>
            <Input type="number" step="0.001" value={amount} onChange={(e) => { setAmount(+e.target.value); setError(null); }} />
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            {!error && <p className="text-xs text-muted-foreground mt-1">Reste à payer : {formatTND(ceiling)}</p>}
          </div>
          <div>
            <Label>Date du paiement</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !paidAt && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 size-4" />
                  {paidAt ? format(paidAt, "dd/MM/yyyy", { locale: fr }) : "Sélectionner"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={paidAt} onSelect={(d) => d && setPaidAt(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Méthode</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Note (optionnel)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
