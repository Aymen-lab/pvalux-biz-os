import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, PRODUCT_TYPES, UNITS, formatTND, lineTotal } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";
import type { QuoteLineInput } from "../types";

export const emptyLine = (): QuoteLineInput => ({
  category: "Cuisine", product_type: "fenetres", description: "",
  width: 0, height: 0, quantity: 1, unit: "m2", unit_price: 0,
});

interface Props {
  lines: QuoteLineInput[];
  onChange: (lines: QuoteLineInput[]) => void;
  disabled?: boolean;
}

export function QuoteLinesEditor({ lines, onChange, disabled }: Props) {
  const setLine = (i: number, patch: Partial<QuoteLineInput>) =>
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-3">
      {lines.map((l, i) => (
        <div key={i} className="grid gap-2 p-3 rounded-lg border bg-muted/30">
          <div className="grid sm:grid-cols-3 gap-2">
            <Select value={l.category} onValueChange={(v) => setLine(i, { category: v })} disabled={disabled}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={l.product_type} onValueChange={(v) => setLine(i, { product_type: v })} disabled={disabled}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PRODUCT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={l.unit} onValueChange={(v) => setLine(i, { unit: v })} disabled={disabled}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(UNITS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input placeholder="Description" value={l.description} disabled={disabled}
            onChange={(e) => setLine(i, { description: e.target.value })} />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div><Label className="text-xs">Largeur (m)</Label><Input type="number" disabled={disabled} value={l.width} onChange={(e) => setLine(i, { width: +e.target.value })} /></div>
            <div><Label className="text-xs">Hauteur (m)</Label><Input type="number" disabled={disabled} value={l.height} onChange={(e) => setLine(i, { height: +e.target.value })} /></div>
            <div><Label className="text-xs">Qté</Label><Input type="number" disabled={disabled} value={l.quantity} onChange={(e) => setLine(i, { quantity: +e.target.value })} /></div>
            <div><Label className="text-xs">PU</Label><Input type="number" disabled={disabled} value={l.unit_price} onChange={(e) => setLine(i, { unit_price: +e.target.value })} /></div>
            <div className="flex items-end gap-1">
              <div className="flex-1 text-right font-semibold pb-2">{formatTND(lineTotal(l.width, l.height, l.quantity, l.unit_price, l.unit))}</div>
              <button type="button" disabled={disabled} onClick={() => onChange(lines.filter((_, idx) => idx !== i))}
                className="size-9 grid place-items-center rounded hover:bg-destructive/10 text-destructive disabled:opacity-40">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
      {!disabled && (
        <Button size="sm" variant="outline" type="button" onClick={() => onChange([...lines, emptyLine()])}>
          <Plus className="size-4 mr-1" />Ajouter une ligne
        </Button>
      )}
    </div>
  );
}
