"use client";

import { Howl } from "howler";
import { AnimatePresence, LayoutGroup } from "motion/react";
import * as m from "motion/react-m";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";

import { useHideawayFMControls } from "@/hideaway/providers/HideawayFM";

import type { AnchorTrackRef } from "./AnchorMarkers";

interface AnchorRef {
  el: HTMLElement;
  kind: "start" | "end";
  groupId: string;
  track: AnchorTrackRef;
}

interface GroupRuntime {
  groupId: string;
  startEl: HTMLElement;
  endEl: HTMLElement | null;
  track: AnchorTrackRef;
  howl: Howl | null;
}

type IslandState = "idle" | "available" | "armed" | "scoring";

const FADE_MS = 1200;
const HEAD_ROOM = 0.7;

function readAnchors(root: HTMLElement): AnchorRef[] {
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>("[data-ambient-anchor]")
  );
  const refs: AnchorRef[] = [];
  for (const el of nodes) {
    const kind = el.getAttribute("data-ambient-anchor");
    const groupId = el.getAttribute("data-ambient-group");
    const raw = el.getAttribute("data-ambient-track");
    if (!groupId || !raw || (kind !== "start" && kind !== "end")) continue;
    try {
      const track = JSON.parse(raw) as AnchorTrackRef;
      if (!track || typeof track.trackId !== "string") continue;
      refs.push({ el, kind, groupId, track });
    } catch {
      // ignore malformed
    }
  }
  return refs;
}

function groupAnchors(refs: AnchorRef[]): GroupRuntime[] {
  const by = new Map<string, { start?: AnchorRef; end?: AnchorRef }>();
  for (const r of refs) {
    const entry = by.get(r.groupId) ?? {};
    if (r.kind === "start") entry.start = r;
    else entry.end = r;
    by.set(r.groupId, entry);
  }
  const out: GroupRuntime[] = [];
  for (const [groupId, pair] of by.entries()) {
    if (!pair.start) continue;
    out.push({
      groupId,
      startEl: pair.start.el,
      endEl: pair.end?.el ?? null,
      track: pair.start.track,
      howl: null
    });
  }
  return out;
}

function formatTrackLabel(track: AnchorTrackRef): string {
  const title = track.title ?? "Untitled";
  return track.artist ? `${track.artist} · ${title}` : title;
}

interface RunnerProps {
  containerSelector?: string;
}

