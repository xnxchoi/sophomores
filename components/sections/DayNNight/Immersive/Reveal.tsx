"use client";

import { useEffect, useState, type ReactNode, useMemo } from "react";
import { type Variants } from "motion/react";
import * as m from "motion/react-m";
import { useDayNNightScene } from "../store";

/**
 * Reveal — slow, soft, choreographed text reveal for the immersive
 * Day n Night scene.
 *
 * Design direction
 * ────────────────
 * Calibrated against `src/components/UX/Tour/RegistrationTour.tsx`'s
 * blur-in feel (the closest tonal cousin already in the codebase):
 *
 *   - y offset: 6px (was 16 — too far)
 *   - blur:     6px (was 12 — too strong)
 *   - duration: 0.85s (longer, smoother)
 *   - ease:     [0.25, 0.46, 0.45, 0.94] — cubic ease-out, gentler than the
 *               prior expo-out [0.16, 1, 0.3, 1] that felt "jerky"
 *
 * Trigger semantics
 * ─────────────────
 *   - `once: true` — fires the FIRST time the element enters viewport,
 *     then stays in place. Avoids the 8×-re-trigger problem caused by
 *     the loop's duplicate ActSet pattern + viewport re-entries.
 *   - `amount: 0.55` — the element must be ~55% visible before firing,
 *     not the prior 0.35 which fired at the viewport edge.
 *
 * Choreography
 * ────────────
 * Use the two-component pattern for a coordinated section reveal:
 *
 *   <RevealStage>
 *     <RevealItem as="p"  className={s.kicker}>kicker</RevealItem>
 *     <RevealItem as="h2" className={s.title}>title</RevealItem>
 *     <RevealItem as="p"  className={s.lede}>lede</RevealItem>
 *   </RevealStage>
 *
 * The Stage observes the viewport ONCE; on the trigger it dispatches its
 * `visible` variant down the tree. The Stage's `staggerChildren` paces
 * the Items so they cascade — kicker → title → lede — instead of all
 * popping at once. Result: each section reads as a single composed
 * gesture, not a pile of independently-triggered elements.
 *
 * The legacy `<Reveal>` helper is kept as a single-shot wrapper for
 * callers that need a one-element reveal without a Stage; it uses the
 * same easing + offset values.
 */

// ─── Animation primitives ────────────────────────────────────────────────────

const EASE_SOFT: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 6, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.85, ease: EASE_SOFT }
  }
};

/**
 * Choreography defaults — picked to feel like a calm exhale rather
 * than a fast pop. The Stage waits a beat (`delayChildren: 0.15`)
 * after the trigger fires, then cascades children at `0.18s` intervals.
 * For sections with many items, this stretches the reveal into a
 * coherent ~1.0s gesture before the last child settles.
 */
const STAGE_VIEWPORT = 0.55;

// ─── Tag mapping (polymorphic without `as any`) ──────────────────────────────

const MOTION_MAP = {
  div: m.div,
  section: m.section,
  header: m.header,
  h1: m.h1,
  h2: m.h2,
  h3: m.h3,
  p: m.p,
  span: m.span
} as const;

type RevealTag = keyof typeof MOTION_MAP;

// ─── RevealStage — the choreographer ─────────────────────────────────────────

interface RevealStageProps {
  as?: RevealTag;
  className?: string;
  /** Override the viewport intersection threshold (0–1). Default 0.55. */
  amount?: number;
  /** Override the stagger interval between children. Default 0.18s. */
  stagger?: number;
  /** Override the initial delay before the first child fires. Default 0.15s. */
  delay?: number;
  /**
   * When provided, gates the reveal on a scene-state boolean instead of
   * viewport intersection. Use this for choreographed entrances tied to
   * something other than scroll — e.g. the Opening copy waits for
   * `phase === "playing"` so it animates AFTER the loader has fully
   * transitioned out, not while it's still on screen.
   *
   * When omitted (and no `progressThreshold` set), the stage falls back
   * to the default whileInView trigger.
   */
  active?: boolean;
  /**
   * Scene-progress threshold in `[0, 1]`. When set, the stage's `active`
   * derives from `useDayNNightScene.progress >= progressThreshold` —
   * subscribes via a boolean selector so the stage only re-renders on
   * the crossing, not every rAF tick that writes progress. Audit ref H9.
   *
   * Use this in place of the default `whileInView` for acts that sit
   * inside the GSAP-pinned horizontal track, where viewport-based
   * triggers can fire on mount (the act is technically "in viewport"
   * from the start of the page) instead of when the user actually
   * scrolls into that act.
   *
   * Once the threshold is crossed the boolean stays true for the rest
   * of the session — Zustand's `getState` floor + scene-progress only
   * ever advancing monotonically inside a single session means the
   * reveal won't flicker if the user scrolls back through.
   */
  progressThreshold?: number;
  children: ReactNode;
}

