"use client";

import { lerp } from "@/hideaway/utilities/rp_utils";
import { useMotionValue, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef } from "react";
import {
  SKY_STOPS,
  HORIZON_Y,
  useDayNNightStore,
  useSampleCelestial
} from "../store";

/**
 * Day n Night scene — pure CSS/HTML implementation.
 *
 * Three layers:
 *   1. Sky gradient (full-bleed)
 *   2. Horizon glow band at the horizon line — visible during the loader
 *      as a wide horizontal stream of light before the sun appears, and
 *      held at low opacity during the scene as atmospheric warmth.
 *   3. The sun — a glowing disk whose position is driven by:
 *        - `phase === "loading" | "loaded"`: loader-stage math, spanning
 *          scene-progress [0, horizonLoop] (horizonLoop = anchor-act
 *          center; live-measured). Stage 1 (progress < 0.4·horizonLoop)
 *          keeps the sun below the horizon while the glow band fades in.
 *          Stage 2 (≥ 0.4·horizonLoop) rises the sun to exactly HORIZON_Y.
 *        - `phase === "playing"`: the celestial sampler. The sun continues
 *          rising vertically through the viewport. At loop boundaries it's
 *          off-screen on both sides, so the modulo wrap is invisible.
 *
 * Scene-progress IS loopProgress directly — there's no longer a 0.05
 * offset between loader and scene. The loop wraps 1.0 → 0.0 at
 * pre-dawn (SKY_STOPS[0] === SKY_STOPS[last]) so there's no jerk.
 *
 * The sun is one DOM element across phases — only its position values
 * change. Combined with a CSS transition on `left/bottom`, this gives a
 * single continuous motion through the loader and into the scene.
 */
