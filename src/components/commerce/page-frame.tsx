import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageFrame({
  title,
  introduction,
  displayTitle = false,
  layout = "editorial",
  children
}: {
  title: string;
  introduction?: string;
  displayTitle?: boolean;
  layout?: "editorial" | "wide";
  children?: ReactNode;
}) {
  return (
    <main className={cn("min-h-[70svh] px-gutter pt-32 pb-24 text-foreground sm:pt-40",
      layout === "editorial" && "lg:grid lg:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.6fr)] lg:items-start lg:gap-16 min-[120rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]")}>
      <header className={cn("mb-10 min-w-0 border-b border-border pb-8",
        layout === "editorial" && "lg:mb-0")}>
        <h1 className={cn("text-3xl tracking-tight sm:text-5xl", displayTitle ? "font-display font-normal" : "font-heading")}>{title}</h1>
        {introduction && <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{introduction}</p>}
      </header>
      <div className="min-w-0">{children}</div>
    </main>
  );
}