export function AmbientAudioRunner({
  containerSelector = "article, [data-ambient-root]"
}: RunnerProps) {
  const fmControls = useHideawayFMControls();
  const [groups, setGroups] = useState<GroupRuntime[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fmPausedRef = useRef(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    reducedMotionRef.current =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const root =
      (document.querySelector(containerSelector) as HTMLElement | null) ??
      document.body;

    const keyFor = (gs: GroupRuntime[]) =>
      gs
        .map((g) => g.groupId)
        .sort()
        .join("|");

    const scan = () => {
      const anchors = readAnchors(root);
      const built = groupAnchors(anchors);
      setGroups((prev) => (keyFor(prev) === keyFor(built) ? prev : built));
    };

    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [containerSelector]);

  useEffect(() => {
    if (groups.length === 0) return;

    const evaluate = () => {
      const viewportH = window.innerHeight;
      let currentId: string | null = null;
      for (const g of groups) {
        const startRect = g.startEl.getBoundingClientRect();
        const endRect = g.endEl?.getBoundingClientRect();
        const startPassed = startRect.top < viewportH * 0.8;
        const endPassed = endRect ? endRect.top < 0 : false;
        if (startPassed && !endPassed) {
          currentId = g.groupId;
          break;
        }
      }
      setActiveGroupId(currentId);
    };

    const obs = new IntersectionObserver(() => evaluate(), {
      threshold: [0, 0.25, 0.5, 0.75, 1]
    });
    for (const g of groups) {
      obs.observe(g.startEl);
      if (g.endEl) obs.observe(g.endEl);
    }

    window.addEventListener("scroll", evaluate, { passive: true });
    window.addEventListener("resize", evaluate);
    evaluate();

    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", evaluate);
      window.removeEventListener("resize", evaluate);
    };
  }, [groups]);

  useEffect(() => {
    if (groups.length === 0) return;
    if (reducedMotionRef.current) return;

    for (const g of groups) {
      const shouldPlay = enabled && g.groupId === activeGroupId;

      if (shouldPlay) {
        if (!g.howl && g.track.url) {
          g.howl = new Howl({
            src: [g.track.url],
            volume: 0,
            html5: true,
            loop: true,
            preload: true
          });
        }
        if (!fmPausedRef.current) {
          fmControls.pause();
          fmPausedRef.current = true;
        }
        if (g.howl) {
          g.howl.play();
          g.howl.fade(g.howl.volume(), HEAD_ROOM, FADE_MS);
        }
      } else if (g.howl) {
        const from = g.howl.volume();
        const h = g.howl;
        h.fade(from, 0, FADE_MS);
        window.setTimeout(() => {
          try {
            h.stop();
          } catch {
            // noop
          }
        }, FADE_MS + 50);
      }
    }

    if ((!enabled || activeGroupId === null) && fmPausedRef.current) {
      fmPausedRef.current = false;
      void fmControls.play().catch(() => undefined);
    }
  }, [groups, enabled, activeGroupId, fmControls]);

  useEffect(() => {
    return () => {
      for (const g of groups) {
        if (g.howl) {
          try {
            g.howl.stop();
            g.howl.unload();
          } catch {
            // noop
          }
          g.howl = null;
        }
      }
      if (fmPausedRef.current) {
        fmPausedRef.current = false;
        void fmControls.play().catch(() => undefined);
      }
    };
  }, [groups, fmControls]);

  const activeTrack = useMemo(() => {
    if (!activeGroupId) return null;
    return groups.find((g) => g.groupId === activeGroupId)?.track ?? null;
  }, [groups, activeGroupId]);

  const toggle = useCallback(() => {
    setEnabled((v) => !v);
  }, []);

  if (!mounted) return null;

  const hasAnchors = groups.length > 0;
  const hasActiveRange = activeGroupId !== null;
  const playing = enabled && hasActiveRange;

  const state: IslandState = !hasAnchors
    ? "idle"
    : playing
      ? "scoring"
      : enabled
        ? "armed"
        : "available";

  return (
    <AmbientIsland
      state={state}
      groupCount={groups.length}
      track={activeTrack}
      onToggle={toggle}
    />
  );
}

/* ----------------------------- Island UI ------------------------------- */

interface AmbientIslandProps {
  state: IslandState;
  groupCount: number;
  track: AnchorTrackRef | null;
  onToggle: () => void;
}

const spring = { type: "spring" as const, bounce: 0.28, visualDuration: 0.35 };
const fadeSpring = {
  type: "spring" as const,
  bounce: 0.2,
  visualDuration: 0.3
};