export function SceneView() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const horizonRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const moonRef = useRef<HTMLDivElement>(null);
  const store = useDayNNightStore();
  const progressValue = useMotionValue(store.getState().progress);
  useEffect(
    () =>
      store.subscribe((state) => {
        progressValue.set(state.progress);
      }),
    [progressValue, store]
  );
  const p_ = useTransform(progressValue, [0, 1], [0, 1]);
  const sky_ = useTransform(() => {
    const p = p_.get();
    for (let i = 0; i < SKY_STOPS.length - 1; i++) {
      const a = SKY_STOPS[i];
      const b = SKY_STOPS[i + 1];
      if (p >= a.at && p <= b.at) {
        const t = b.at === a.at ? 0 : (p - a.at) / (b.at - a.at);
        return {
          top: [
            lerp(a.top[0], b.top[0], t),
            lerp(a.top[1], b.top[1], t),
            lerp(a.top[2], b.top[2], t)
          ],
          mid: [
            lerp(a.mid[0], b.mid[0], t),
            lerp(a.mid[1], b.mid[1], t),
            lerp(a.mid[2], b.mid[2], t)
          ],
          bottom: [
            lerp(a.bottom[0], b.bottom[0], t),
            lerp(a.bottom[1], b.bottom[1], t),
            lerp(a.bottom[2], b.bottom[2], t)
          ]
        } as {
          top: [number, number, number];
          mid: [number, number, number];
          bottom: [number, number, number];
        };
      }
    }

    const last = SKY_STOPS[SKY_STOPS.length - 1];
    return { top: last.top, mid: last.mid, bottom: last.bottom } as {
      top: [number, number, number];
      mid: [number, number, number];
      bottom: [number, number, number];
    };
  });
  const c = useSampleCelestial();

  useEffect(() => {
    let raf = 0;

    const apply = () => {
      const state = store.getState();
      const { horizonLoop, phase, progress } = state;

      // Sun: phase-aware position. The loader owns progress [0, horizonLoop];
      // the scene takes over from horizonLoop onward — both use the same
      // continuous progress value, no offset.
      if (sunRef.current) {
        let leftPct: number;
        let bottomPct: number;
        let opacity: number;
        let scale: number;

        if (phase === "loading" || phase === "loaded") {
          // Loader sun position. The classic "rise from below horizon"
          // gesture only makes sense when horizonLoop > 0 — i.e. when
          // there's scene-progress room between 0 and the handoff
          // target. With anchor=0 (Opening), horizonLoop collapses to
          // ~0 and we have no rise to stage; fall through to the same
          // sampler the playing phase uses so the sun sits at its
          // scene-resting position throughout the loader.
          if (horizonLoop > 0.005) {
            // Staged rise (preserved for non-zero anchors).
            //   Stage 1 (progress < 0.4·horizonLoop): sun below horizon
            //     while the glow band fades in.
            //   Stage 2 (≥ 0.4·horizonLoop): sun rises through horizon
            //     and ends at exactly HORIZON_Y.
            const stage1End = 0.4 * horizonLoop;
            let sunY: number;
            if (progress < stage1End) {
              sunY = -0.25; // tucked well below the horizon, invisible
            } else {
              const stage2T = Math.min(
                1,
                (progress - stage1End) / (horizonLoop - stage1End)
              );
              const eased = 1 - Math.pow(1 - stage2T, 2.5);
              sunY = -0.2 + eased * (HORIZON_Y + 0.2); // -0.2 → 0.5
            }
            leftPct = 50;
            bottomPct = sunY * 100;
            opacity = Math.max(0, Math.min(1, (sunY + 0.05) / 0.2));
            scale = 1.15;
          } else {
            // Anchor at Opening: scene already at its resting state.
            // Drive the sun from sampleCelestial just like in playing.
            leftPct = 50 + c.sun.x * 40;
            bottomPct = c.sun.y.get() * 100;
            opacity = c.sun.opacity.get();
            scale = c.sun.size.get() / 0.085;
          }
        } else {
          leftPct = 50 + c.sun.x * 40;
          bottomPct = c.sun.y.get() * 100;
          opacity = c.sun.opacity.get();
          scale = c.sun.size.get() / 0.085;
        }

        sunRef.current.style.left = `${leftPct}%`;
        sunRef.current.style.bottom = `${bottomPct}%`;
        sunRef.current.style.opacity = String(opacity);
        sunRef.current.style.setProperty("--body-scale", String(scale));
      }

      // Horizon glow band — bright during the loader, dim during the scene.
      if (horizonRef.current) {
        let horizonOpacity: number;
        let horizonBrightness: number;
        if (phase === "loading" || phase === "loaded") {
          // Stage 1 fades in across [0, 0.4·horizonLoop]; stage 2 holds
          // at full while the sun rises.
          const stage1End = 0.4 * horizonLoop;
          if (progress < stage1End && stage1End > 0) {
            horizonOpacity = progress / stage1End;
            horizonBrightness = 1;
          } else {
            horizonOpacity = 1;
            horizonBrightness = 1;
          }
        } else {
          // Subtle atmospheric trace as the sun continues rising.
          horizonOpacity = 0.35;
          horizonBrightness = 0.65;
        }
        horizonRef.current.style.opacity = String(horizonOpacity);
        horizonRef.current.style.setProperty(
          "--horizon-brightness",
          String(horizonBrightness)
        );
      }

      // Moon — currently hidden by the single-direction rule. Kept in the
      // DOM so the celestial sampler stays uniform.
      if (moonRef.current) {
        moonRef.current.style.opacity = "0";
      }

      raf = requestAnimationFrame(apply);
    };

    raf = requestAnimationFrame(apply);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [c, sky_, store]);

  return (
    <div
      ref={wrapRef}
      // Desktop: `absolute inset-0` of the pinned, viewport-height
      // Timeline wrap — already a small layer.
      // Mobile: the Timeline wrap is `h-auto` (the full ~11k-px stacked
      // column), so `absolute inset-0` would stretch the sky gradient
      // (and the blurred horizon glow) into a page-tall composited
      // layer. On iOS Safari that exceeds WebKit's layer/texture budget
      // and the layer fails to paint at all — black sky, and the
      // adaptive text loop then reads a missing sky and inks the copy
      // black too. `max-lg:fixed` pins the scene to the viewport so its
      // layers stay viewport-sized and iOS-safe.
      className="pointer-events-none absolute inset-0 z-0 max-lg:fixed"
      aria-hidden
    >
      <div
        ref={skyRef}
        data-dn-sky
        className="pointer-events-none absolute inset-0 z-0"
      />
      <m.div
        data-dn-horizon-glow
        className="ease pointer-events-none absolute right-0 bottom-1/2 left-0 z-0 -mb-[5%] h-full blur-[10px] transition-all duration-600"
      />
      <div
        ref={sunRef}
        data-dn-body
        data-kind="sun"
        className="pointer-events-none absolute bottom-1/2 left-1/2 z-[1] -mb-8 -ml-8 h-16 w-16 rounded-full blur-[0.5px] max-lg:hidden"
      />
      <div
        ref={moonRef}
        data-dn-body
        data-kind="moon"
        className="pointer-events-none absolute bottom-1/2 left-1/2 z-[1] -mb-8 -ml-8 h-16 w-16 rounded-full blur-[0.5px] max-lg:hidden"
      />
    </div>
  );
}
