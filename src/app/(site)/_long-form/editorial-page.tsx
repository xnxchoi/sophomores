import type { ReactNode } from "react";
import { PageInset } from "@/components/core/PageInset/PageInset";
import { cn } from "@/lib/utils";

/** The page's title block under the site's one global header: the large title, then the standfirst. */
export function EditorialTitle({ title, titleId = "page-title", standfirst }: {
  title: string;
  titleId?: string;
  standfirst?: ReactNode;
}) {
  return (
    <header className="grid gap-6 border-b border-border pb-10 animate-in fade-in slide-in-from-bottom-3 fill-mode-both [animation-timing-function:var(--ease-standard)] animation-duration-[var(--duration-spring)] sm:pb-14 lg:border-b-0 lg:pb-0">
      <h1 id={titleId} className="scroll-mt-header font-display text-5xl leading-[1.02] font-normal tracking-tight text-balance sm:text-7xl lg:text-6xl">{title}</h1>
      {standfirst && <div className="max-w-[65ch] min-w-0 text-base wrap-anywhere leading-relaxed text-muted-foreground sm:text-lg">{standfirst}</div>}
    </header>
  );
}

/**
 * Editorial frame for Help and its pages, on the shared page inset (owner, 22 Nov: the margin plan). From lg the page
 * is a 12-column grid: the title, standfirst and any contents rail hold columns 1-4 and the body fills columns 5-12,
 * so the right side carries the list instead of a narrow centred column. Below lg they stack. Everything arrives in
 * one soft CSS fade on the shared motion timing, so text never waits on scripts.
 */
export function EditorialPage({
  title,
  titleId = "page-title",
  standfirst,
  lead,
  rail,
  children,
  after
}: {
  title: string;
  /** Kept stable where pages already publish an anchor for their title. */
  titleId?: string;
  standfirst?: ReactNode;
  /** A small link above the title, such as the way back. */
  lead?: ReactNode;
  /** Contents or related links: beside the text on wide screens, above it on narrow ones. */
  rail?: ReactNode;
  children: ReactNode;
  /** Full-width content after the reading grid. */
  after?: ReactNode;
}) {
  return (
    <PageInset as="main" className="min-h-[70svh] pt-32 pb-24 text-foreground sm:pt-40 lg:grid lg:grid-cols-12 lg:gap-x-6">
      {lead && <div className="mb-10 animate-in fade-in fill-mode-both [animation-timing-function:var(--ease-standard)] animation-duration-[var(--duration-spring)] lg:col-span-12">{lead}</div>}
      <div className="min-w-0 lg:col-span-4">
        <EditorialTitle title={title} titleId={titleId} standfirst={standfirst} />
        {rail && <aside data-lenis-prevent-wheel className="mt-10 min-w-0 animate-in fade-in fill-mode-both [animation-timing-function:var(--ease-standard)] animation-duration-[var(--duration-spring)] sm:mt-14 lg:sticky lg:top-header lg:max-h-[calc(100svh_-_var(--spacing-header)_-_1rem)] lg:overflow-y-auto lg:overscroll-contain">{rail}</aside>}
      </div>
      <div className={cn("min-w-0 pt-10 animate-in fade-in slide-in-from-bottom-2 fill-mode-both [animation-timing-function:var(--ease-standard)] animation-duration-[var(--duration-spring)] lg:col-span-8 lg:col-start-5 lg:self-start lg:border-t lg:border-border lg:pt-6", !rail && "sm:pt-14")}>{children}</div>
      {after && <div className="min-w-0 lg:col-span-12">{after}</div>}
    </PageInset>
  );
}
