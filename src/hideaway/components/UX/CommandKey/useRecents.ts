"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "rp:cmdk:recents";
const MAX_ENTRIES = 6;

const SKIP_PREFIXES = [
  "/api/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/two-factor",
  "/accept-invitation",
  "/onboarding"
];

const PATH_LABELS: {
  test: (path: string) => boolean;
  render: (path: string) => string;
}[] = [
  { test: (p) => p === "/", render: () => "Reception" },
  { test: (p) => p === "/essays", render: () => "Essays" },
  { test: (p) => p === "/surf", render: () => "Surf" },
  { test: (p) => p === "/radio", render: () => "Radio" },
  { test: (p) => p === "/users", render: () => "Directory" },
  { test: (p) => p === "/plans", render: () => "Membership" },
  { test: (p) => p === "/the-team", render: () => "The Team" },
  { test: (p) => p === "/search", render: () => "Search" },
  { test: (p) => p === "/me/settings", render: () => "Settings" },
  {
    test: (p) => p.startsWith("/me/settings/"),
    render: (p) =>
      `Settings · ${capitalize(p.slice("/me/settings/".length).split("/")[0])}`
  },
  { test: (p) => p === "/me/posts", render: () => "Your Posts" },
  { test: (p) => p === "/me/library/saved", render: () => "Saved" },
  { test: (p) => p === "/me/library/lists", render: () => "My Lists" },
  { test: (p) => p === "/me/inbox", render: () => "Inbox" },
  {
    test: (p) => p.startsWith("/essays/"),
    render: (p) => `Essay · ${humanize(p.slice("/essays/".length))}`
  },
  {
    test: (p) => p.startsWith("/surf/"),
    render: (p) => `Surf · ${humanize(p.slice("/surf/".length))}`
  },
  {
    test: (p) => p.startsWith("/radio/"),
    render: (p) => `Radio · ${humanize(p.slice("/radio/".length))}`
  },
  {
    test: (p) => p.startsWith("/@"),
    render: (p) => `@${p.slice(2).split("/")[0]}`
  }
];

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function humanize(seg: string): string {
  return decodeURIComponent(seg)
    .split("/")[0]
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelForPath(path: string): string {
  for (const entry of PATH_LABELS) {
    if (entry.test(path)) return entry.render(path);
  }
  return path;
}

function shouldSkip(path: string): boolean {
  return SKIP_PREFIXES.some((p) => path.startsWith(p));
}

export type RecentEntry = {
  path: string;
  label: string;
  ts: number;
};

function readStore(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentEntry =>
        e &&
        typeof e.path === "string" &&
        typeof e.label === "string" &&
        typeof e.ts === "number"
    );
  } catch {
    return [];
  }
}

function writeStore(entries: RecentEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // quota or denied — silent
  }
}

export function useRecents(currentPath: string | null): RecentEntry[] {
  const [entries, setEntries] = useState<RecentEntry[]>([]);

  useEffect(() => {
    setEntries(readStore());
  }, []);

  useEffect(() => {
    if (!currentPath || shouldSkip(currentPath)) return;
    const label = labelForPath(currentPath);
    setEntries((prev) => {
      const next: RecentEntry[] = [
        { path: currentPath, label, ts: Date.now() },
        ...prev.filter((e) => e.path !== currentPath)
      ].slice(0, MAX_ENTRIES);
      writeStore(next);
      return next;
    });
  }, [currentPath]);

  return useMemo(
    () => entries.filter((e) => e.path !== currentPath),
    [entries, currentPath]
  );
}

export function useRecentsTracker(): RecentEntry[] {
  const pathname = usePathname();
  return useRecents(pathname);
}
