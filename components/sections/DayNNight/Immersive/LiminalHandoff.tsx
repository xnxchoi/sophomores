"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useDayNNightScene } from "../store";

/**
 * Liminal → Nighttime transition captions.
 *
 * Scroll-driven, three phases before the handoff fires:
 *
 *   progress < 0.40                  → off, nothing rendered
 *   0.40 ≤ progress < 0.50           → "The sun is setting."
 *   0.50 ≤ progress < 0.55           → "Time for a change of pace."
 *   progress ≥ 0.55, not yet fired   → fires liminalHandoffFired, exits
 *
 * LiminalRadioController watches liminalHandoffFired and starts
 * HideawayFM after its own delay window.
 */

const CAPTION_A_IN = 0.4;
const CAPTION_B_IN = 0.5;
const FIRE_IN = 0.55;

type Phase = "off" | "caption-a" | "caption-b" | "fire" | "post-fire";

function resolvePhase(progress: number, fired: boolean): Phase {
  if (fired) return "post-fire";
  if (progress < CAPTION_A_IN) return "off";
  if (progress < CAPTION_B_IN) return "caption-a";
  if (progress < FIRE_IN) return "caption-b";
  return "fire";
}

export function LiminalHandoff({ suppress = false }: { suppress?: boolean }) {
  const t = useTranslations("Event.DayNNight.liminal");
  const phase = useDayNNightScene((r) =>
    resolvePhase(r.progress, r.liminalHandoffFired)
  );
  const fire = useDayNNightScene((r) => r.fireLiminalHandoff);

  const firedRef = useRef(false);
  useEffect(() => {
    if (phase !== "fire" || firedRef.current) return;
    firedRef.current = true;
    fire();
  }, [phase, fire]);

  if (suppress || phase === "off" || phase === "post-fire") return null;

  const caption =
    phase === "caption-a" ? t("sunsetSubtitle") : t("changeOfPace");

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[44] flex items-center justify-center"
    >
      <p
        key={caption}
        className="max-w-lg px-8 text-center font-serif text-[clamp(1.4rem,2.2vw,2rem)] leading-[1.35] text-white/85"
      >
        {caption}
      </p>
    </div>
  );
}
