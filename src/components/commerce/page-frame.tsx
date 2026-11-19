import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageFrame({
  title,
  introduction,
  displayTitle = false,
  children
}: {
  title: string;
  introduction?: string;
  displayTitle?: boolean;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto min-h-[70svh] max-w-3xl px-6 pt-32 pb-24 text-foreground sm:px-10 sm:pt-40">
      <header className="mb-12 border-b border-border pb-10">
        <h1 className={cn("text-3xl tracking-tight sm:text-5xl", displayTitle ? "font-display font-normal" : "font-heading")}>{title}</h1>
        {introduction && <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{introduction}</p>}
      </header>
      {children}
    </main>
  );
}
