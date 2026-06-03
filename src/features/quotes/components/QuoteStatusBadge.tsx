import { Badge } from "@/components/ui/badge";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "../types";

const CLS: Record<QuoteStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  follow_up: "bg-warning/15 text-warning",
  accepted: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
};

export function QuoteStatusBadge({ status }: { status: string }) {
  const s = status as QuoteStatus;
  return <Badge className={CLS[s]}>{QUOTE_STATUS_LABELS[s] ?? status}</Badge>;
}