export function RevealStage({
  as = "div",
  className,
  amount,
  stagger,
  delay,
  active,
  progressThreshold,
  children
}: RevealStageProps) {
  const Tag = MOTION_MAP[as];
  // Boolean selector: only fires a re-render on the threshold crossing,
  // not on every rAF write to `progress`. Always invoked (hook order
  // stability); when no threshold is provided we hand the limiter
  // `Infinity` so the selector returns `false` and Zustand never
  // subscribes the component to meaningful changes.
  const progressActive = useDayNNightScene((r) =>
    typeof progressThreshold === "number"
      ? r.progress >= progressThreshold
      : false
  );

  // Below `lg` the immersive view is a plain vertical scroll: the GSAP
  // horizontal track, its `layout` measurement, and the scene-progress
  // thresholds that desktop reveals gate on never apply (`layout` is
  // only measured in the desktop matchMedia branch of Timeline). Falling
  // through to `active`/`progressThreshold` here leaves every
  // layout-gated act reveal stuck in the `hidden` variant — opacity 0
  // on entry. On compact widths, drop the scene gate and reveal on
  // viewport intersection instead.
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsCompact(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsCompact(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolvedActive = isCompact
    ? undefined
    : typeof active === "boolean"
      ? active
      : typeof progressThreshold === "number"
        ? progressActive
        : undefined;

  const variants = useMemo(
    () => ({
      hidden: { opacity: 1 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: stagger ?? 0.18,
          delayChildren: delay ?? 0.15
        }
      }
    }),
    [stagger, delay]
  );

  // Three trigger modes:
  //   - `active` (or `progressThreshold` → resolvedActive defined): the
  //     stage's variant is controlled by the boolean.
  //   - Otherwise: default whileInView behaviour.
  // All three modes share the same children stagger.

  return (
    <Tag
      className={className}
      initial={"hidden"}
      variants={variants}
      {...(typeof resolvedActive === "boolean"
        ? {
            animate: resolvedActive ? "visible" : "hidden"
          }
        : {
            whileInView: "visible",
            viewport: {
              once: true,
              // Compact stages can be taller than 55% of a phone
              // viewport; a gentler threshold ensures the reveal fires.
              amount: amount ?? (isCompact ? 0.3 : STAGE_VIEWPORT)
            }
          })}
    >
      {children}
    </Tag>
  );
}

// ─── RevealItem — animates as part of the parent Stage's stagger ─────────────

interface RevealItemProps {
  as?: RevealTag;
  className?: string;
  children: ReactNode;
}

export function RevealItem({
  as = "div",
  className,
  children
}: RevealItemProps) {
  const Tag = MOTION_MAP[as];
  return (
    <Tag className={className} variants={ITEM_VARIANTS}>
      {children}
    </Tag>
  );
}

// ─── useActRevealActive — layout-aware reveal gate ──────────────────────────
//
// Phase 5b-UF / P0.2. Returns `true` once scene progress has crossed the
// point where the act's left edge is approaching the viewport's right
// edge — i.e. the act is about to become visible. Subtracts an
// additional `preroll` so the 0.85s blur-in lands before the act's
// heading reaches viewport center, not after.
//
// Implementation uses a Zustand boolean selector against the live
// `layout.startsFrac[actIndex]` + `layout.viewportFrac` measurements
// written by Timeline. Returns `false` until layout is measured —
// keeps copy hidden over the first frame instead of flashing visible
// before the measurement lands.
//
// The previous `progressThreshold` model (static numbers like 0.219)
// fired too late because they were anchored to act CENTERS, by which
// time the user was already reading hidden copy.

interface ActRevealOptions {
  /**
   * How much earlier than "act left edge at viewport right edge" to
   * fire the reveal. Expressed in loopProgress units. Default 0.02
   * (~0.2s of typical scroll velocity).
   */
  preroll?: number;
}

export function useActRevealActive(
  actIndex: number,
  { preroll = 0.02 }: ActRevealOptions = {}
): boolean {
  // Sticky activation: once the threshold is crossed the reveal stays
  // visible even if the user scrolls backward past the threshold. The
  // raw `crossed` boolean flips both ways with `progress`; we latch it
  // into `active` and never unset. Mirrors Motion's `whileInView` with
  // `{ once: true }` behavior — the gold-standard UX for reveals.
  const crossed = useDayNNightScene((r) => {
    const layout = r.layout;
    const start = layout?.startsFrac[actIndex];
    if (!layout || typeof start !== "number") return false;
    // Act first enters viewport from the right when:
    //   loopProgress = startsFrac - viewportFrac
    // We fire `preroll` of progress earlier so the blur-in completes
    // before the heading sits at viewport center.
    const threshold = start - layout.viewportFrac - preroll;
    return r.progress >= threshold;
  });
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (crossed && !active) setActive(true);
  }, [crossed, active]);
  return active;
}

