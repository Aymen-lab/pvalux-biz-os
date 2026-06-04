import type { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6 gap-3">
      {Icon && (
        <div className="size-12 rounded-full bg-muted grid place-items-center text-muted-foreground">
          <Icon className="size-5" />
        </div>
      )}
      <div className="font-display font-semibold">{title}</div>
      {description && <p className="text-sm text-muted-foreground max-w-md">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
