import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Centered empty / error / start state. Keeps all pages consistent. */
export function EmptyState({ icon: Icon, title, body, action, className }: EmptyStateProps) {
  return (
    <Card className={`p-8 sm:p-10 text-center space-y-4 ${className ?? ""}`}>
      <div className="bg-stone-100 dark:bg-slate-800 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto">
        <Icon className="h-7 w-7 text-stone-400" aria-hidden="true" />
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        {body && <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-[46ch] mx-auto">{body}</p>}
      </div>
      {action && <div className="flex flex-wrap justify-center gap-2 pt-1">{action}</div>}
    </Card>
  );
}
