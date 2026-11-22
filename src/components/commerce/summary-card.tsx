import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The one bordered surface on checkout: the order summary. Everything else sits flat on the page. */
export function SummaryCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 rounded-xl border border-border bg-card p-5 text-card-foreground sm:p-6", className)}>{children}</div>;
}
