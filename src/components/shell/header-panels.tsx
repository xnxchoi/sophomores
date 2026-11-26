"use client";
import { useTranslations } from "next-intl";


import { useNotificationInbox } from "@/components/notifications/notification-inbox";
import type { Notification } from "@/lib/content/slots";
import { useTheme, useThemeLocked } from "@/providers/Theme";
import { AnimatePresence, useIsPresent } from "motion/react";
import * as m from "motion/react-m";
import { Link } from "@/components/core/Link/Link";
import { useAccountSheetTrigger } from "@/components/auth/use-account-sheet";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { FloatingFocusManager, useFloating } from "@floating-ui/react";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { reachableHref } from "@/lib/content/essays";

function PanelRow({ href, title, hint, onClose, onClick }: { href: string; title: string; hint?: string; onClose: () => void; onClick?: (event: MouseEvent<HTMLElement>) => void }) {
  return (
    <Link href={href} className="flex min-h-11 w-full items-center rounded-md py-2 pr-8 pl-4 text-sm leading-4 text-foreground/90 outline-none transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:underline focus-visible:underline-offset-4" onClick={(event: MouseEvent<HTMLElement>) => { onClick?.(event); onClose(); }}>
      <span className="flex-1 truncate">{title}</span>
      {hint ? <span className="ml-3 text-xs opacity-60">{hint}</span> : null}
    </Link>
  );
}

/** Where a body-portalled panel sits (below its button) and its layer. */
type PanelPlace = { top: number; right: number; layer?: number };

export function NotificationPanel({
  onClose,
  notifications = [],
  place
}: {
  onClose: () => void;
  notifications?: Notification[];
  /** From the button when the panel is portalled out of the header, whose clipped pill would hide it. */
  place?: PanelPlace;
}) {
  const t = useTranslations('Customer.components_shell_header_panels');
  const inbox = useNotificationInbox(notifications);
  const [items, setItems] = useState(notifications);
  const visible = inbox.connected ? inbox.unread : items;
  // While it animates out, a closed panel takes no focus or clicks.
  const present = useIsPresent();
  // It renders at the end of the body, so focus moves into it on open; Tab then walks its rows first.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.focus({ preventScroll: true });
  }, []);

  return (
    <m.div
      ref={root}
      tabIndex={-1}
      inert={!present}
      data-header-panel
      style={
        place
          ? {
              position: "fixed",
              top: place.top,
              right: place.right,
              zIndex: place.layer,
              // The room left on screen wins over the list's own minimum size; the list scrolls inside.
              maxHeight: `calc(100dvh - ${place.top}px - 8px)`,
              minHeight: `min(15rem, calc(100dvh - ${place.top}px - 8px))`,
              minWidth: `min(16rem, calc(100vw - ${place.right}px - 8px))`,
              maxWidth: `calc(100vw - ${place.right}px - 8px)`,
              overflowY: "auto"
            }
          : undefined
      }
      className="header-panel header-panel-notes absolute top-[calc(100%+10px)] right-0 z-45 min-w-64 w-[min(25rem,80vw)] min-h-60 rounded-lg bg-[oklch(from_var(--background)_l_c_h_/_0.8)] p-4 px-3 text-[var(--foreground)] backdrop-blur-md"
      role="dialog"
      aria-label={t('notifications')}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <p className="mb-1 text-base font-normal tracking-[-0.01em]">{t('notifications')}</p>
      <div className="flex max-h-[18rem] flex-col gap-2 overflow-auto">
        <AnimatePresence initial={false}>
          {visible.length === 0 ? (
            <m.p key="empty" className="flex h-40 items-center justify-center text-sm font-medium" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {t('youAreAllCaughtUp')}</m.p>
          ) : (
            visible.map((item) => {
              // A row whose link leads into a section the site has switched off (src/lib/content/essays.ts) shows as text.
              const href = reachableHref(item.href ?? "/essays");
              const copy = (
                <>
                  <p className="text-base">{item.title}</p>
                  <p className="port-copy text-[oklch(from_var(--port-shade)_l_c_h_/_0.72)] mt-1 text-sm">{item.body}</p>
                </>
              );
              return (
              <m.article
                key={item.id}
                className="relative overflow-hidden rounded-lg p-4"
                initial={{ translateX: "50%", opacity: 0 }}
                animate={{
                  translateX: "0%",
                  opacity: 1,
                  transition: { type: "spring", damping: 12, mass: 0.5, visualDuration: 0.1 }
                }}
                exit={{ translateX: "-100%" }}
              >
                {href ? (
                  <Link href={href} onClick={onClose} className="block pr-8 focus-visible:underline focus-visible:underline-offset-4">
                    {copy}
                  </Link>
                ) : (
                  <div className="block pr-8">{copy}</div>
                )}
                <button
                  type="button"
                  className="group/focus absolute top-0 right-0 flex size-11 items-center justify-center text-xs"
                  aria-label={t('closeNotification')}
                  onClick={() => {
                    if (inbox.connected) inbox.markRead(item.id);
                    else setItems((current) => current.filter((entry) => entry.id !== item.id));
                    // The focused × goes with its row; focus stays in the list, so Tab continues with the rest.
                    root.current?.focus({ preventScroll: true });
                  }}
                >
                  <FocusShape className="group-focus-visible/focus:outline-current">×</FocusShape>
                </button>
              </m.article>
              );
            })
          )}
        </AnimatePresence>
      </div>
      {visible.length > 0 && reachableHref("/essays") ? (
        <m.div initial={{ opacity: 0, translateY: "50%" }} animate={{ opacity: 1, translateY: "0%" }} transition={{ duration: 0.15, ease: "easeOut" }}>
          <Link href="/essays" className="group/focus mt-3 flex min-h-11 w-full items-center justify-center py-1 text-sm" onClick={onClose}>
            <FocusShape className="group-focus-visible/focus:outline-current">{t('seeAll')}</FocusShape></Link>
        </m.div>
      ) : null}
    </m.div>
  );
}

