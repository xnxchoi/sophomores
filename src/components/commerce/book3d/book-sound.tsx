"use client";

import { Howl } from "howler";
import { useEffect, useMemo } from "react";

/** Sample slots (map §C2 #30). None exist yet, so only the synthesised sounds play; drop files in to add the rest. */
export type BookSamples = { pageTurn?: string[]; grab?: string; flop?: string; crackle?: string };

type Rub = { gain: GainNode };

/**
 * The book's sounds. Rubs are band-passed noise whose level follows pointer speed, as on stripe.press: "cover" at
 * 55–295 Hz (the pointer across the closed book) and "paper" at 110–560 Hz (dragging a page). The cover slap is a
 * short low burst. Samples (page turn, grab, flop, crackle) play through Howler when their slots are filled.
 * Browsers allow audio only after a press, so nothing sounds before the first one (stripe.press unlocks the same way).
 *
 * Checked before writing: Howler (installed) plays files but doesn't synthesise noise; DayNNightScore's primed context
 * belongs to its own score.
 */
export function useBookSound(samples: BookSamples = {}) {
  const sound = useMemo(() => {
    // Created on the first press (browsers allow audio only then).
    const audio: { context: AudioContext | null; noise: AudioBuffer | null } = { context: null, noise: null };
    const rubs = new Map<"cover" | "paper", Rub>();
    const howls: Partial<Record<keyof BookSamples, Howl[]>> = {};
    (Object.entries(samples) as [keyof BookSamples, string | string[] | undefined][]).forEach(([key, value]) => {
      const urls = Array.isArray(value) ? value : value ? [value] : [];
      if (urls.length) howls[key] = urls.map((src) => new Howl({ src: [src], preload: true }));
    });

    function unlock() {
      if (audio.context) { void audio.context.resume().catch(() => {}); return; }
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      const context = new Context(), noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      audio.context = context; audio.noise = noise;
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }

    function rubChannel(kind: "cover" | "paper") {
      const { context, noise } = audio;
      if (!context || !noise) return null;
      let rub = rubs.get(kind);
      if (!rub) {
        const source = context.createBufferSource(), low = context.createBiquadFilter(), high = context.createBiquadFilter(), gain = context.createGain();
        source.buffer = noise; source.loop = true;
        high.type = "highpass"; high.frequency.value = kind === "cover" ? 55 : 110;
        low.type = "lowpass"; low.frequency.value = kind === "cover" ? 295 : 560;
        gain.gain.value = 0;
        source.connect(high).connect(low).connect(gain).connect(context.destination); source.start();
        rub = { gain }; rubs.set(kind, rub);
      }
      return rub;
    }

    return {
      unlock,
      /** speed: pointer speed in px/ms. The level eases in and falls away within ~0.12 s once the pointer stops. */
      rub(kind: "cover" | "paper", speed: number) {
        const rub = rubChannel(kind), context = audio.context; if (!rub || !context) return;
        const level = Math.min(speed / 3, 1) * (kind === "cover" ? 0.22 : 0.16), now = context.currentTime;
        rub.gain.gain.cancelScheduledValues(now);
        rub.gain.gain.setTargetAtTime(level, now, 0.02);
        rub.gain.gain.setTargetAtTime(0, now + 0.06, 0.06);
      },
      /** strength 0–1, from how fast the cover closed. */
      slap(strength: number) {
        const { context, noise } = audio;
        if (!context || !noise) return;
        const source = context.createBufferSource(), low = context.createBiquadFilter(), gain = context.createGain(), now = context.currentTime;
        source.buffer = noise; low.type = "lowpass"; low.frequency.value = 420;
        gain.gain.setValueAtTime(Math.max(Math.min(strength, 1) * 0.5, 0.0002), now); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
        source.connect(low).connect(gain).connect(context.destination); source.start(now, Math.random()); source.stop(now + 0.1);
      },
      /** A sample slot; silent when empty. pageTurn picks one of its files and plays faster for faster turns. */
      play(key: keyof BookSamples, speed = 0, forward = true) {
        const list = howls[key]; if (!list?.length) return;
        const howl = list[Math.floor(Math.random() * list.length)];
        if (key === "pageTurn") howl.rate(forward ? 1.1 + 0.7 * speed : 0.91 + 0.26 * speed);
        howl.play();
      },
      dispose() {
        void audio.context?.close().catch(() => {}); rubs.clear();
        Object.values(howls).flat().forEach((howl) => howl?.unload());
      }
    };
    // The slots are fixed for the page's life; a new set means a new product page and a new hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => sound.dispose(), [sound]);
  return sound;
}

export type BookSound = ReturnType<typeof useBookSound>;
