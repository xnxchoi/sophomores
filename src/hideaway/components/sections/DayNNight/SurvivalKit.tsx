"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";
import { useTranslations } from "next-intl";
import { Map, MapMarker, MarkerContent } from "@/hideaway/components/ui/map";
import { MAP_LINKS, VENUE_COORDS } from "./survivalKit.config";
import { Button } from "@/hideaway/components/core/Button";
import type { IconType } from "react-icons";
import { SiGooglemaps, SiKakao, SiNaver } from "react-icons/si";
import * as m from "motion/react-m";

const VENUE_VIEWPORT = {
  center: [VENUE_COORDS.lng, VENUE_COORDS.lat] as [number, number],
  zoom: 15,
  bearing: 0,
  pitch: 0
} as const;

const MAP_RESET_MOUSE_IDLE_MS = 400;
const MAP_RESET_TOUCH_IDLE_MS = 10000;

type VenueViewport = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

function isVenueViewport(viewport: VenueViewport) {
  return (
    Math.abs(viewport.center[0] - VENUE_VIEWPORT.center[0]) < 0.00008 &&
    Math.abs(viewport.center[1] - VENUE_VIEWPORT.center[1]) < 0.00008 &&
    Math.abs(viewport.zoom - VENUE_VIEWPORT.zoom) < 0.12 &&
    Math.abs(viewport.bearing - VENUE_VIEWPORT.bearing) < 0.75 &&
    Math.abs(viewport.pitch - VENUE_VIEWPORT.pitch) < 0.75
  );
}

/**
 * useTranslationsSafe — wraps next-intl's useTranslations so that a
 * missing-provider error during the first hydration render no longer
 * throws into an error boundary.
 *
 * Why we need this: on the immersive /day-n-night surface, SurvivalKit
 * is mounted in three places (SimplifiedView, OpeningCard inside the
 * Timeline's duplicate-ActSet pinned track, and DetailsDrawer's Vaul
 * portal). At the very first render after hydration, the
 * NextIntlClientProvider context can briefly resolve to `undefined`
 * while the (frontend)/layout's outer Suspense and ClientProviders
 * tree settle — useTranslations throws, React fires the error boundary
 * + retries, and the second render succeeds. The visible UI is
 * correct, but the console fills with 4+ stack traces every load.
 *
 * This wrapper returns `null` when the hook throws, letting the caller
 * render nothing on that first attempt. React then retries with the
 * fully-mounted provider on the next pass and the hook works normally.
 * Hook order remains stable across renders — the hook is always called
 * in the same position; the try/catch only suppresses the throw next
 * to the caller's site, it does not skip the call. */
function useTranslationsSafe(namespace: Parameters<typeof useTranslations>[0]) {
  try {
    return useTranslations(namespace);
  } catch {
    return null;
  }
}

/**
 * Survival Kit — Phase 5c v4 (editorial fragments).
 *
 * v4 dissolves the dossier framing (v2's three-cluster card with
 * dividers + own header) into a single typographic stack of editorial
 * fragments. The act's own title carries the section identity; the kit
 * does not repeat it. Spacing follows a Fibonacci-ish progression
 * (8 / 13 / 21 / 55 px) so the rhythm feels musical instead of
 * arbitrary.
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │  WHERE                                               │
 *   │  Sowol-ro 20-gil 64, 3F                              │
 *   │  → Open map · Copy                                   │
 *   │                                                      │
 *   │  PAY                                                 │
 *   │  Toss Bank · 1002-5436-0906                          │
 *   │  리스토어드프로젝트                                  │
 *   │  65,000 KRW                                          │
 *   │  → Copy                                              │
 *   │                                                      │
 *   │  WEAR    Dressy. Comfortable. A little brave.        │
 *   │  +1S     Reserved guests only.                       │
 *   │  LATE    Doors stay open until 21:00.                │
 *   │                                                      │
 *   │  ASK     concierge@hideawayseoul.com →               │
 *   └──────────────────────────────────────────────────────┘
 *
 * Geometric harmony:
 *  - Label column: 55px (Fibonacci) — tight to short labels, no
 *    over-reserved whitespace like the prior 88px column.
 *  - Inter-fragment gap: 55px (top-level groups), 13px (within-group
 *    rows), 8px (line stack).
 *  - Type ratios: address/account serif ≈ 1.6× lede; lede ≈ 1.5× mono
 *    metadata. Stays near the golden ratio without enforcing exact
 *    pixel multiples.
 *
 * Copy lives in `messages/{en,ko}.json` under
 * `Event.DayNNight.survivalKit`. The component itself is locale-blind.
 *
 * ── Variants ─────────────────────────────────────────────────────────
 * `standalone` (default): SimplifiedView usage. Outer top margin
 * separates the kit from the closing italic above it.
 *
 * `embedded`: Immersive Opening + Closing reprise usage. No outer
 * margin — the host act grid owns placement. Slightly tighter
 * max-width so it fits inside a column.
 */
