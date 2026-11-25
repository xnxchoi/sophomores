import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageInset } from "@/components/core/PageInset/PageInset";

export function PageFrame({
  title,
  introduction,
  displayTitle = false,
  titleHidden = false,
  layout = "editorial",
  className,
  children
}: {
  title: string;
  introduction?: string;
  displayTitle?: boolean;
  /** The h1 stays for the page outline, but no visible title row (checkout, spec §7). */
  titleHidden?: boolean;
  layout?: "editorial" | "wide";
  /** The page's own additions to the frame, e.g. a taller minimum height (sign-in). */
  className?: string;
  children?: ReactNode;
}) {
  return (
    // Side inset from the shared PageInset (the product page's), so checkout and the other commerce pages match it.
    <PageInset as="main" className={cn("min-h-[70svh] pt-32 pb-24 text-foreground sm:pt-40",
      layout === "editorial" && "lg:grid lg:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.6fr)] lg:items-start lg:gap-16 min-[120rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]", className)}>
      <header className={cn("mb-8 min-w-0 border-b border-foreground pb-3",
        layout === "editorial" && "lg:mb-0", titleHidden && "sr-only")}>
        {/* stripe.press spec §1: page titles at 40px over a solid title rule (§2). */}
        <h1 className={cn("text-[2.5rem] font-normal leading-[1.05] tracking-[-0.02em]", displayTitle ? "font-display" : "font-sans")}>{title}</h1>
        {introduction && <p className="mt-4 max-w-xl text-base leading-6 text-pretty text-muted-foreground">{introduction}</p>}
      </header>
      <div className="min-w-0">{children}</div>
    </PageInset>
  );
}
