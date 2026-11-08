"use client";

import { Howl, Howler } from "howler";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

import { useHideawayFM, useHideawayFMControls } from "@/hideaway/providers/HideawayFM";
import { useShallow } from "zustand/shallow";

import type { AnchorTrackRef } from "./AnchorMarkers";
import { getTrackById } from "@/payload/Lexical/Features/AmbientAudio/utils/tracks";

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

export interface AmbientAudioContextValue {
  groupCount: number;
  hasAnchors: boolean;
  enabled: boolean;
  activeTrack: AnchorTrackRef | null;
  activeGroupId: string | null;
  playing: boolean;
  toggle: () => void;
}

const AmbientAudioContext = createContext<AmbientAudioContextValue | null>(
  null
);

const FADE_IN_MS = 2200;
const FADE_OUT_MS = 1200;
const ARM_GRACE_MS = 1000;
const HEAD_ROOM = 0.72;
const SCROLL_IDLE_MS = 400;
const DEFAULT_TRACK_SECONDS = 60;

// 0.05s silent WAV. Proven iOS/Safari unlock payload — playing this inside a
// user gesture flips the browser's "user has interacted with audio" flag.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

let __silentUnlocked = false;

function unlockAudioContext() {
  try {
    const ctx = (Howler as unknown as { ctx?: AudioContext }).ctx;
    if (ctx && ctx.state === "suspended") void ctx.resume();
  } catch {
    // noop
  }
  if (__silentUnlocked) return;
  try {
    const el = new Audio(SILENT_WAV);
    el.muted = false;
    el.volume = 0;
    const p = el.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        __silentUnlocked = true;
        try {
          el.pause();
          el.src = "";
        } catch {
          // noop
        }
      }).catch(() => undefined);
    } else {
      __silentUnlocked = true;
    }
  } catch {
    // noop
  }
}

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
      // Skip placeholder regions — they're editor-only.
      if (track.trackId.length === 0) continue;
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

interface ProviderProps {
  children: ReactNode;
  /** CSS selector for the scroll/reading container. Defaults to <body>. */
  containerSelector?: string;
}

