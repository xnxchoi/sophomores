import type { ReactNode } from "react";

/**
 * Editorial reading frame for help and policy pages, after Normal Phenomena's post layout: a very large
 * title across the page, a standfirst stepped into the right column, then a reading column in the right
 * half with an optional rail beside it. Everything arrives in one soft CSS fade on the shared motion timing,
 * so text never waits on scripts.
 */
export function EditorialPage({ title, titleId = "page-title", standfirst, lead, rail, children, after }: {
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
    <main className="mx-auto min-h-[70svh] max-w-7xl px-6 pt-32 pb-24 text-foreground sm:px-10 sm:pt-40 xl:px-16">
      {lead && <div className="mb-10 animate-in fade-in fill-mode-both [animation-timing-function:var(--ease-standard)] animation-duration-[var(--duration-spring)]">{lead}</div>}
      <header className="grid gap-6 border-b border-border pb-10 animate-in fade-in slide-in-from-bottom-3 fill-mode-both [animation-timing-function:var(--ease-standard)] animation-duration-[var(--duration-spring)] sm:pb-14 lg:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.6fr)] lg:gap-x-16">
        <h1 id={titleId} className="scroll-mt-28 font-display text-5xl leading-[1.02] font-normal tracking-tight text-balance sm:text-7xl lg:col-span-2 xl:text-8xl">{title}</h1>
        {standfirst && <div className="max-w-[65ch] text-base leading-relaxed text-muted-foreground sm:text-lg lg:col-start-2">{standfirst}</div>}
      </header>
      <div className="grid min-w-0 gap-10 pt-10 sm:pt-14 lg:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.6fr)] lg:gap-x-16">
        {rail && <aside className="min-w-0 animate-in fade-in fill-mode-both [animation-timing-function:var(--ease-standard)] animation-duration-[var(--duration-spring)] lg:sticky lg:top-28 lg:max-h-[calc(100svh-8rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">{rail}</aside>}
        <div className="min-w-0 max-w-[65ch] animate-in fade-in slide-in-from-bottom-2 fill-mode-both [animation-timing-function:var(--ease-standard)] animation-duration-[var(--duration-spring)] lg:col-start-2 lg:row-start-1">{children}</div>
      </div>
      {after}
    </main>
  );
}
