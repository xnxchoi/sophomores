"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import NumberFlow from "@number-flow/react";
import { useDayNNightScene, useDayNNightStore } from "../store";
import { Button, MotionPillButton } from "@/hideaway/components/core/Button";
import { DAY_SRC, primeDayNNightAudio } from "./DayNNightScore";
import { primeLiminalRadioAudio } from "./LiminalRadioController";

const LOADER_SEEN_KEY = "dn_loader_seen";
const LOADER_SEEN_TTL_MS = 15 * 60 * 1000;
const LOAD_DURATION_MS = 2400;

function hasFreshLoaderSeen(): boolean {
  if (typeof window === "undefined") return false;

  const seenAt = Number(sessionStorage.getItem(LOADER_SEEN_KEY));
  if (!Number.isFinite(seenAt)) {
    sessionStorage.removeItem(LOADER_SEEN_KEY);
    return false;
  }

  if (Date.now() - seenAt > LOADER_SEEN_TTL_MS) {
    sessionStorage.removeItem(LOADER_SEEN_KEY);
    return false;
  }

  return true;
}

function markLoaderSeen(): void {
  sessionStorage.setItem(LOADER_SEEN_KEY, String(Date.now()));
}

interface SunLoaderProps {
  /** Called once the exit transition completes. */
  onEnter: (withAudio: boolean) => void;
  /** Called immediately when "See summary" is pressed (before transition). */
  onSummary: () => void;
}