interface SurvivalKitProps {
  variant?: "standalone" | "embedded";
}

export function SurvivalKit({ variant = "standalone" }: SurvivalKitProps) {
  const t = useTranslationsSafe("Event.DayNNight.survivalKit");
  const tDn = useTranslationsSafe("Event.DayNNight");
  const [copied, setCopied] = useState<string | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoResettingRef = useRef(false);
  const mapPointerInsideRef = useRef(false);
  const mapMovedAwayRef = useRef(false);
  const [showVenueReset, setShowVenueReset] = useState(false);
  // useId yields a unique, SSR-stable id per instance so the immersive
  // view can mount multiple kits (Opening + Closing, each duplicated by
  // the seamless-loop ActSet) without aria-labelledby id collisions.
  const headingId = useId();

  const clearMapResetTimer = useCallback(() => {
    if (!resetTimerRef.current) return;
    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
  }, []);

  const resetVenueViewport = useCallback(
    (duration = 460) => {
      const map = mapRef.current;
      if (!map) return;

      clearMapResetTimer();
      autoResettingRef.current = true;
      setShowVenueReset(false);
      map.stop();

      map.easeTo({
        center: VENUE_VIEWPORT.center,
        zoom: VENUE_VIEWPORT.zoom,
        bearing: VENUE_VIEWPORT.bearing,
        pitch: VENUE_VIEWPORT.pitch,
        duration,
        essential: true
      });

      map.once("moveend", () => {
        autoResettingRef.current = false;
        setShowVenueReset(false);
      });
    },
    [clearMapResetTimer]
  );

  const scheduleVenueReset = useCallback(
    (delay = MAP_RESET_MOUSE_IDLE_MS) => {
      clearMapResetTimer();
      if (!mapMovedAwayRef.current) return;

      resetTimerRef.current = setTimeout(() => {
        if (mapPointerInsideRef.current && delay !== MAP_RESET_TOUCH_IDLE_MS) {
          return;
        }
        resetVenueViewport();
      }, delay);
    },
    [clearMapResetTimer, resetVenueViewport]
  );

  const handleMapViewportChange = useCallback(
    (viewport: VenueViewport) => {
      if (autoResettingRef.current) return;

      const movedAway = !isVenueViewport(viewport);
      mapMovedAwayRef.current = movedAway;
      setShowVenueReset(movedAway);

      if (!movedAway) clearMapResetTimer();
    },
    [clearMapResetTimer]
  );

  const handleMapPointerEnter = useCallback(() => {
    mapPointerInsideRef.current = true;
    clearMapResetTimer();
  }, [clearMapResetTimer]);

  const handleMapPointerLeave = useCallback(() => {
    mapPointerInsideRef.current = false;
    scheduleVenueReset(MAP_RESET_MOUSE_IDLE_MS);
  }, [scheduleVenueReset]);

  const handleMapPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "touch") {
        mapPointerInsideRef.current = true;
      }
      clearMapResetTimer();
    },
    [clearMapResetTimer]
  );

  const handleMapPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch") {
        scheduleVenueReset(MAP_RESET_TOUCH_IDLE_MS);
        return;
      }
      if (!mapPointerInsideRef.current) {
        scheduleVenueReset(MAP_RESET_MOUSE_IDLE_MS);
      }
    },
    [scheduleVenueReset]
  );

  const handleMapWheel = useCallback(() => {
    clearMapResetTimer();
  }, [clearMapResetTimer]);

  useEffect(() => () => clearMapResetTimer(), [clearMapResetTimer]);

  // Wait for the next-intl provider context. Returning null on the
  // first render where context isn't yet ready lets React retry on
  // the next pass with the provider fully mounted — no error-boundary
  // fallout, no console noise.
  if (!t || !tDn) return null;

  const address = tDn("location.address");
  const tossAccount = tDn("entry.bank");
  const tossAmount = tDn("entry.amount");
  // Account holder name — required for Korean bank transfers.
  const tossHolder = tDn("entry.accountHolder");
  const hostContact = t("host.value");
  // Toss line copied as "account · holder · amount" so a single paste
  // lands the whole payment instruction.
  const tossClipboard = `${tossAccount} · ${tossHolder} · ${tossAmount}`;
  const hostHref = hostContact.includes("@")
    ? `mailto:${hostContact}`
    : hostContact;

  const flashCopied = (key: string) => {
    setCopied(key);
    setTimeout(
      () => setCopied((current) => (current === key ? null : current)),
      1500
    );
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flashCopied(key);
    } catch {
      // Clipboard API can fail in restrictive iframes / non-HTTPS.
      // Silent — the value is still visible for manual select-copy.
    }
  };

  const copyLabel = (key: string) => {
    if (key === "address") {
      return copied === key ? t("map.addressCopied") : t("map.copyAddress");
    }
    if (key === "toss") {
      return copied === key ? t("paymentCopied") : t("copyPayment");
    }
    return copied === key ? t("copied") : t("copy");
  };

  // Outer container — `standalone` ships its own top margin (used in
  // SimplifiedView). `embedded` ships no margin; the host grid owns
  // placement. Width is narrower than the prior dossier so the kit
  // reads as a column of editorial fragments, not a card.
  // S-series: max-w tuned to the actual host column width on standard
  // xl viewports. The prior 560/640 caused clipping when the act's
  // right column was narrower than the kit's max-width on 1440-ish
  // screens. Embedded now fills its column without max-w.
  const outerClass =
    variant === "embedded"
      ? "grid w-full max-w-full"
      : "mt-16 grid max-w-[560px] md:mt-24 md:max-w-[640px]";

  // Etiquette rows — the three single-line policy facts. Pulled out
  // so the JSX stack reads linearly instead of inlining a map() with
  // string literals.
  const etiquette = [
    { key: "dress", label: t("dress.label"), value: t("dress.value") },
    { key: "plus", label: t("plusOnes.label"), value: t("plusOnes.value") },
    { key: "late", label: t("late.label"), value: t("late.value") }
  ];

  return (
    <section aria-labelledby={headingId} className={outerClass}>
      {/* The kit's own heading is hidden visually because the host
          act's title already labels the surface. Screen-readers get
          the label via aria-labelledby pointing here so the section's
          purpose is named without typographic duplication. */}
      <h2 id={headingId} className="sr-only">
        {t("heading")}
      </h2>

      {/* ── Address / Map fragment ────────────────────────────────── */}
      <div className="grid gap-2">
        <p className="font-sans text-[11px] tracking-[0.32em] text-[var(--dn-fg-faint)] uppercase">
          {t("address.label")}
        </p>
        <div
          className="relative aspect-[16/7] overflow-hidden rounded-sm bg-neutral-900"
          onPointerEnter={handleMapPointerEnter}
          onPointerLeave={handleMapPointerLeave}
          onPointerDownCapture={handleMapPointerDown}
          onPointerUpCapture={handleMapPointerEnd}
          onPointerCancelCapture={handleMapPointerEnd}
          onWheelCapture={handleMapWheel}
        >
          <Map
            ref={mapRef}
            theme="dark"
            initialState={VENUE_VIEWPORT}
            onViewportChange={handleMapViewportChange}
            keyboard={false}
            className="absolute inset-0 h-full w-full"
          >
            <MapMarker longitude={VENUE_COORDS.lng} latitude={VENUE_COORDS.lat}>
              <MarkerContent>
                <div
                  aria-hidden
                  className="size-2.5 rounded-full bg-white shadow-[0_0_0_5px_rgba(255,255,255,0.18)]"
                />
              </MarkerContent>
            </MapMarker>
          </Map>
          <m.div
            className={
              "pointer-events-none absolute top-3 right-3 z-20 transition-all duration-200 " +
              (showVenueReset
                ? "translate-y-0 opacity-100"
                : "-translate-y-1 opacity-0")
            }
          >
            <Button
              type="button"
              onClick={() => resetVenueViewport(360)}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 font-sans text-[11px] tracking-[0.12em] text-white/84 uppercase shadow-[0_16px_40px_rgba(0,0,0,0.42)] transition-[border-color,background-color,color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] hover:scale-[1.015] hover:text-white hover:shadow-[0_18px_44px_rgba(0,0,0,0.5)] active:scale-[0.985]"
              style={{
                borderColor: "rgba(71, 107, 143, 0.28)",
                backgroundColor: "rgba(2, 8, 14, 0.78)"
              }}
            >
              <span
                aria-hidden
                className="inline-block size-1.5 rounded-full"
                style={{ backgroundColor: "rgba(137, 73, 39, 0.82)" }}
              />
              <span>{t("map.reset")}</span>
            </Button>
          </m.div>
          {/* Address text overlaid bottom-left with gradient scrim */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/76 to-transparent px-4 pt-14 pb-4">
            <p className="font-serif text-[clamp(1rem,1.7vw,1.32rem)] leading-[1.16] tracking-[-0.01em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)]">
              {address}
            </p>
          </div>
        </div>
        {/* Provider deep-links + copy */}
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <MapAppAction
            href={MAP_LINKS.kakao}
            icon={SiKakao}
            accent="#5C2E22"
            iconTone="#A66B4B"
            text={t("map.kakao")}
          />
          <MapAppAction
            href={MAP_LINKS.naver}
            icon={SiNaver}
            accent="#1B334F"
            iconTone="#7894B3"
            text={t("map.naver")}
          />
          <MapAppAction
            href={MAP_LINKS.google}
            icon={SiGooglemaps}
            accent="#24384F"
            iconTone="#8A9BAD"
            text={t("map.google")}
          />
          <RowAction
            onClick={() => copyToClipboard(address, "address")}
            text={copyLabel("address")}
            ariaLabel={copyLabel("address")}
          />
        </div>
      </div>

      {/* ── Payment fragment ──────────────────────────────────────── */}
      <div className="mt-16 grid gap-2">
        <p className="font-sans text-[11px] tracking-[0.32em] text-[var(--dn-fg-faint)] uppercase">
          {t("toss.label")}
        </p>
        <p className="font-serif text-[clamp(2rem,2.4vw,2.6rem)] leading-[1.15] tracking-[-0.01em] text-[var(--dn-fg)]">
          {tossAccount}
        </p>
        <p className="font-serif text-[clamp(1.4rem,1.6vw,1.6rem)] leading-[1.3] tracking-[-0.005em] text-[var(--dn-fg-mute)]">
          {tossHolder}
        </p>
        <p className="font-sans text-[14px] tracking-[0.08em] text-[var(--dn-fg-mute)]">
          {tossAmount}
        </p>
        <div className="mt-3">
          <RowAction
            onClick={() => copyToClipboard(tossClipboard, "toss")}
            text={copyLabel("toss")}
            ariaLabel={copyLabel("toss")}
          />
        </div>
      </div>

      {/* ── Etiquette fragment — 3 hanging-label rows ─────────────── */}
      {/* R1: row gap 13→21, value text scaled up to 15-17px so the
          etiquette reads as part of the kit's body rather than as
          metadata captions. Label col widened 55→64 to fit "+1s"
          tracking without crowding. */}
      <dl className="mt-16 grid gap-6">
        {etiquette.map(({ key, label, value }) => (
          <div
            key={key}
            className="grid grid-cols-[64px_1fr] items-baseline gap-x-6"
          >
            <dt className="font-serif text-sm tracking-wider text-[var(--dn-fg)] italic">
              {label}
            </dt>
            <dd className="text-base leading-[1.4] font-light tracking-[-0.005em] text-[var(--dn-fg)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {/* ── Contact fragment — italic serif pull ──────────────────── */}
      <div className="mt-16 grid grid-cols-[64px_1fr] items-baseline gap-x-6">
        <span className="font-sans text-[11px] tracking-[0.22em] text-[var(--dn-fg-faint)] uppercase">
          {t("host.label")}
        </span>
        <a
          href={hostHref}
          className="ease inline-flex w-fit items-center gap-3 rounded-full border px-5 py-3 font-serif text-[clamp(1.05rem,1.7vw,1.35rem)] leading-[1.2] text-[var(--dn-fg)] italic no-underline transition-[border-color,background-color,transform,gap] duration-200 hover:-translate-y-px hover:gap-4"
          style={{
            borderColor: "color-mix(in oklch, var(--dn-fg) 12%, transparent)",
            backgroundColor:
              "color-mix(in oklch, var(--dn-bg) 78%, transparent)"
          }}
        >
          <span>{hostContact}</span>
          <span aria-hidden className="text-[0.85em] leading-none">
            →
          </span>
        </a>
      </div>
    </section>
  );
}

/**
 * MapAppAction — branded external map launcher. Each provider keeps the same
 * dark pill body, icon capsule, and tiny accent rule so the row reads as one
 * control family while still carrying app identity.
 */
function MapAppAction({
  text,
  href,
  icon: Icon,
  accent,
  iconTone
}: {
  text: string;
  href: string;
  icon: IconType;
  accent: string;
  iconTone: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full border px-3.5 py-2.5 font-sans text-[11px] leading-none font-medium tracking-[0.1em] text-white/82 uppercase no-underline shadow-[0_10px_30px_rgba(0,0,0,0.16)] transition-[border-color,background-color,color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] hover:scale-[1.015] hover:text-white hover:shadow-[0_14px_34px_rgba(0,0,0,0.24)] focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:outline-none active:scale-[0.985]"
      style={{
        borderColor: "rgba(255, 255, 255, 0.12)",
        backgroundColor: "rgba(2, 6, 12, 0.56)"
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-2 left-1 w-px rounded-full opacity-55 transition-opacity duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:opacity-80"
        style={{ backgroundColor: accent }}
      />
      <span
        aria-hidden
        className="grid size-5 place-items-center rounded-full transition-[background-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:scale-[1.04]"
        style={{
          backgroundColor: `${accent}1F`,
          boxShadow: `inset 0 0 0 1px ${accent}42`,
          color: iconTone
        }}
      >
        <Icon className="size-3.5" />
      </span>
      <span>{text}</span>
      <span
        aria-hidden
        className="inline-block w-[0.8em] text-[0.9em] leading-none text-white/40 transition-[color,transform] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:translate-x-0.5 group-hover:text-white/68"
      >
        →
      </span>
    </a>
  );
}

/**
 * RowAction — compact pill link or button. Used for the
 * Address/Payment affordances (Open map, Copy).
 */
function RowAction({
  text,
  onClick,
  href,
  external,
  arrow,
  ariaLabel
}: {
  text: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  arrow?: boolean;
  ariaLabel?: string;
}) {
  const className =
    "group inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 font-sans text-[11px] leading-none font-medium tracking-[0.1em] text-white/82 uppercase no-underline shadow-[0_10px_30px_rgba(0,0,0,0.14)] transition-[border-color,background-color,color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] hover:scale-[1.015] hover:text-white hover:shadow-[0_14px_34px_rgba(0,0,0,0.22)] active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:outline-none";
  const style = {
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(2, 6, 12, 0.5)"
  } as const;
  const inner = (
    <>
      <span>{text}</span>
      {arrow ? (
        <span
          aria-hidden
          className="inline-block w-[0.8em] text-[1em] leading-none text-white/45 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:translate-x-0.5"
        >
          →
        </span>
      ) : null}
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : undefined)}
        className={className}
        aria-label={ariaLabel}
        style={style}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
      style={style}
    >
      {inner}
    </button>
  );
}
