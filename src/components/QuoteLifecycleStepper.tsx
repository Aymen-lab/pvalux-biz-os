import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = { key: string; label: string };

interface Props {
  status: string; // quote status
  hasInvoice: boolean;
  invoicePaid?: boolean;
}

const STEPS: Step[] = [
  { key: "draft", label: "Brouillon" },
  { key: "sent", label: "Envoyé" },
  { key: "accepted", label: "Accepté" },
  { key: "invoiced", label: "Facturé" },
  { key: "paid", label: "Payé" },
];

function currentIndex(status: string, hasInvoice: boolean, paid: boolean) {
  if (paid) return 4;
  if (hasInvoice) return 3;
  if (status === "accepted") return 2;
  if (status === "sent" || status === "follow_up") return 1;
  return 0;
}

export function QuoteLifecycleStepper({ status, hasInvoice, invoicePaid = false }: Props) {
  const rejected = status === "rejected";
  const idx = currentIndex(status, hasInvoice, invoicePaid);

  if (rejected) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive font-medium">
        Devis refusé
      </div>
    );
  }

  return (
    <ol className="flex items-center gap-1 overflow-x-auto py-1">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <li key={s.key} className="flex items-center gap-1 min-w-0">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap border",
                done && "bg-success/10 text-success border-success/30",
                current && "bg-primary text-primary-foreground border-primary",
                !done && !current && "bg-muted text-muted-foreground border-transparent",
              )}
            >
              <span
                className={cn(
                  "size-4 grid place-items-center rounded-full text-[10px] font-bold",
                  done && "bg-success text-success-foreground",
                  current && "bg-primary-foreground text-primary",
                  !done && !current && "bg-muted-foreground/20",
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              {s.label}
            </div>
            {i < STEPS.length - 1 && <div className="h-px w-3 bg-border shrink-0" />}
          </li>
        );
      })}
    </ol>
  );
}
