"use client";

import { noticeFixtures, postFixtures } from "@/lib/content/fixtures";
import type { Notice } from "@/lib/content/slots";
import { applyTheme, nextTheme } from "@/lib/content/theme";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { Link } from "@/components/core/Link/Link";
import { useMemo, useState } from "react";

function PanelRow({ href, title, hint, onClose }: { href: string; title: string; hint?: string; onClose: () => void }) {
  return (
    <Link href={href} className="flex w-full py-2 pr-8 pl-4 text-sm leading-4 text-faded-fg/90 outline-none transition-colors duration-200 hover:text-faded-bg" onClick={onClose}>
      <span className="flex-1 truncate">{title}</span>
      {hint ? <span className="ml-3 text-xs opacity-60">{hint}</span> : null}
    </Link>
  );
}

export function NotificationPanel({
  onClose,
  notices = noticeFixtures
}: {
  onClose: () => void;
  notices?: Notice[];
}) {
  const [items, setItems] = useState(notices);

  return (
    <m.div
      className="header-panel header-panel-notes"
      role="dialog"
      aria-label="Notifications"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <p className="mb-1 text-base font-semibold tracking-[-0.01em]">Notifications</p>
      <div className="flex max-h-[18rem] flex-col gap-2 overflow-auto">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <m.p key="empty" className="flex h-40 items-center justify-center text-sm font-medium" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              You are all caught up!
            </m.p>
          ) : (
            items.map((item) => (
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
                <Link href={item.href ?? "/reading"} onClick={onClose} className="block">
                  <p className="text-base">{item.title}</p>
                  <p className="port-copy mt-1 text-sm">{item.body}</p>
                </Link>
                <button
                  type="button"
                  className="absolute top-2 right-2 text-xs"
                  aria-label="Close notification"
                  onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                >
                  ×
                </button>
              </m.article>
            ))
          )}
        </AnimatePresence>
      </div>
      {items.length > 0 ? (
        <m.div initial={{ opacity: 0, translateY: "50%" }} animate={{ opacity: 1, translateY: "0%" }} transition={{ duration: 0.15, ease: "easeOut" }}>
          <Link href="/reading" className="mt-3 flex w-full justify-center py-1 text-sm" onClick={onClose}>
            See All
          </Link>
        </m.div>
      ) : null}
    </m.div>
  );
}

const ACCOUNT_LINKS = [
  { href: "/reading", title: "Profile" },
  { href: "/reading", title: "Settings" },
  { href: "/reading", title: "Tickets" },
  { href: "/reading", title: "Your Posts" }
] as const;

export function AccountPanel({ onClose }: { onClose: () => void }) {
  return (
    <m.div
      className="header-panel"
      role="menu"
      initial={{ opacity: 0, scaleX: 0.01 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleX: 0.01 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {ACCOUNT_LINKS.map((link) => (
        <PanelRow key={link.title} href={link.href} title={link.title} onClose={onClose} />
      ))}
      <div className="menu-separator" />
      <button type="button" className="flex w-full py-2 pr-8 pl-4 text-sm leading-4 text-faded-fg/90 outline-none" role="menuitem" onClick={onClose}>
        Sign Out
      </button>
    </m.div>
  );
}

const DISCOVER = [
  { href: "/reading", title: "Reading", hint: "Essays" },
  { href: "/", title: "Reception", hint: "Home" }
];
const START = [
  { href: "/sign-in", title: "Sign in" },
  { href: "/reading", title: "Create account", hint: "Get started" }
];

export function SearchPanel({
  onClose,
  posts = postFixtures
}: {
  onClose: () => void;
  posts?: Array<{ slug: string; title: string; dek: string }>;
}) {
  const [query, setQuery] = useState("");
  const theme = typeof document === "undefined" ? "dark" : document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return posts.filter((post) => `${post.title} ${post.dek}`.toLowerCase().includes(needle));
  }, [posts, query]);

  return (
    <m.div
      className="search-dialog"
      role="dialog"
      aria-label="Search"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button type="button" className="search-dialog-scrim" aria-label="Close search" onClick={onClose} />
      <m.div className="search-dialog-panel" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <input className="search-dialog-input" value={query} placeholder="Search for anything…" autoComplete="off" autoCorrect="off" spellCheck={false} onChange={(event) => setQuery(event.target.value)} />
        <div className="mt-2 max-h-[50vh] overflow-auto">
          {query.trim() === "" ? (
            <>
              <SearchGroup heading="Discover" rows={DISCOVER} onClose={onClose} />
              <SearchGroup heading="Get started" rows={START} onClose={onClose} />
              <div className="mt-2">
                <p className="px-3 py-1 text-xs tracking-[0.08em] uppercase opacity-60">Quick actions</p>
                <button
                  type="button"
                  className="flex w-full py-2 pr-8 pl-4 text-sm leading-4 text-faded-fg/90 outline-none"
                  onClick={() => {
                    applyTheme(nextTheme(document.documentElement.getAttribute("data-theme")));
                    onClose();
                  }}
                >
                  Switch to {theme === "light" ? "dark" : "light"} mode
                </button>
              </div>
            </>
          ) : results.length > 0 ? (
            <SearchGroup heading="Results" rows={results.map((post) => ({ href: `/reading/${post.slug}`, title: post.title, hint: post.dek }))} onClose={onClose} />
          ) : (
            <p className="px-4 py-10 text-center text-sm opacity-60">Nothing found for “{query.trim()}”</p>
          )}
        </div>
      </m.div>
    </m.div>
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