// ─── useActWindowActive — two-way act-window gate ──────────────────────────
//
// Sibling of `useActRevealActive` (above), but NOT sticky. Returns true
// while the user is inside the given act's scroll window — false before
// the act enters viewport and false after it leaves. Used by surfaces
// that should arm on entry and disarm on exit (e.g. the friends-window's
// FriendsTorrent: exit clears the fixed foreground layer).
//
// Window math (in loopProgress fraction space):
//   enter = startsFrac[actIndex] - viewportFrac - preroll
//   exit  = startsFrac[actIndex + 1] - viewportFrac + posttail
//           (or 1.0 for last act)
//
// `entryCount` increments on every false→true edge — consumers pass it
// as a replayKey to children that need to restart on re-entry.

export interface ActWindowOptions {
  /** How much earlier than "act left edge at viewport right edge" to
   *  arm. Default 0.02 (~0.2s of typical scroll). */
  preroll?: number;
  /** How much past the next act's start to keep the window open. Default
   *  0.0. */
  posttail?: number;
}

export interface ActWindowState {
  active: boolean;
  /** Increments on every false→true edge — pass as a child replayKey. */
  entryCount: number;
}

export function useActWindowActive(
  actIndex: number,
  { preroll = 0.02, posttail = 0.0 }: ActWindowOptions = {}
): ActWindowState {
  // Single boolean selector — Zustand uses `===` on the result so the
  // consumer only re-renders on the window enter/exit flip, not on
  // every rAF write to `progress`. Mirrors the LoaderReveal pattern
  // earlier in this file.
  const active = useDayNNightScene((r) => {
    const l = r.layout;
    if (!l) return false;
    const start = l.startsFrac[actIndex];
    if (typeof start !== "number") return false;
    const next = l.startsFrac[actIndex + 1];
    const enter = start - l.viewportFrac - preroll;
    const exit =
      typeof next === "number" ? next - l.viewportFrac + posttail : 1;
    return r.progress >= enter && r.progress < exit;
  });

  // EntryCount accumulates every false→true edge so consumers can
  // pass it as a replayKey to children that need to restart on
  // re-entry. Only this counter needs state — `active` itself is a
  // pure derivation of the boolean selector above.
  const [entryCount, setEntryCount] = useState(0);
  useEffect(() => {
    if (active) setEntryCount((c) => c + 1);
  }, [active]);

  return { active, entryCount };
}

export function useActProgress(
  actIndex: number,
  { preroll = 0.02, posttail = 0.0 }: ActWindowOptions = {}
): number {
  return useDayNNightScene((r) => {
    const l = r.layout;
    if (!l) return 0;
    const start = l.startsFrac[actIndex];
    if (typeof start !== "number") return 0;
    const next = l.startsFrac[actIndex + 1];
    const enter = start - l.viewportFrac - preroll;
    const exit =
      typeof next === "number" ? next - l.viewportFrac + posttail : 1;
    const span = exit - enter;
    if (span <= 0) return 0;
    return Math.max(0, Math.min(1, (r.progress - enter) / span));
  });
}

// ─── LoaderReveal — loader-progress-driven reveal ────────────────────────────
//
// For copy that must transition IN SYNC with the loader, not after it
// (ComPsych-style choreography). Each item declares a `threshold` in
// loaderProgress space [0, 1]; when the store's `loaderProgress` crosses
// that threshold the item animates from hidden → visible using the same
// soft blur-in motion as RevealItem.
//
// Once loaderProgress reaches 1 it stays there for the rest of the
// session, so scrolling back to the Opening doesn't re-trigger the
// reveal — the item stays visible. On Immersive unmount index.tsx
// resets loaderProgress to 0 so a fresh mount replays the choreography.

interface LoaderRevealProps {
  /** Loader progress (in [0, 1]) at which this item becomes visible. */
  threshold: number;
  as?: RevealTag;
  className?: string;
  children: ReactNode;
}

export function LoaderReveal({
  threshold,
  as = "div",
  className,
  children
}: LoaderRevealProps) {
  const Tag = MOTION_MAP[as];
  // Selector returns a boolean — Zustand only re-renders when the
  // crossing point flips, not on every loaderProgress write.
  const visible = useDayNNightScene((r) => r.loaderProgress >= threshold);
  return (
    <Tag
      className={className}
      initial="hidden"
      animate={visible ? "visible" : "hidden"}
      variants={ITEM_VARIANTS}
    >
      {children}
    </Tag>
  );
}

// ─── Reveal — legacy single-shot helper ─────────────────────────────────────

interface RevealProps {
  as?: RevealTag;
  /** Extra delay before this item's reveal fires (seconds). */
  delay?: number;
  /** Override the in-view intersection threshold (0–1). Default 0.55. */
  amount?: number;
  className?: string;
  children: ReactNode;
}

export function Reveal({
  as = "div",
  delay = 0,
  amount,
  className,
  children
}: RevealProps) {
  const Tag = MOTION_MAP[as];

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
      whileInView={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.85, ease: EASE_SOFT, delay }
      }}
      viewport={{
        once: true,
        amount: amount ?? STAGE_VIEWPORT
      }}
    >
      {children}
    </Tag>
  );
}