export function AmbientAudioProvider({
  children,
  containerSelector
}: ProviderProps) {
  const fmControls = useHideawayFMControls();
  const fmMirror = useHideawayFM(
    useShallow((s) => ({
      realPlaying:
        s.playState.real === "playing" || s.playState.optimistic === "playing",
      elapsedSec: s.elapsedSec
    }))
  );
  const fmMirrorRef = useRef(fmMirror);
  useEffect(() => {
    fmMirrorRef.current = fmMirror;
  }, [fmMirror]);

  const [groups, setGroups] = useState<GroupRuntime[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Snapshot of FM state at the moment we first took control. Restored on
  // release.
  const fmSnapshotRef = useRef<{ wasPlaying: boolean; seekSec: number } | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = containerSelector
      ? ((document.querySelector(containerSelector) as HTMLElement | null) ??
        document.body)
      : document.body;

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

  // Tracks the active group for UI purposes only. Playback is driven by
  // the scroll-coupled state machine below.
  useEffect(() => {
    if (groups.length === 0) return;
    const evaluate = () => {
      let currentId: string | null = null;
      const readingY = window.scrollY + window.innerHeight * 0.5;
      for (const g of groups) {
        const startY = g.startEl.getBoundingClientRect().top + window.scrollY;
        const endY = g.endEl
          ? g.endEl.getBoundingClientRect().top + window.scrollY
          : startY + window.innerHeight;
        if (readingY >= startY && readingY <= endY) {
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

  // If any group's saved track ref lacks a playable URL, lazy-fetch the track
  // by id so we can rehydrate it. Old anchors (or editor paths that didn't
  // capture url) are recovered this way.
  useEffect(() => {
    if (groups.length === 0) return;
    let cancelled = false;
    (async () => {
      let needsUpdate = false;
      const next = await Promise.all(
        groups.map(async (g) => {
          if (g.track.url || !g.track.trackId) return g;
          try {
            const fetched = await getTrackById(g.track.trackId);
            if (fetched && fetched.url) {
              needsUpdate = true;
              // IMPORTANT: preserve the existing Howl instance. Losing it
              // orphans an <audio> element and eventually exhausts Howler's
              // html5 audio pool.
              return { ...g, track: { ...g.track, ...fetched }, howl: g.howl };
            }
          } catch {
            // noop
          }
          return g;
        })
      );
      if (!cancelled && needsUpdate) setGroups(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [groups]);

  // Preload Howls as soon as we discover groups so by the time a user
  // activates the score, the file is already warming up.
  useEffect(() => {
    for (const g of groups) {
      if (g.howl || !g.track.url) continue;
      const url = decodeURIComponent(g.track.url);
      g.howl = new Howl({
        src: [url],
        // The /api/tracks/stream/:id URL has no extension so Howler can't
        // guess the codec. We enumerate the MIME types the Tracks collection
        // accepts; Howler will pick the first the browser supports.
        format: ["mp3", "wav", "aac", "ogg"],
        volume: 0,
        html5: true,
        loop: true,
        preload: true,
        onloaderror: (_id, err) => {
          // eslint-disable-next-line no-console
          console.warn("[AmbientAudio] failed to load", url, err, g.track);
        },
        onplayerror: (_id, err) => {
          // eslint-disable-next-line no-console
          console.warn("[AmbientAudio] play error", err, g.track);
        }
      });
    }
  }, [groups]);

  // Scroll-coupled playback state machine.
  //
  // Invariants:
  // - When NOT armed, we never touch FM or play any Howl. If a Howl is
  //   mid-fade out we let it finish.
  // - When armed + inside a range + scrolling down (or idle), we play the
  //   ambient Howl. On first take-over we snapshot FM's play state and
  //   elapsed seek so we can restore it later.
  // - When armed + scrolling up within range, we pause the Howl but keep
  //   updating the virtual seek so it tracks the user's position.
  // - When armed + outside any range, we release control: fade ambient
  //   out, restore FM to its snapshotted state (playing → play + seek;
  //   paused → leave paused).
  // - Arming from outside → inside has a brief grace period before we
  //   start playing so the transition doesn't feel abrupt.
  useEffect(() => {
    if (groups.length === 0) return;

    type PlaybackState = {
      virtualSeek: number;
      playing: boolean;
      armSince: number | null;
    };

    const states = new Map<string, PlaybackState>();
    for (const g of groups) {
      states.set(g.groupId, {
        virtualSeek: 0,
        playing: false,
        armSince: null
      });
    }

    let scrollDir: "down" | "up" | "idle" = "idle";
    let lastScrollY = window.scrollY;
    let idleTimer: number | null = null;
    let graceTimer: number | null = null;
    let rafId: number | null = null;

    const takeOverFM = () => {
      if (fmSnapshotRef.current !== null) return;
      fmSnapshotRef.current = {
        wasPlaying: fmMirrorRef.current.realPlaying,
        seekSec: fmMirrorRef.current.elapsedSec
      };
      try {
        fmControls.pause();
      } catch {
        // noop
      }
    };

    const releaseFM = () => {
      const snap = fmSnapshotRef.current;
      if (snap === null) return;
      fmSnapshotRef.current = null;
      try {
        fmControls.seek(snap.seekSec);
      } catch {
        // noop
      }
      if (snap.wasPlaying) {
        void fmControls.play().catch(() => undefined);
      }
    };

    const fadeIn = (h: Howl, from: number) => {
      try {
        h.volume(from);
        const id = h.play();
        // Howler's fade is unreliable if called before actual playback
        // begins (it queues against the still-loading state). Schedule
        // the fade on onplay so it starts ramping from real audio output.
        const runFade = () => {
          try {
            h.fade(from, HEAD_ROOM, FADE_IN_MS, id as number | undefined);
          } catch {
            // Fallback: set volume directly so at least we're audible.
            try {
              h.volume(HEAD_ROOM);
            } catch {
              // noop
            }
          }
        };
        if (h.playing()) {
          runFade();
        } else {
          h.once("play", runFade);
          // Backup: if onplay never fires within 500ms, set volume anyway.
          window.setTimeout(() => {
            if (h.volume() < HEAD_ROOM * 0.5) {
              try {
                h.volume(HEAD_ROOM);
              } catch {
                // noop
              }
            }
          }, 600);
        }
      } catch {
        // noop
      }
    };

    const fadeOut = (h: Howl, from: number) => {
      if (from <= 0) {
        try {
          h.pause();
        } catch {
          // noop
        }
        return;
      }
      try {
        h.fade(from, 0, FADE_OUT_MS);
        window.setTimeout(() => {
          try {
            h.pause();
          } catch {
            // noop
          }
        }, FADE_OUT_MS + 50);
      } catch {
        // noop
      }
    };

    const evaluate = () => {
      rafId = null;

      const viewportH = window.innerHeight;
      const readingY = window.scrollY + viewportH * 0.5;

      let anyArmedAndInRange = false;
      const now = performance.now();

      for (const g of groups) {
        const s = states.get(g.groupId)!;
        const startY = g.startEl.getBoundingClientRect().top + window.scrollY;
        const endY = g.endEl
          ? g.endEl.getBoundingClientRect().top + window.scrollY
          : startY + viewportH;
        const rangeHeight = Math.max(1, endY - startY);
        const progress = Math.max(
          0,
          Math.min(1, (readingY - startY) / rangeHeight)
        );
        const inRange = readingY >= startY && readingY <= endY;
        const duration =
          g.track.duration ??
          (g.howl && g.howl.duration() > 0
            ? g.howl.duration()
            : DEFAULT_TRACK_SECONDS);

        // Track virtual seek whether or not we are playing — this is the
        // map from scroll position to track time.
        s.virtualSeek = progress * duration;

        if (!enabled || !inRange) {
          if (s.playing && g.howl) {
            fadeOut(g.howl, g.howl.volume());
            s.playing = false;
          }
          s.armSince = null;
          continue;
        }

        anyArmedAndInRange = true;

        // Start the grace timer the first time we enter an armed+in-range
        // condition so the music doesn't slam in. Schedule a re-eval when
        // the grace expires, otherwise we'd wait for the next scroll to
        // actually start playing.
        if (s.armSince === null) {
          s.armSince = now;
          if (graceTimer !== null) window.clearTimeout(graceTimer);
          graceTimer = window.setTimeout(() => {
            graceTimer = null;
            schedule();
          }, ARM_GRACE_MS + 20);
        }
        const afterGrace = now - s.armSince >= ARM_GRACE_MS;

        const wantsPlay =
          afterGrace && (scrollDir === "down" || scrollDir === "idle");

        if (wantsPlay && !s.playing && g.howl) {
          takeOverFM();
          try {
            g.howl.seek(s.virtualSeek);
          } catch {
            // noop
          }
          fadeIn(g.howl, 0);
          s.playing = true;
        } else if (!wantsPlay && s.playing && g.howl) {
          // Scrolling up or still inside grace — pause but keep tracking
          // virtual seek.
          fadeOut(g.howl, g.howl.volume());
          s.playing = false;
        }
      }

      // No group is armed-and-in-range anymore → release FM control.
      if (!anyArmedAndInRange) {
        releaseFM();
      }
    };

    const schedule = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(evaluate);
    };

    const onScroll = () => {
      const dy = window.scrollY - lastScrollY;
      if (Math.abs(dy) > 0.5) {
        scrollDir = dy > 0 ? "down" : "up";
        lastScrollY = window.scrollY;
      }
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        scrollDir = "idle";
        schedule();
      }, SCROLL_IDLE_MS);
      schedule();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();

    return () => {
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      if (graceTimer !== null) window.clearTimeout(graceTimer);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
      releaseFM();
      for (const g of groups) {
        if (g.howl) {
          try {
            g.howl.pause();
          } catch {
            // noop
          }
        }
      }
    };
  }, [groups, enabled, fmControls]);

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
      // FM restoration is handled by the scroll-coupled effect's cleanup.
    };
  }, [groups]);

  const activeTrack = useMemo(() => {
    if (!activeGroupId) return null;
    return groups.find((g) => g.groupId === activeGroupId)?.track ?? null;
  }, [groups, activeGroupId]);

  const toggle = useCallback(() => {
    const next = !enabled;

    if (next) {
      // Autoplay policy demands a user-gesture-linked play() call. We
      // nudge every loaded Howl at volume 0 and immediately pause the
      // non-active ones — this warms them up and flips the browser's
      // audio-interacted flag for the session.
      unlockAudioContext();
      for (const g of groups) {
        if (!g.howl) continue;
        try {
          g.howl.volume(0);
          g.howl.play();
          const h = g.howl;
          window.setTimeout(() => {
            try {
              h.pause();
            } catch {
              // noop
            }
          }, 20);
        } catch {
          // noop
        }
      }
    }

    setEnabled(next);
  }, [enabled, groups]);

  const value = useMemo<AmbientAudioContextValue>(
    () => ({
      groupCount: groups.length,
      hasAnchors: groups.length > 0,
      enabled,
      activeTrack,
      activeGroupId,
      playing: enabled && activeGroupId !== null,
      toggle
    }),
    [groups.length, enabled, activeTrack, activeGroupId, toggle]
  );

  return <AmbientAudioContext value={value}>{children}</AmbientAudioContext>;
}

export function useAmbientAudio(): AmbientAudioContextValue {
  const r = useContext(AmbientAudioContext);
  if (!r) {
    throw new Error(
      "useAmbientAudio must be used within an AmbientAudioProvider"
    );
  }
  return r;
}