const ACCOUNT_LINKS = [
  { href: "/read", title: "profile" },
  { href: "/read", title: "settings" },
  { href: "/read", title: "tickets" },
  { href: "/read", title: "yourPosts" }
] as const;

export function AccountPanel({ onClose }: { onClose: () => void }) {
  const rowT = useTranslations('Customer.panelRows');
  const t = useTranslations('Customer.components_shell_header_panels');
  const present = useIsPresent();
  return (
    <m.div
      inert={!present}
      data-header-panel
      className="header-panel absolute top-[calc(100%+10px)] right-0 z-45 min-w-64 rounded-lg bg-[oklch(from_var(--background)_l_c_h_/_0.8)] p-4 px-3 text-[var(--foreground)] backdrop-blur-md"
      role="menu"
      initial={{ opacity: 0, scaleX: 0.01 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleX: 0.01 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {ACCOUNT_LINKS.map((link) => (
        <PanelRow key={link.title} href={link.href} title={rowT(link.title)} onClose={onClose} />
      ))}
      <div className="menu-separator h-px my-1.5 mx-4 bg-gradient-to-r from-[oklch(from_var(--foreground)_l_c_h_/_0.1)] via-[oklch(from_var(--foreground)_l_c_h_/_0.25)] to-[oklch(from_var(--foreground)_l_c_h_/_0.1)]" />
      <button type="button" className="flex w-full py-2 pr-8 pl-4 text-sm leading-4 text-foreground/90 outline-none focus-visible:underline focus-visible:underline-offset-4" role="menuitem" onClick={onClose}>
        {t('signOut')}</button>
    </m.div>
  );
}

/** Search's rows before a query; the Controlbar's search sheet shows the same. */
export const DISCOVER = [
  { href: "/essays", title: "reading", hint: "essays" },
  { href: "/", title: "reception", hint: "home" }
].filter((row) => reachableHref(row.href) !== undefined);
/** Sign in and Create account open the in-place sign-in sheet on that flow (owner, 24 Nov: sign-in buttons toggle it). */
export const START = [
  { flow: "login", title: "signIn" },
  { flow: "signup", title: "createAccount", hint: "getStarted" }
] as const;

/** A START row: the sign-in page's href for no-JS and modifier-click, the sheet on a plain click. */
function StartPanelRow({ flow, title, hint, onClose }: { flow: "login" | "signup"; title: string; hint?: string; onClose: () => void }) {
  const signIn = useAccountSheetTrigger(flow);
  return <PanelRow href={signIn.href} onClick={signIn.onClick} title={title} hint={hint} onClose={onClose} />;
}

export function SearchPanel({
  onClose,
  posts = [],
  layer
}: {
  onClose: () => void;
  posts?: Array<{ slug: string; title: string; dek: string }>;
  /** Its layer when portalled out of the header (above the open header while the menu is open). */
  layer?: number;
}) {
  const rowT = useTranslations('Customer.panelRows');
  const t = useTranslations('Customer.components_shell_header_panels');
  const [query, setQuery] = useState("");
  const theme = useTheme((store) => store.theme);
  const locked = useThemeLocked();
  const toggleTheme = useTheme((store) => store.toggleTheme);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return posts.filter((post) => `${post.title} ${post.dek}`.toLowerCase().includes(needle));
  }, [posts, query]);
  // Results lead to essays; none show while the site has them switched off (src/lib/content/essays.ts).
  const resultRows = results
    .map((post) => ({ href: `/essays/${post.slug}`, title: post.title, hint: post.dek }))
    .filter((row) => reachableHref(row.href) !== undefined);

  const present = useIsPresent();
  // Search is modal: Floating UI's focus manager makes the rest of the page inert (live regions excepted)
  // and its guards wrap Tab and Shift+Tab inside Search. Focus starts in the field. Escape stays with the
  // shell's table, and focus returns through the header's button. The manager lets go as soon as Search
  // starts to close, so that return can happen during the exit; it removes only the attributes it set.
  const { refs, context } = useFloating({ open: present });
  const field = useRef<HTMLInputElement>(null);

  return (
    <FloatingFocusManager context={context} disabled={!present} initialFocus={field} returnFocus={false} outsideElementsInert>
    <m.div
      ref={refs.setFloating}
      inert={!present}
      data-header-panel
      style={layer ? { zIndex: layer } : undefined}
      className="search-dialog fixed inset-0 z-45"
      role="dialog"
      aria-modal="true"
      aria-label={t('search')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button type="button" className="search-dialog-scrim absolute inset-0 bg-[oklch(from_var(--background)_l_c_h_/_0.4)] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-current" aria-label={t('closeSearch')} onClick={onClose} />
      <m.div className="search-dialog-panel relative z-1 w-[min(640px,calc(100%-32px))] mx-auto mt-[12vh] p-2 rounded-xl bg-[var(--background)]" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <input ref={field} className="w-full h-11 border-0 bg-transparent text-inherit text-base tracking-normal outline-none" value={query} placeholder={t('searchForAnything')} autoComplete="off" autoCorrect="off" spellCheck={false} onChange={(event) => setQuery(event.target.value)} />
        <div className="mt-2 max-h-[50vh] overflow-auto">
          {query.trim() === "" ? (
            <>
              <SearchGroup heading={t('discover')} rows={DISCOVER.map((row) => ({ ...row, title: rowT(row.title), hint: rowT(row.hint) }))} onClose={onClose} />
              <div className="mt-2">
                <p className="px-3 py-1 text-xs tracking-[0.08em] uppercase opacity-60">{t('getStarted')}</p>
                {START.map((row) => (
                  <StartPanelRow key={row.title} flow={row.flow} title={rowT(row.title)} hint={"hint" in row ? rowT(row.hint) : undefined} onClose={onClose} />
                ))}
              </div>
              {!locked && <div className="mt-2">
                <p className="px-3 py-1 text-xs tracking-[0.08em] uppercase opacity-60">{t('quickActions')}</p>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center rounded-md py-2 pr-8 pl-4 text-sm leading-4 text-foreground/90 outline-none transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:underline focus-visible:underline-offset-4"
                  onClick={() => {
                    toggleTheme();
                    onClose();
                  }}
                >
                  {theme === 'light' ? t('switchToDarkMode') : t('switchToLightMode')}</button>
              </div>}
            </>
          ) : resultRows.length > 0 ? (
            <SearchGroup heading={t('results')} rows={resultRows} onClose={onClose} />
          ) : (
            <p className="px-4 py-10 text-center text-sm opacity-60">{t('nothingFoundForQuery', { query: query.trim() })}</p>
          )}
        </div>
      </m.div>
    </m.div>
    </FloatingFocusManager>
  );
}

function SearchGroup({
  heading,
  rows,
  onClose
}: {
  heading: string;
  rows: Array<{ href: string; title: string; hint?: string }>;
  onClose: () => void;
}) {
  return (
    <div className="mt-2">
      <p className="px-3 py-1 text-xs tracking-[0.08em] uppercase opacity-60">{heading}</p>
      {rows.map((row) => (
        <PanelRow key={row.title} href={row.href} title={row.title} hint={row.hint} onClose={onClose} />
      ))}
    </div>
  );
}
