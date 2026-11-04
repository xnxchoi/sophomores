"use client";

import type { HTMLMotionProps, Variants } from "motion/react";
import { useMotionValue } from "motion/react";
import { type ReactNode, useEffect } from "react";
import * as m from "motion/react-m";
import Image from "next/image";
import { useDayNNightStore } from "../store";
import { cn } from "@/lib/utils";

/**
 * Polaroid + PolaroidGroup — moodboard tiles for the immersive scene.
 *
 * Variants
 * ────────
 *   - `clean`   (default) — plain white paper-card frame with a photo and
 *                            an optional serif caption underneath. Honors
 *                            a per-photo `aspect` so e.g. landscape film
 *                            stills don't get cropped.
 *   - `stamped` — same as clean PLUS a `front-clear` texture PNG layered
 *                  over the photo (mint-tinted frame outline + corner
 *                  doodle from the source asset). Aspect locked to the
 *                  texture (portrait POLAROID_ASPECT); photo cover-fits
 *                  inside the texture's transparent window. Caption sits
 *                  below the card in the same unified serif voice.
 *   - `back`    — standalone decorative "back of card" texture; no photo,
 *                  no caption. For ambient scatter in a moodboard cluster.
 *
 * Behaviour (shared across variants)
 * ──────────────────────────────────
 *  1. Horizontal parallax — each tile has a `depth` in roughly [-1, 1]
 *     and an `anchor` (loopProgress where the tile sits at rest). A rAF
 *     reads the live scene progress, computes the loop-wrapped distance
 *     from `anchor`, and writes the result to a MotionValue bound to
 *     the OUTER tile's `x`. depth=0 disables the rAF.
 *  2. Static angle — INNER tile has `style.rotate: angleDeg`, set once
 *     at mount. The two motion layers are nested so Motion composes
 *     parallax (translateX) and tilt (rotate) without fighting.
 *  3. Reveal entry — variants picked up by an outer PolaroidGroup. When
 *     used outside a Group the polaroid renders without an entry stage
 *     (variants are inert without a `whileInView` ancestor).
 */

// ─── Texture key → asset-path maps ───────────────────────────────────────────

type FrontOverlay = "card-2_front-clear" | "card-4_front-clear";
type BackTexture = "card-2_back" | "card-4_back-2";

/** Front-clear overlays: PNG sits on top of the photo. The transparent
 *  middle of the asset lets the photo show through; the frame border +
 *  corner doodle composite on top. */
const FRONT_PATHS: Record<FrontOverlay, string> = {
  "card-2_front-clear": "/assets/textures/photograph/card-2_front-clear@2x.png",
  "card-4_front-clear": "/assets/textures/photograph/card-4_front-clear@2x.png"
};

/** Back-card textures: standalone full-card asset (leather scuff +
 *  sticker + handwritten label). The CMS-style id prefix on
 *  card-2_back is part of the asset filename on disk — keep it here so
 *  the path map is the single source of truth and the asset doesn't
 *  need renaming. */
const BACK_PATHS: Record<BackTexture, string> = {
  "card-2_back":
    "/assets/textures/photograph/672a4022c04412b253b0af22_card-2_back@2x.png",
  "card-4_back-2": "/assets/textures/photograph/card-4_back-2@2x.png"
};

/** Portrait card master aspect, matching the texture PNGs (≈956×1247-1268).
 *  Stamped + back variants render at this aspect regardless of the photo's
 *  native shape; photos `object-cover` into the transparent window. */
const POLAROID_ASPECT = 0.76;

// ─── Props (discriminated union on `variant`) ────────────────────────────────

interface PolaroidCommon {
  /** Tile width in px. Defaults to 220px. */
  width?: number;
  /** Rotation in degrees. Negative tilts left, positive tilts right. */
  angle?: number;
  /** Parallax depth, roughly [-1, 1]. 0 = sits with the section. */
  depth?: number;
  /** Section center in loopProgress to anchor the parallax window around. */
  anchor?: number;
  /** Range in px the tile can drift horizontally. Default 90. */
  range?: number;
  /** Hint next/image to load eagerly. Set true for above-the-fold tiles. */
  priority?: boolean;
}

interface PolaroidClean extends PolaroidCommon {
  variant?: "clean";
  src: string;
  alt?: string;
  caption?: ReactNode;
  /** Photo aspect ratio (w/h). Defaults to 1 (square). */
  aspect?: number;
}

interface PolaroidStamped extends PolaroidCommon {
  variant: "stamped";
  src: string;
  alt?: string;
  caption?: ReactNode;
  /** Required: which front-clear texture to layer over the photo. */
  overlay: FrontOverlay;
}

interface PolaroidBack extends PolaroidCommon {
  variant: "back";
  /** Required: which back texture to render. */
  backTexture: BackTexture;
}

export type PolaroidProps = Omit<
  HTMLMotionProps<"div">,
  keyof (PolaroidClean | PolaroidStamped | PolaroidBack) | "children"
> &
  (PolaroidClean | PolaroidStamped | PolaroidBack);

// ─── Reveal entry variants (shared across all polaroid variants) ─────────────

const POLAROID_REVEAL_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 1.0,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// ─── Polaroid ────────────────────────────────────────────────────────────────