export function SunLoader({ onEnter, onSummary }: SunLoaderProps) {
  const t = useTranslations("Event.DayNNight");
  const [hiding, setHiding] = useState(false);
  const [count, setCount] = useState(0);
  const [progressDone, setProgressDone] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const horizonRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const setSceneProgress = useDayNNightScene((r) => r.setProgress);
  const setPhase = useDayNNightScene((r) => r.setPhase);
  const setLoaderProgress = useDayNNightScene((r) => r.setLoaderProgress);
  const store = useDayNNightStore();

  // Synchronous check — avoids a flash of loader chrome on SPA re-entry.
  const skipLoader = hasFreshLoaderSeen();

  // Skip path: already seen this session — hand off without showing chrome.
  useEffect(() => {
    if (!skipLoader) return;
    setLoaderProgress(1);
    setPhase("playing");
  }, [skipLoader, setLoaderProgress, setPhase]);

  useEffect(() => {
    if (skipLoader) return;

    const audio = new Audio(DAY_SRC);
    let audioSettled = false;
    const markAudioReady = () => {
      if (audioSettled) return;
      audioSettled = true;
      setAudioReady(true);
    };
    audio.preload = "auto";
    audio.addEventListener("canplaythrough", markAudioReady, { once: true });
    audio.addEventListener("loadeddata", markAudioReady, { once: true });
    audio.addEventListener("error", markAudioReady, { once: true });
    audio.load();

    let raf: number;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const u = Math.min(1, elapsed / LOAD_DURATION_MS);

      const horizonLoop = store.getState().horizonLoop;
      const stage1End = 0.4 * horizonLoop;
      let sceneProgress: number;
      if (u < 0.4) {
        sceneProgress = (u / 0.4) * stage1End;
      } else {
        const stage2 = (u - 0.4) / 0.6;
        const eased = 1 - Math.pow(1 - stage2, 2.5);
        sceneProgress = stage1End + eased * (horizonLoop - stage1End);
      }
      setSceneProgress(sceneProgress);
      setLoaderProgress(u);
      setCount(Math.round(u * 100));

      if (horizonRef.current) {
        horizonRef.current.style.transform = `translate(-50%, -50%) scaleX(${u})`;
      }
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${u})`;
      }
      if (sunRef.current) {
        const SUN_BASE_HALF_PX = 32;
        const SUN_HANDOFF_SCALE = 1.353;
        const riseY = (1 - u) * SUN_BASE_HALF_PX * SUN_HANDOFF_SCALE;
        sunRef.current.style.transform = `translateY(${riseY}px) scale(${SUN_HANDOFF_SCALE})`;
      }

      if (u < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setPhase("loaded");
        setProgressDone(true);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      audio.pause();
      audio.removeEventListener("canplaythrough", markAudioReady);
      audio.removeEventListener("loadeddata", markAudioReady);
      audio.removeEventListener("error", markAudioReady);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipLoader]);

  const ready = progressDone && audioReady;

  const handleEnter = (withAudio: boolean) => {
    markLoaderSeen();
    // Unlock audio while the click gesture is still live — the score's
    // own setup runs ~700ms+ later (fade timeout + mount gating), too
    // late to satisfy the browser autoplay policy on its own.
    if (withAudio) {
      primeDayNNightAudio();
      primeLiminalRadioAudio();
    }
    onEnter(withAudio);
    setHiding(true);
    setTimeout(() => {
      setSceneProgress(store.getState().initialLoopPosition);
      setPhase("playing");
    }, 700);
  };

  const handleSummary = () => {
    onSummary();
    handleEnter(false);
  };

  if (skipLoader) return null;

  return (
    <div
      className="group fixed inset-0 z-[60] text-[var(--dn-fg)]"
      style={
        {
          "--dn-fg": "oklch(96% 0.005 80)",
          "--dn-fg-mute": "oklch(96% 0.005 80 / 0.7)",
          "--dn-bg": "oklch(8% 0 0)"
        } as React.CSSProperties
      }
      data-hiding={hiding}
    >
      {/* Dark backdrop */}
      <div
        aria-hidden
        className="ease pointer-events-none absolute inset-0 bg-faded-black/99 transition-opacity duration-700 group-data-[hiding='true']:opacity-0"
      />

      {/* Sky clip — hides sun below the horizon during rise */}
      <div
        className="pointer-events-none absolute inset-0 [clip-path:inset(0_0_50%_0)]"
        aria-hidden
      >
        <div
          ref={sunRef}
          className="absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,oklch(92%_0.12_75)_0%,oklch(85%_0.16_60)_40%,oklch(75%_0.18_45)_70%,oklch(65%_0.14_35/0)_100%)] shadow-[0_0_40px_0_oklch(85%_0.16_60/0.5),0_0_80px_0_oklch(80%_0.14_50/0.3)] will-change-transform group-data-[hiding='true']:opacity-0 group-data-[hiding='true']:transition-opacity group-data-[hiding='true']:duration-700"
          aria-hidden
        />
      </div>

      {/* Horizon line — scaleX grows 0→1 in lockstep with the sun.
           Wrapper receives the JS transform; children handle visuals. */}
      <div
        ref={horizonRef}
        className="absolute top-1/2 left-1/2 h-px w-[min(85vw,1400px)] origin-center scale-0 overflow-visible transition-[transform_0.3s_cubic-bezier(0.25,0.46,0.45,0.95),opacity_0.7s_ease] group-data-[hiding='true']:opacity-0"
        aria-hidden
      >
        {/* Soft atmospheric haze — breathes above/below the line */}
        <div
          data-dn-loader-glow
          className="pointer-events-none absolute inset-x-0 top-0 h-[14px] -translate-y-1/2"
        />
        {/* Core glow line — flickers organically */}
        <div
          data-dn-loader-line
          className="absolute inset-x-0 top-0 h-px -translate-y-1/2 bg-faded-white/85 shadow-[0_0_6px_0_oklch(85%_0.08_70/0.35),0_0_18px_0_oklch(80%_0.06_60/0.18)]"
        />
        {/* Shimmer pass A — left to right */}
        <div
          data-dn-loader-shimmer
          className="pointer-events-none absolute inset-x-0 top-0 h-px -translate-y-1/2"
        />
        {/* Shimmer pass B — phase-shifted, warmer tint */}
        <div
          data-dn-loader-shimmer2
          className="pointer-events-none absolute inset-x-0 top-0 h-px -translate-y-1/2"
        />
      </div>

      {/* Top-edge fill bar */}
      <div
        aria-hidden
        className="pointer-events-none relative h-px w-full overflow-hidden bg-[oklch(from_var(--dn-fg)_l_c_h_/_0.18)]"
      >
        <div
          ref={fillRef}
          className="ease absolute inset-0 origin-left scale-x-0 bg-[oklch(from_var(--dn-fg)_l_c_h_/_0.7)] transition-transform duration-300"
        />
      </div>

      {/* Bottom stage — progress counter fades to action buttons on load complete */}
      <div className="pointer-events-none absolute bottom-[32%] left-1/2 flex w-[min(80vw,360px)] -translate-x-1/2 flex-col items-center gap-4">
        {/* Progress counter — visible while loading */}
        <div
          aria-hidden
          className="absolute transition-opacity duration-500"
          style={{ opacity: ready ? 0 : 1 }}
        >
          <NumberFlow
            value={count}
            className="font-sans text-[clamp(2rem,5vw,3.5rem)] font-light text-[var(--dn-fg)] tabular-nums"
            format={{ minimumIntegerDigits: 2 }}
            respectMotionPreference={false}
          />
        </div>

        {/* Action buttons — fade in when loading completes */}
        <div
          className="flex flex-col items-center gap-4 transition-opacity duration-500 group-data-[hiding='true']:opacity-0 group-data-[hiding='true']:duration-700"
          style={{
            opacity: ready ? 1 : 0,
            pointerEvents: ready ? "auto" : "none"
          }}
        >
          <MotionPillButton
            type="button"
            onClick={() => handleEnter(true)}
            className="inline-flex items-center gap-2.5 border border-[var(--dn-fg)] px-9 py-3 font-sans text-sm font-medium tracking-tight text-[var(--dn-fg)] transition-[background-color,color] duration-200 hover:bg-[var(--dn-fg)] hover:text-[var(--dn-bg)]"
          >
            <span aria-hidden className="text-[12px] leading-none opacity-55">
              ♪
            </span>
            {t("loader.enter")}
          </MotionPillButton>

          <Button
            type="button"
            onClick={handleSummary}
            className="mt-1 font-sans text-[10px] tracking-[0.2em] text-[var(--dn-fg-mute)] uppercase opacity-30 transition-opacity duration-200 hover:opacity-70"
          >
            {t("loader.summary")}
          </Button>
        </div>
      </div>
    </div>
  );
}
