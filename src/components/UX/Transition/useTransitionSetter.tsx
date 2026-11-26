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
 * - commerce: Sophomores shop and tickets, from browsing through cart, checkout, payment and orders
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
  | "commerce"
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

// Sophomores' information pages share one group, so moving between them fades (owner, Q4: a curtain
// between page groups, a fade within one).
const STATIC_PAGES = new Set([
  "privacy",
  "terms",
  "refund",
  "help",
  "team",
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
  "admin-ba",
  "login",
  "logout"
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

  // Sophomores' own groups (S4). Reading: the essay index is the archive; an essay or a setlist is a single
  // piece, as in The Hideaway, so index <-> piece takes the curtain. /music renders a setlist (the same
  // piece as its /setlists/ URL), so it is a single piece too. Shop and tickets
  // are one commerce group from browsing through payment and orders, so a purchase flow only fades.
  if (head === "essays") {
    return segments.length === 1
      ? mk(raw, "editorial-archive", "paginated", false)
      : mk(raw, "editorial-single", "content", false);
  }
  if (head === "music") return mk(raw, "editorial-single", "content", false);
  if (head === "setlists") return mk(raw, "editorial-single", "content", false);
  if (head === "shop" || head === "tickets") return mk(raw, "commerce", "content", false);

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
 * The destination as a path, for classification only (navigation keeps the original href). Every href is
 * resolved against the current page, so relative ("x", "../x"), hash- or query-only, protocol-relative
 * ("//host/x") and absolute URLs classify by the path they reach. Another origin is not a page change on
 * this site; it classifies by its full URL, which names no route here (static).
 */
function resolveTarget(fromHref: string, toHref: string): string {
  // Without a window (server), a placeholder origin still resolves relative, hash- and query-only hrefs.
  const origin = typeof window === "undefined" ? "http://site.invalid" : window.location.origin;
  try {
    const url = new URL(toHref, new URL(fromHref, origin));
    return url.origin === origin ? url.pathname : url.href;
  } catch {
    return toHref;
  }
}

/**
 * Map a navigation event onto one of the four transition styles.
 *
 *   override         → IMMEDIATE / explicit caller intent
 *   menu open        → FROM_MENU
 *   LOSTINSEOUL internal handoff → LOST_PRODUCT
 *   /me/settings ↔ /me/settings/* → SHELL (shell stays; pane owns the fade)
 *   /shop ↔ /shop/products/* ↔ /shop/cart → SHELL (one page; the shop layout owns the move)
 *   (the cross-group CURTAIN is retired; owner, 26 Nov)
 *   default          → FADE
 */
export function pickTransitionType(ctx: TransitionContext): TransitionDecision {
  const from = classifyPath(ctx.fromHref);
  const to = classifyPath(resolveTarget(ctx.fromHref, ctx.toHref));

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
  // The shop shelf and its product pages share one page and one book canvas (UI-Commerce, 24 Nov; stripe.press keeps
  // the shelf, detail and canvas mounted and only the URL changes): no page cover between them, the shop layout
  // owns the move.
  if (isShopShelfPath(from.pathname) && isShopShelfPath(to.pathname) && from.pathname !== to.pathname) {
    return { type: "SHELL", from, to };
  }
  // Every other page change takes the standard fade, between groups too: the curtain is retired (owner, 26 Nov: "Use the
  // fucking standard fade").
  return { type: "FADE", from, to };
}

export function isShopShelfPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return path === "/shop" || path === "/shop/cart" || path.startsWith("/shop/products/");
}

// The shop shelf and a product page are one mounted page (SHELL): the shelf keeps its scroll when a product opens
// and when it closes, as stripe.press's does (UI-Commerce, 24 Nov); the cart is the same page in cart mode (stripe's
// /cart), so closing it back to /shop keeps the scene mounted (26 Nov). The router's enter gets no from/to
// (next-transition-router dist/index.js:139), so this reads where the move arrived: SHELL is only picked within
// one family (pickTransitionType above), so a SHELL arrival on a shelf path came from one.
export function keepsShelfScroll(type: string | null | undefined, arrivedAt: string): boolean {
  return type === "SHELL" && isShopShelfPath(arrivedAt);
}

export function isSettingsPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return path === "/me/settings" || path.startsWith("/me/settings/");
}
