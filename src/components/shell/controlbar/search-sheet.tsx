"use client";
import { Button } from "@/components/core/Button";

import { useTranslations } from "next-intl";
import * as m from "motion/react-m";
import { ArrowRight, Search as SearchIcon, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Drawer } from "vaul";
import { Link } from "@/components/core/Link/Link";
import { siteLayer } from "@/constants/site-layers";
import { useRPStore } from "@/providers/RP_Pro";
import { DISCOVER, START } from "../header-panels";
import { useAccountSheetTrigger } from "@/components/auth/use-account-sheet";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { reachableHref } from "@/lib/content/essays";

type SearchPost = { slug: string; title: string; dek: string };

/**
 * The Hideaway's full-screen search sheet (UX/SearchSheet), opened from the Controlbar's Search pill. A
 * modal Vaul sheet without drag-to-dismiss (a swipe would compete with scrolling the results); the ×
 * and Escape close it. It searches what the header's Search does: the page's posts, filtered here, with
 * the header's empty-query rows (header-panels.tsx). The site has no search API, recents or results page,
 * so The Hideaway's fetch, recents and "view all" have no counterpart.
 */
export function SearchSheet({ posts, returnFocus }: { posts: SearchPost[]; returnFocus: RefObject<HTMLElement | null> }) {
  const t = useTranslations("Customer.components_shell_header_panels");
  const open = useRPStore((state) => state.searchSheetOpen);
  const setOpen = useRPStore((state) => state.setSearchSheetOpen);
  const setSideDrawerOpen = useRPStore((state) => state.setSideDrawerOpen);
  const setControlbarView = useRPStore((state) => state.setControlbarView);
  // Closed because the site menu opened: the strip is inert under it, so focus stays with the menu.
  const menuOpen = useRPStore((state) => state.navIsOpen);

  // The sheet is its own surface: opening it closes the drawer, back at its default view.
  useEffect(() => {
    if (!open) return;
    setSideDrawerOpen(false);
    setControlbarView("default");
  }, [open, setSideDrawerOpen, setControlbarView]);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} direction="bottom" modal dismissible={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-background/40 backdrop-blur-md" style={{ zIndex: siteLayer.searchSheet }} />
        <Drawer.Content
          aria-describedby={undefined}
          // Not dismissible, so Vaul ignores Escape; the site's surfaces close on it.
          onEscapeKeyDown={() => setOpen(false)}
          onCloseAutoFocus={(event) => {
            const trigger = returnFocus.current;
            if (menuOpen) {
              event.preventDefault();
              return;
            }
            if (!trigger?.isConnected) return;
            event.preventDefault();
            trigger.focus({ preventScroll: true });
          }}
          className="fixed inset-x-0 bottom-0 flex h-[100dvh] w-full flex-col bg-background text-foreground outline-none"
          style={{ zIndex: siteLayer.searchSheet }}
        >
          <Drawer.Title className="sr-only">{t("search")}</Drawer.Title>
          <SheetBody posts={posts} onClose={() => setOpen(false)} />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function SheetBody({ posts, onClose }: { posts: SearchPost[]; onClose: () => void }) {
  const t = useTranslations("Customer.components_shell_header_panels");
  const rows = useTranslations("Customer.panelRows");
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const query = value.trim();

  // Focus the field once the sheet has started to rise: iOS Safari doesn't raise the keyboard for a field
  // focused mid-translate (The Hideaway's 60ms).
  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, []);

  const results = useMemo(() => {
    const needle = query.toLowerCase();
    if (!needle) return [];
    return posts.filter((post) => `${post.title} ${post.dek}`.toLowerCase().includes(needle)).slice(0, 10);
  }, [posts, query]);
  // Results lead to essays; none show while the site has them switched off (src/lib/content/essays.ts).
  const reachableResults = results.filter((post) => reachableHref(`/essays/${post.slug}`) !== undefined);

  return (
    <>
      {/* Close on the left (Sophomores' interaction default); The Hideaway has it on the right. */}
      <div className="flex items-center gap-1 border-b border-border/20 pt-[calc(env(safe-area-inset-top)+8px)] pr-4 pb-2 pl-1">
        <Button variant="bare"
          type="button"
          onClick={onClose}
          aria-label={t("closeSearch")}
          className="group/focus inline-flex size-12 flex-none items-center justify-center rounded-full text-foreground/70 touch-manipulation transition-colors active:bg-foreground/[0.06]"
        >
          <FocusShape className="flex group-focus-visible/focus:outline-current"><X aria-hidden="true" className="size-5" strokeWidth={1.5} /></FocusShape>
        </Button>
        <SearchIcon aria-hidden="true" className="size-[18px] flex-none text-foreground/55" strokeWidth={1.5} />
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("searchForAnything")}
          aria-label={t("search")}
          className="ml-2 h-12 min-w-0 flex-1 bg-transparent text-base font-light tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
        />
      </div>

      <m.div className="flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+80px)]">
        {query === "" ? (
          <>
            <Section label={t("discover")}>
              {DISCOVER.map((row) => (
                <Row key={row.title} href={row.href} title={rows(row.title)} subtitle={rows(row.hint)} onSelect={onClose} />
              ))}
            </Section>
            <Section label={t("getStarted")}>
              {START.map((row) => (
                <StartRow key={row.title} flow={row.flow} title={rows(row.title)} subtitle={"hint" in row ? rows(row.hint) : undefined} onSelect={onClose} />
              ))}
            </Section>
          </>
        ) : reachableResults.length > 0 ? (
          <Section label={t("results")}>
            {reachableResults.map((post) => (
              <Row key={post.slug} href={`/essays/${post.slug}`} title={post.title} subtitle={post.dek} onSelect={onClose} trailing />
            ))}
          </Section>
        ) : (
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <span aria-hidden="true" className="mb-4 font-sans text-5xl opacity-10">
              ○
            </span>
            <p className="font-sans text-base font-light text-foreground/70">{t("nothingFoundForQuery", { query })}</p>
          </div>
        )}
      </m.div>
    </>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pt-3">
      <div className="px-5 pb-2 font-sans text-[10px] tracking-[0.2em] text-muted-foreground/55 uppercase">{label}</div>
      <ul className="flex flex-col px-2">{children}</ul>
    </div>
  );
}

/** A row is a link (The Hideaway's rows are buttons that push the route); choosing one closes the sheet. */
/** A START row: the sign-in page's href for no-JS and modifier-click, the in-place sheet on a plain click. */
function StartRow({ flow, title, subtitle, onSelect }: { flow: "login" | "signup"; title: string; subtitle?: string; onSelect: () => void }) {
  const signIn = useAccountSheetTrigger(flow);
  return <Row href={signIn.href} onClick={signIn.onClick} title={title} subtitle={subtitle} onSelect={onSelect} />;
}

function Row({
  href,
  title,
  subtitle,
  trailing,
  onSelect,
  onClick
}: {
  href: string;
  title: string;
  subtitle?: string;
  trailing?: boolean;
  onSelect: () => void;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={(event: MouseEvent<HTMLElement>) => { onClick?.(event); onSelect(); }}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left touch-manipulation transition-colors focus-visible:bg-foreground/[0.05] active:bg-foreground/[0.05]"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium tracking-tight text-foreground">{title}</span>
          {subtitle && (
            <span className="truncate font-sans text-[10px] tracking-widest text-muted-foreground/55 uppercase">{subtitle}</span>
          )}
        </span>
        {trailing && <ArrowRight aria-hidden="true" className="size-4 flex-none text-foreground/40" strokeWidth={1.5} />}
      </Link>
    </li>
  );
}
