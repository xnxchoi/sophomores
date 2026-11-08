"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { RefObject, useRef } from "react";

import { usePlayState } from "@/hideaway/providers/HideawayFM/hooks";

import { REEL_BASE_DURATION } from "../constants";

/**
 * Drives the dual-reel GSAP rotation animation.
 * TimeScale is linked to playing state. Rate is fixed at 1x (internet-radio model).
 */
export function useTapeAnimation(
  supplyRef: RefObject<SVGGElement | null>,
  takeupRef: RefObject<SVGGElement | null>,
  scopeRef: RefObject<HTMLElement | SVGElement | null>
) {
  const playState = usePlayState();
  const playing = playState.optimistic === "playing";

  const supplyTL = useRef<GSAPTimeline>(null!);
  const takeupTL = useRef<GSAPTimeline>(null!);

  useGSAP(
    () => {
      if (!supplyRef.current || !takeupRef.current) return;

      supplyTL.current = gsap
        .timeline({ defaults: { ease: "none", repeat: -1, yoyo: false } })
        .to(supplyRef.current, {
          rotate: 360,
          duration: REEL_BASE_DURATION,
          transformOrigin: "center center"
        });

      takeupTL.current = gsap
        .timeline({ defaults: { ease: "none", repeat: -1, yoyo: false } })
        .to(takeupRef.current, {
          rotate: 360,
          duration: REEL_BASE_DURATION,
          transformOrigin: "center center"
        });
    },
    { scope: scopeRef }
  );

  useGSAP(
    () => {
      if (!supplyTL.current || !takeupTL.current) return;

      const active = playing ? 1 : 0;

      gsap.to(supplyTL.current, {
        timeScale: active,
        duration: 0.3,
        ease: playing ? "power2.in" : "power2.out",
        overwrite: true
      });

      gsap.to(takeupTL.current, {
        timeScale: active,
        duration: 0.3,
        ease: playing ? "power2.in" : "power2.out",
        overwrite: true
      });
    },
    { dependencies: [playing], scope: scopeRef }
  );

  return { supplyTL, takeupTL };
}