export function Polaroid(props: PolaroidProps) {
  const {
    width = 220,
    angle = 0,
    depth = 0,
    anchor = 0.5,
    range = 90,
    className,
    style
  } = props;

  // Motion-aware translateX for parallax.
  const paraX = useMotionValue(0);
  const store = useDayNNightStore();

  useEffect(() => {
    if (depth === 0) return;
    let raf = 0;
    let active = true;
    const tick = () => {
      if (!active) return;

      // Wrap distance from anchor along the shorter direction so
      // parallax doesn't snap at the 1 → 0 loop boundary.
      let d = store.getState().progress - anchor;
      if (d > 0.5) d -= 1;
      if (d < -0.5) d += 1;
      paraX.set(d * depth * range);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [depth, anchor, range, paraX, store]);

  // Discriminated-union narrowing inside the JSX. Each branch sees only
  // the props that apply to its variant — no `!` non-null assertions
  // needed because the discriminant narrows the union.
  const variant = props.variant ?? "clean";

  return (
    <m.div
      className={cn("shrink-0 will-change-transform", className)}
      style={{ x: paraX, width, ...style }}
      variants={POLAROID_REVEAL_VARIANTS}
    >
      <m.div className="origin-[center_60%]" style={{ rotate: angle }}>
        {variant === "back" ? (
          // Back variant — standalone texture, no caption, no frame chrome.
          // The PNG carries its own border / sticker / handwritten label.
          <div
            className="relative w-full overflow-hidden rounded-[4px] shadow-[0_8px_24px_oklch(0%_0_0_/_0.22),_0_2px_6px_oklch(0%_0_0_/_0.15)]"
            style={{ aspectRatio: POLAROID_ASPECT }}
          >
            <Image
              src={BACK_PATHS[(props as PolaroidBack).backTexture]}
              alt=""
              fill
              sizes={`${Math.round(width)}px`}
              priority={props.priority ?? false}
              className="object-cover"
            />
          </div>
        ) : variant === "stamped" ? (
          // Stamped variant — the texture PNG is a full polaroid graphic
          // (frame + bottom margin with doodle). The photo sits INSIDE the
          // texture's "photo area" via explicit absolute positioning, above
          // the texture in z-order. Texture provides the chrome; photo
          // fills the inner window region exactly.
          <>
            <div
              className="relative w-full overflow-hidden rounded-[4px] shadow-[0_8px_24px_oklch(0%_0_0_/_0.22),_0_2px_6px_oklch(0%_0_0_/_0.15)]"
              style={{ aspectRatio: POLAROID_ASPECT }}
            >
              <Image
                src={FRONT_PATHS[(props as PolaroidStamped).overlay]}
                alt=""
                fill
                sizes={`${Math.round(width)}px`}
                className="pointer-events-none absolute inset-0 z-[1] object-cover select-none"
              />
              <div className="absolute top-[4%] left-[5%] z-2 h-[62%] w-[90%] overflow-hidden">
                <Image
                  src={(props as PolaroidStamped).src}
                  alt={(props as PolaroidStamped).alt ?? ""}
                  fill
                  sizes={`${Math.round(width)}px`}
                  priority={props.priority ?? false}
                  className="object-cover"
                />
              </div>
            </div>
            {(props as PolaroidStamped).caption ? (
              <figcaption className="mt-[10px] text-center font-serif text-[12px] leading-[1.3] tracking-[0.01em] text-[oklch(28%_0.02_60)] italic">
                {(props as PolaroidStamped).caption}
              </figcaption>
            ) : null}
          </>
        ) : (
          // Clean — original path. Paper-card frame with paper gradient +
          // grain noise via data-dn-polaroid-frame, photo at its own
          // per-photo aspect, caption below.
          <div
            data-dn-polaroid-frame
            className="relative rounded-[2px] px-3 pt-3 pb-9"
          >
            <div
              className="relative overflow-hidden bg-[oklch(70%_0.04_80)] shadow-[0_0_0_1px_oklch(0%_0_0_/_0.08)_inset]"
              style={{ aspectRatio: (props as PolaroidClean).aspect ?? 1 }}
            >
              <Image
                src={(props as PolaroidClean).src}
                alt={(props as PolaroidClean).alt ?? ""}
                fill
                sizes={`${Math.round(width)}px`}
                priority={props.priority ?? false}
                className="object-cover contrast-[1.02] saturate-[0.92]"
              />
            </div>
            {(props as PolaroidClean).caption ? (
              <figcaption className="mt-[10px] text-center font-serif text-[12px] leading-[1.3] tracking-[0.01em] text-[oklch(28%_0.02_60)] italic">
                {(props as PolaroidClean).caption}
              </figcaption>
            ) : null}
          </div>
        )}
      </m.div>
    </m.div>
  );
}

// ─── PolaroidGroup ──────────────────────────────────────────────────────────

interface PolaroidGroupProps {
  className?: string;
  /** Override the in-view trigger threshold. Default 0.4. */
  amount?: number;
  /** Override the stagger between polaroids. Default 0.12s. */
  stagger?: number;
  /** When provided, switches to programmatic animate control (true=visible,
   *  false=hidden) instead of whileInView. */
  active?: boolean;
  children: ReactNode;
}

export function PolaroidGroup({
  className,
  amount = 0.4,
  stagger = 0.12,
  active,
  children
}: PolaroidGroupProps) {
  const programmatic = typeof active === "boolean";
  return (
    <m.div
      className={className}
      initial="hidden"
      {...(programmatic
        ? { animate: active ? "visible" : "hidden" }
        : { whileInView: "visible", viewport: { once: true, amount } })}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren: 0.1 }
        }
      }}
    >
      {children}
    </m.div>
  );
}