function AmbientIsland({
  state,
  groupCount,
  track,
  onToggle
}: AmbientIslandProps) {
  const compact = state === "available";
  const expanded = state === "armed" || state === "scoring";
  const playing = state === "scoring";

  const containerStyle: CSSProperties = {
    position: "fixed",
    left: "50%",
    bottom: 24,
    transform: "translateX(-50%)",
    zIndex: 125,
    pointerEvents: "auto"
  };

  return (
    <div style={containerStyle}>
      <LayoutGroup>
        <AnimatePresence initial={false} mode="sync">
          <m.button
            key="island"
            layout
            type="button"
            onClick={onToggle}
            aria-pressed={state !== "available"}
            aria-label={
              playing
                ? "Mute ambient score"
                : state === "armed"
                  ? "Disarm ambient audio"
                  : "Enable ambient audio"
            }
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={spring}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="relative isolate overflow-hidden rounded-full border border-white/5 select-none"
            style={{
              padding: 1,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.05) inset, 0 20px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.25)"
            }}
          >
            {/* blurred backdrop layer (Dynamic Island's liquid glass) */}
            <m.span
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{
                background: "oklch(0.12 0 0 / 0.72)",
                backdropFilter: "blur(24px) saturate(1.4)",
                WebkitBackdropFilter: "blur(24px) saturate(1.4)"
              }}
            />
            {/* content ring */}
            <m.span
              layout
              transition={spring}
              className="relative z-[1] flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "oklch(0.97 0 0 / 0.88)"
              }}
            >
              <IslandGlyph state={state} />

              <AnimatePresence initial={false} mode="popLayout">
                {state === "idle" ? (
                  <m.span
                    key="idle"
                    layout
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 0.6, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={fadeSpring}
                    className="whitespace-nowrap text-white/55"
                  >
                    Ambient · searching
                  </m.span>
                ) : null}

                {compact ? (
                  <m.span
                    key="compact"
                    layout
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={fadeSpring}
                    className="whitespace-nowrap"
                  >
                    Ambient · {groupCount}{" "}
                    <span className="text-white/50">
                      {groupCount === 1 ? "passage" : "passages"}
                    </span>
                  </m.span>
                ) : null}

                {state === "armed" ? (
                  <m.span
                    key="armed"
                    layout
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={fadeSpring}
                    className="whitespace-nowrap"
                  >
                    Ambient · armed
                  </m.span>
                ) : null}

                {state === "scoring" && track ? (
                  <m.span
                    key={`scoring-${track.trackId}`}
                    layout
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={fadeSpring}
                    className="flex min-w-0 items-center gap-2 whitespace-nowrap"
                  >
                    <ScoringDots />
                    <span
                      className="max-w-[32ch] truncate"
                      style={{
                        textTransform: "none",
                        letterSpacing: "0.02em",
                        fontSize: 11,
                        color: "oklch(0.97 0 0 / 0.95)"
                      }}
                    >
                      {formatTrackLabel(track)}
                    </span>
                  </m.span>
                ) : null}
              </AnimatePresence>

              {expanded ? (
                <m.span
                  key="close"
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 0.55, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={fadeSpring}
                  aria-hidden
                  className="ml-1 inline-flex h-[14px] w-[14px] items-center justify-center rounded-full"
                  style={{ background: "oklch(0.97 0 0 / 0.08)" }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
                    <path
                      d="M1 1 L7 7 M7 1 L1 7"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </m.span>
              ) : null}
            </m.span>
          </m.button>
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}

/* ----------------------------- Glyphs ---------------------------------- */

function IslandGlyph({ state }: { state: IslandState }) {
  const playing = state === "scoring";
  const muted = state === "available";

  return (
    <m.span
      layout
      className="relative inline-flex h-[14px] w-[14px] items-center justify-center"
      aria-hidden
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: playing ? 1 : muted ? 0.7 : 0.9 }}
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {muted ? (
          <>
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        ) : (
          <>
            <path
              d="M15.54 8.46a5 5 0 0 1 0 7.07"
              style={{ opacity: playing ? 1 : 0.55 }}
            />
            <path
              d="M19.07 4.93a10 10 0 0 1 0 14.14"
              style={{ opacity: playing ? 1 : 0.3 }}
            />
          </>
        )}
      </svg>
    </m.span>
  );
}

function ScoringDots() {
  return (
    <span
      aria-hidden
      className="inline-flex items-end gap-[2px]"
      style={{ height: 10 }}
    >
      {[0, 1, 2].map((i) => (
        <m.span
          key={i}
          style={{
            display: "inline-block",
            width: 2,
            borderRadius: 1,
            background: "currentColor"
          }}
          animate={{ height: ["30%", "100%", "40%"] }}
          transition={{
            duration: 0.9 + i * 0.15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.12
          }}
        />
      ))}
    </span>
  );
}
