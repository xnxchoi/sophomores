"use client";

import { Howl } from "howler";
import { useEffect, useMemo, useRef } from "react";

const SOUNDS = {
  /** Soft leather rustle — plays as the sleeve descends. */
  sleeve: "/audio/invoice/sleeve-rustle.mp3",
  /** Paper handling sound — plays on focus zoom. */
  focus: "/audio/invoice/paper-focus.mp3",
  /** Paper settle — plays when leaving focus mode. */
  unfocus: "/audio/invoice/paper-settle.mp3"
} as const;

type SoundKey = keyof typeof SOUNDS;

type SoundsHandle = {
  play: (key: SoundKey) => void;
};

/**
 * Loads paper / leather sound effects via Howler. Files are optional — if
 * the .mp3 is missing the corresponding play() is a no-op so the visual
 * still works. Drop real assets at /public/audio/invoice/ to enable.
 *
 * Returns a stable handle (memoized) so it can sit in useEffect deps without
 * triggering re-renders.
 */
export function usePaperSounds(): SoundsHandle {
  const howlsRef = useRef<Partial<Record<SoundKey, Howl>>>({});

  useEffect(() => {
    const handles: Partial<Record<SoundKey, Howl>> = {};
    (Object.keys(SOUNDS) as SoundKey[]).forEach((key) => {
      handles[key] = new Howl({
        src: [SOUNDS[key]],
        volume: 0.35,
        preload: true,
        // Silently swallow load errors so missing files don't pollute the
        // console — the play() will just no-op below.
        onloaderror: () => {
          handles[key] = undefined;
        }
      });
    });
    howlsRef.current = handles;
    return () => {
      Object.values(handles).forEach((h) => h?.unload());
      howlsRef.current = {};
    };
  }, []);

  // Stable handle so consumers can put it in useEffect deps without storms.
  return useMemo<SoundsHandle>(
    () => ({
      play: (key) => {
        const h = howlsRef.current[key];
        if (h && h.state() === "loaded") {
          try {
            h.play();
          } catch {
            // Autoplay policy may block — fail silently.
          }
        }
      }
    }),
    []
  );
}
