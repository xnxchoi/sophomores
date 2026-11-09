"use client";

import { useEffect, useRef, useState } from "react";
import { useDayNNightStore } from "../store";

/**
 * Page-local audio score for the Day n Night immersive scene.
 *
 *   Act I/II  — Daytime: country bed (daytime.ogg)
 *   Act III+  — Liminal/Night: HideawayFM Track_1 (LiminalRadioController)
 *   Late Closing — silence, then daytime returns at the loop wrap
 *
 * Gain is purely scroll-driven for the full loop cycle. See resolveDayGain.
 *
 * Missing-file path: if daytime.ogg fails to decode, the audio toggle
 * unmounts itself and the rest of the page is unaffected.
 */

export const DAY_SRC = "/assets/audio/day-n-night/daytime.ogg";

const BASE_VOL = 0.38;

const RAMP_FAST = 0.08;

/**
 * Daytime fade windows — scroll-driven for the full loop.
 *
 * Fade-out: country bed leaves as Dress transitions to Liminal.
 * Fade-in:  daytime returns as Closing ends and the sky lifts back to
 *           dawn/daytime before the seamless loop wrap.
 *
 * SKY_STOPS landmarks (from store.tsx) — for reference:
 *   0.279  Cookout
 *   0.478  Dress / sunset peak
 *   0.664  Night center
 *   0.876  Closing center
 *   0.94   dawn rising
 *   0.98   sunrise bright
 *   1.00   daytime (loop wrap)
 */
const DAY_FADE_IN = 0.36;
const DAY_FADE_OUT = 0.48;
// Return window: daytime fades back in as Closing ends and the dawn
// sky lifts. DAY_RETURN_IN sits a beat after RADIO_SILENCE_AT (0.92)
// in LiminalRadioController so the radio is already silent when the
// country bed audibly re-enters.
const DAY_RETURN_IN = 0.93;
const DAY_RETURN_OUT = 0.99;

interface TrackPipeline {
  audio: HTMLAudioElement;
  gain: GainNode;
}

// ── Gesture-primed AudioContext ──────────────────────────────────────
// Browsers (iOS Safari especially) only let an AudioContext leave the
// `suspended` state if it is created + resumed inside a user-gesture
// handler. DayNNightScore's setup effect runs ~700ms+ after the loader's
// "Enter" click (loader fade timeout + mount gating), well outside that
// window — so the context stayed suspended and audio never started.
//
// `primeDayNNightAudio()` is called synchronously from the Enter click
// (see SunLoader): it creates and resumes a context while the gesture
// is still live. DayNNightScore then consumes that primed context
// instead of constructing a fresh (suspended) one.
let primedAudioContext: AudioContext | null = null;
let primedDayTrack: HTMLAudioElement | null = null;

export function primeDayNNightAudio(): void {
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctx = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctx) return;
  try {
    primedAudioContext = primedAudioContext ?? new Ctx();
    void primedAudioContext.resume().catch(() => {});

    if (primedDayTrack) return;
    const audio = new Audio(DAY_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    primedDayTrack = audio;
    void audio
      .play()
      .then(() => {
        if (primedDayTrack !== audio) return;
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => {
        if (primedDayTrack === audio) primedDayTrack = null;
      });
  } catch {
    primedAudioContext = null;
    primedDayTrack = null;
  }
}

function takePrimedAudioContext(): AudioContext | null {
  const ctx = primedAudioContext;
  primedAudioContext = null;
  return ctx;
}

function takePrimedDayTrack(): HTMLAudioElement | null {
  const audio = primedDayTrack;
  primedDayTrack = null;
  return audio;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Pure scroll-driven gain resolver for the full loop.
 *
 *   0 → DAY_FADE_IN         full volume
 *   DAY_FADE_IN → FADE_OUT  fade out (1 → 0)
 *   FADE_OUT → RETURN_IN    silence (night / liminal / closing)
 *   RETURN_IN → RETURN_OUT  fade back in (0 → 1) as dawn breaks
 */
function resolveDayGain(progress: number): number {
  if (progress >= DAY_RETURN_IN) {
    return smoothstep(DAY_RETURN_IN, DAY_RETURN_OUT, progress);
  }
  if (progress >= DAY_FADE_OUT) return 0;
  return 1 - smoothstep(DAY_FADE_IN, DAY_FADE_OUT, progress);
}

export function DayNNightScore({ enabled }: { enabled: boolean }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const dayRef = useRef<TrackPipeline | null>(null);
  const store = useDayNNightStore();

  // Spin up the AudioContext + daytime pipeline on first enable.
  useEffect(() => {
    if (!enabled) return;

    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctx) {
      setFailed(true);
      return;
    }
    // Reuse the context primed inside the Enter-click gesture if there
    // is one; otherwise (e.g. the user toggled the SOUND pill directly,
    // itself a gesture) construct a fresh one.
    const ctx = takePrimedAudioContext() ?? new Ctx();
    ctxRef.current = ctx;

    const makeTrack = (src: string): Promise<TrackPipeline | null> =>
      new Promise((resolve) => {
        const audio =
          src === DAY_SRC
            ? (takePrimedDayTrack() ?? new Audio(src))
            : new Audio(src);
        audio.loop = true;
        audio.preload = "auto";
        audio.volume = 1;
        let settled = false;
        const onLoad = () => {
          if (settled) return;
          settled = true;
          try {
            const source = ctx.createMediaElementSource(audio);
            const gain = ctx.createGain();
            gain.gain.value = 0;
            source.connect(gain).connect(ctx.destination);
            resolve({ audio, gain });
          } catch {
            resolve(null);
          }
        };
        const onFail = () => {
          if (settled) return;
          settled = true;
          resolve(null);
        };
        if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          queueMicrotask(onLoad);
          return;
        }
        audio.addEventListener("canplaythrough", onLoad, { once: true });
        audio.addEventListener("loadeddata", onLoad, { once: true });
        audio.addEventListener("error", onFail, { once: true });
        audio.load();
      });

    let cancelled = false;
    void makeTrack(DAY_SRC).then((day) => {
      if (cancelled) return;
      if (!day) {
        setFailed(true);
        if (ctx.state !== "closed") {
          void ctx.close().catch(() => {});
        }
        return;
      }
      dayRef.current = day;
      void ctx
        .resume()
        .then(() => day.audio.play())
        .then(() => {
          setReady(true);
        })
        .catch(() => setFailed(true));
    });

    return () => {
      cancelled = true;
      dayRef.current?.audio.pause();
      if (ctxRef.current && ctxRef.current.state !== "closed") {
        void ctxRef.current.close().catch(() => {});
      }
      ctxRef.current = null;
      dayRef.current = null;
      setReady(false);
    };
  }, [enabled]);

  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let active = true;

    const tick = () => {
      if (!active) return;
      const ctx = ctxRef.current;
      const d = dayRef.current;
      if (!ctx || !d || ctx.state === "closed") {
        raf = requestAnimationFrame(tick);
        return;
      }

      const day = resolveDayGain(store.getState().progress);
      const now = ctx.currentTime;
      try {
        d.gain.gain.setTargetAtTime(day * BASE_VOL, now, RAMP_FAST);
      } catch {
        // Context may transition to closed between the guard above and
        // this write; swallow and let cleanup stop the rAF.
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      active = false;
      cancelAnimationFrame(raf);
    };
  }, [ready, store]);

  void failed;
  return null;
}
