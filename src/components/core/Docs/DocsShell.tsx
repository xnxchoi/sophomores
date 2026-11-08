import { ReactNode } from "react";

import { Link } from "../Link/Link";
import { TableOfContents } from "@/components/UX/TableOfContents";
import type { TocAnchorItem } from "@/components/UX/TableOfContents";

interface LegalShellProps {
  eyebrow: string;
  title: string;
  lastUpdatedLabel: string;
  lastUpdated: string;
  toc: TocAnchorItem[];
  tocLabel: string;
  relatedLabel: string;
  related: { href: string; label: string }[];
  children: ReactNode;
}

/**
 * Editorial 2-col legal-document layout. Wide column on the left holds the
 * body; sticky right column holds title metadata, the gradient-led table of
 * contents (with scroll-spy), and related links so the page actually uses
 * the screen on xl+.
 */
export function DocsShell({
  eyebrow,
  title,
  lastUpdatedLabel,
  lastUpdated,
  toc,
  tocLabel,
  relatedLabel,
  related,
  children
}: LegalShellProps) {
  return (
    <div className="px-6 pt-[10em] pb-[6em] sm:px-10 sm:pt-[15em] xl:px-16 2xl:px-32">
      <div className="grid grid-cols-1 gap-12 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] xl:gap-24 2xl:gap-32">
        <article className="prose prose-lg max-w-none space-y-[2em] leading-[1.75] opacity-90 prose-neutral xl:prose-xl 2xl:prose-2xl dark:prose-invert">
          <header className="not-prose mb-12 xl:mb-20 2xl:mb-24">
            <p className="font-sans text-xs tracking-widest text-foreground/45 uppercase xl:text-sm">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-5xl leading-[1.05] font-light tracking-tight text-balance xl:text-7xl 2xl:text-8xl">
              {title}
            </h1>
            <p className="mt-8 font-sans text-sm text-foreground/45 xl:text-base">
              {lastUpdatedLabel}
              {lastUpdated}
            </p>
          </header>
          {children}
        </article>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="pl-1 xl:pl-4">
            <p className="pl-5 font-sans text-xs tracking-widest text-foreground/55 uppercase xl:text-sm dark:text-foreground/50">
              {tocLabel}
            </p>
            <TableOfContents
              mode="anchor"
              items={toc}
              ariaLabel={tocLabel}
              className="mt-6"
            />

            {related.length > 0 ? (
              <div className="mt-12 border-t border-border/15 pt-8 pl-5">
                <p className="font-sans text-xs tracking-widest text-foreground/55 uppercase xl:text-sm dark:text-foreground/50">
                  {relatedLabel}
                </p>
                <ul className="mt-5 space-y-3 font-sans text-sm xl:text-base">
                  {related.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-foreground/70 transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
