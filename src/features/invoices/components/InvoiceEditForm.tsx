import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { invoiceEditSchema } from "../schemas";
import type { InvoiceEditValues } from "../types";

interface Props {
  initial: { due_date: string | null; notes: string | null; status: string; paid: number | string };
  busy?: boolean;
  onSubmit: (v: InvoiceEditValues) => Promise<void> | void;
  onCancel: () => void;
}

export function InvoiceEditForm({ initial, busy, onSubmit, onCancel }: Props) {
  const [due, setDue] = useState<Date | undefined>(initial.due_date ? new Date(initial.due_date) : undefined);
  const [notes, setNotes] = useState(initial.notes ?? "");

  const isPaidOrPartial = initial.status === "paid" || Number(initial.paid) > 0;

  const submit = async () => {
    const payload: InvoiceEditValues = {
      due_date: due ? format(due, "yyyy-MM-dd") : null,
      notes,
    };
    const parsed = invoiceEditSchema.safeParse(payload);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Données invalides");
    if (isPaidOrPartial) {
      if (!window.confirm("Cette facture a déjà reçu un paiement. Seuls la date d'échéance et les notes seront modifiées. Continuer ?")) return;
    }
    await onSubmit(payload);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <Alert>
        <AlertTriangle className="size-4" />
        <AlertTitle>Modification limitée</AlertTitle>
        <AlertDescription>
          Le total, les paiements et le numéro de facture ne peuvent pas être modifiés ici.
          Vous pouvez ajuster la date d'échéance et les notes.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader><CardTitle className="text-base">Champs modifiables</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Date d'échéance</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !due && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 size-4" />
                  {due ? format(due, "dd/MM/yyyy", { locale: fr }) : "Aucune"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={due} onSelect={(d) => setDue(d ?? undefined)} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>Annuler</Button>
        <Button onClick={submit} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
      </div>
    </div>
  );
}
