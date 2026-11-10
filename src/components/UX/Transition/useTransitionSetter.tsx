"use client";

import { useRPStore } from "@/providers/RP_Pro";
import { useTransitionRouter } from "next-transition-router";
import { usePathname } from "next/navigation";
import { startTransition, useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/shallow";
import type { PageTransitionType } from "./index";

type TransitionSetOptions = {
  override?: PageTransitionType | null;
};

const scheduleTransitionPush = (work: () => void) => {
  requestAnimationFrame(() => {
    startTransition(work);
  });
};

export const useTransitionSetter = () => {
  const navisopref = useRef(false);
  const currentPathRef = useRef("/");
  const setTransitionOutType = useRPStore((l) => l.setTransitionOutType),
    setNavigationPageItemSelected = useRPStore(
      (l) => l.setNavigationPageItemSelected
    ),
    setIsTransitioningWipe = useRPStore((l) => l.setIsTransitioningWipe),
    router = useTransitionRouter(),
    navIsOpen = useRPStore(useShallow((l) => l.navIsOpen));
  const currentPath = usePathname();
  useEffect(() => {
    navisopref.current = navIsOpen;
  }, [navIsOpen]);
  useEffect(() => {
    currentPathRef.current = currentPath || "/";
  }, [currentPath]);

  const setGenericPageTransition = useCallback(
    (
      targetHref?: string,
      options?: TransitionSetOptions
    ): TransitionDecision => {
      const fromHref = currentPathRef.current;
      const toHref = targetHref ?? fromHref;
      const decision = pickTransitionType({
        fromHref,
        toHref,
        navIsOpen: navisopref.current,
        override: options?.override ?? null
      });
      setTransitionOutType(decision.type);
      setIsTransitioningWipe(decision.type === "CURTAIN");
      setNavigationPageItemSelected(-1);
      return decision;
    },
    [
      setTransitionOutType,
      setIsTransitioningWipe,
      setNavigationPageItemSelected
    ]
  );
  const goToPage = useCallback(
    (l: string, options?: TransitionSetOptions) => {
      const decision = setGenericPageTransition(l, options);
      const push = () => {
        l &&
          router.push(l, {
            scroll: false
          });
      };
      if (decision.type === "LOST_PRODUCT") {
        scheduleTransitionPush(push);
        return;
      }
      setTimeout(() => {
        scheduleTransitionPush(push);
      }, 120);
    },
    [router, setGenericPageTransition]
  );
  return {
    goToPage,
    setGenericPageTransition
  };
};


/**
 * Higher-level grouping that drives transition selection.
 * Two paths in the same group → FADE. Different groups → CURTAIN.
 *
 * - home: landing surface
 * - editorial-archive: paginated indices of editorial content (essays/in, tagged, surf root)
 * - editorial-single: a single piece of editorial content (essays/[slug], surf/[slug], archived/[slug])
 * - collections: user-curated lists
 * - profile: public-facing user pages (/users/[user]/*, /@handle/*)
 * - account: auth-gated administrative surfaces (/me, /account, /two-factor)
 * - auth: unauthenticated auth flows (sign-in, sign-up, forgot-password, …)
 * - search: search surface
 * - radio: audio surface
 * - lost-commerce: LOSTINSEOUL storefront, collection, cart, and checkout surfaces
 * - lost-product: LOSTINSEOUL product detail surfaces
 * - static: top-level marketing/legal pages (privacy, terms, plans, the-team, lostinseoul, next)
 * - system: 404, /vault, dev sandboxes
 */
export type PageGroup =
  | "home"
  | "editorial-archive"
  | "editorial-single"
  | "collections"
  | "profile"
  | "account"
  | "auth"
  | "search"
  | "radio"
  | "lost-commerce"
  | "lost-product"
  | "static"
  | "system";

export type PagePurpose =
  | "marketing"
  | "content"
  | "paginated"
  | "administrative"
  | "auth"
  | "search"
  | "system";

export type PageClassification = {
  pathname: string;
  group: PageGroup;
  purpose: PagePurpose;
  authGated: boolean;
};

const STATIC_PAGES = new Set([
  "privacy",
  "terms",
  "plans",
  "the-team",
  "lostinseoul",
  "next"
]);

const AUTH_PAGES = new Set([
  "sign-in",
  "sign-up",
  "forgot-password",
  "reset-password",
  "two-factor",
  "accept-invitation",
  "auth",
  "admin-ba"
]);

const DEV_PAGES = new Set(["dev", "dodo", "lexy", "ticks", "coming-soon"]);

const HANDLE_PREFIX = /^\/@[^/]+(\/.*)?$/;

function normalizePath(href: string): string {
  if (!href) return "/";
  const stripped = href.split("#")[0]!.split("?")[0]!;
  if (stripped === "" || stripped === "/") return "/";
  return stripped.replace(/\/+$/, "") || "/";
}

/**
 * Resolve `/@user/...` rewrites to their canonical destination so the classifier
 * sees the same group regardless of which URL form was clicked. Mirrors the
 * rewrites declared in `next.config.ts`.
 */
function resolveHandleRewrite(pathname: string): string {
  const match = pathname.match(HANDLE_PREFIX);
  if (!match) return pathname;
  const rest = match[1] ?? "";
  if (!rest || rest === "/") return "/users/__handle__";
  // Cauterization: essays, surf, and lists are Hideaway collection paths. Not on this site.
  // if (rest === "/essays" || rest.startsWith("/essays/")) return rest;
  // if (rest === "/surf" || rest.startsWith("/surf/")) return rest;
  // if (rest.startsWith("/lists/"))
  //   return `/lists/__handle__${rest.slice("/lists".length)}`;
  return `/users/__handle__${rest}`;
}

export function classifyPath(href: string): PageClassification {
  const raw = normalizePath(href);
  const pathname = resolveHandleRewrite(raw);

  if (pathname === "/" || pathname === "/home") {
    return mk(raw, "home", "marketing", false);
  }

  const segments = pathname.split("/").filter(Boolean);
  const head = segments[0] ?? "";

  // Cauterization: Lost in Seoul, search, and radio paths are not on this site.
  // if (head === "lostinseoul") {
  //   if (segments[1] === "products") {
  //     return mk(raw, "lost-product", "content", false);
  //   }
  //   return mk(raw, "lost-commerce", "marketing", false);
  // }
  // if (head === "search") return mk(raw, "search", "search", false);
  // if (head === "radio") return mk(raw, "radio", "content", false);

  if (head === "404" || head === "vault" || DEV_PAGES.has(head)) {
    return mk(raw, "system", "system", false);
  }

  if (AUTH_PAGES.has(head)) return mk(raw, "auth", "auth", false);

  if (head === "me" || head === "account") {
    return mk(raw, "account", "administrative", true);
  }

  // Cauterization: essays, surf, tagged, archived, and lists are Hideaway collection paths.
  // if (head === "essays") {
  //   if (segments.length === 1)
  //     return mk(raw, "editorial-archive", "paginated", false);
  //   if (segments[1] === "in")
  //     return mk(raw, "editorial-archive", "paginated", false);
  //   return mk(raw, "editorial-single", "content", false);
  // }
  // if (head === "surf") {
  //   if (segments.length === 1)
  //     return mk(raw, "editorial-archive", "paginated", false);
  //   return mk(raw, "editorial-single", "content", false);
  // }
  // if (head === "tagged")
  //   return mk(raw, "editorial-archive", "paginated", false);
  // if (head === "archived") return mk(raw, "editorial-single", "content", false);
  // if (head === "lists") return mk(raw, "collections", "paginated", false);
  if (head === "users") return mk(raw, "profile", "content", false);

  if (STATIC_PAGES.has(head)) return mk(raw, "static", "marketing", false);

  return mk(raw, "static", "marketing", false);
}

function mk(
  pathname: string,
  group: PageGroup,
  purpose: PagePurpose,
  authGated: boolean
): PageClassification {
  return { pathname, group, purpose, authGated };
}

export function isSamePageGroup(a: string, b: string): boolean {
  return classifyPath(a).group === classifyPath(b).group;
}

export type TransitionDecision = {
  type: PageTransitionType;
  from: PageClassification;
  to: PageClassification;
};

export type TransitionContext = {
  fromHref: string;
  toHref: string;
  navIsOpen: boolean;
  override?: PageTransitionType | null;
};

/**
 * Map a navigation event onto one of the four transition styles.
 *
 *   override         → IMMEDIATE / explicit caller intent
 *   menu open        → FROM_MENU
 *   LOSTINSEOUL internal handoff → LOST_PRODUCT
 *   /me/settings ↔ /me/settings/* → SHELL (shell stays; pane owns the fade)
 *   from.group ≠ to  → CURTAIN
 *   default          → FADE
 */
export function pickTransitionType(ctx: TransitionContext): TransitionDecision {
  const from = classifyPath(ctx.fromHref);
  const to = classifyPath(ctx.toHref);

  if (ctx.override) return { type: ctx.override, from, to };
  if (ctx.navIsOpen) return { type: "FROM_MENU", from, to };
  const fromLost =
    from.group === "lost-commerce" || from.group === "lost-product";
  const toLost = to.group === "lost-commerce" || to.group === "lost-product";
  if (fromLost && toLost && from.pathname !== to.pathname) {
    return { type: "LOST_PRODUCT", from, to };
  }
  if (
    isSettingsPath(from.pathname) &&
    isSettingsPath(to.pathname) &&
    from.pathname !== to.pathname
  ) {
    return { type: "SHELL", from, to };
  }
  if (from.group !== to.group) return { type: "CURTAIN", from, to };
  return { type: "FADE", from, to };
}

function isSettingsPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return path === "/me/settings" || path.startsWith("/me/settings/");
}
